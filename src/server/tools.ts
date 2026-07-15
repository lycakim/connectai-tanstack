import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
    agents,
    httpTools,
    mcpServers,
    type HttpToolHeader,
    type HttpToolParameter,
    type McpServerHeader,
} from '@/db/schema';
import { auth } from '@/lib/auth';
import { toHttpToolResource, toMcpServerResource } from '@/server/mappers';
import type { HttpTool, JsonValue, McpServer } from '@/types/scheduled-call';

/**
 * Server functions for the agent Tools tab — HTTP tools and MCP servers.
 * Ports of the portal's HttpTool / McpServer controllers. Every function is
 * scoped: the target agent (or the tool's agent) must belong to the user.
 */

async function requireUser() {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    if (!session) {
        throw new Error('Unauthorized');
    }
    return session.user;
}

async function assertOwnsAgent(agentId: number, userId: string): Promise<void> {
    const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
        .limit(1);

    if (!agent) {
        throw new Error(`Agent ${agentId} not found.`);
    }
}

export interface AgentTools {
    httpTools: HttpTool[];
    mcpServers: McpServer[];
}

/** GET — both tool collections for an agent. */
export const getAgentTools = createServerFn({ method: 'GET' })
    .validator((data: { agentId: number }) => data)
    .handler(async ({ data }): Promise<AgentTools> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const [http, mcp] = await Promise.all([
            db
                .select()
                .from(httpTools)
                .where(eq(httpTools.agentId, data.agentId))
                .orderBy(asc(httpTools.id)),
            db
                .select()
                .from(mcpServers)
                .where(eq(mcpServers.agentId, data.agentId))
                .orderBy(asc(mcpServers.id)),
        ]);

        return {
            httpTools: http.map(toHttpToolResource),
            mcpServers: mcp.map(toMcpServerResource),
        };
    });

/* ----------------------------- HTTP tools ------------------------------ */

export interface HttpToolInput {
    agentId: number;
    id?: number;
    name: string;
    description: string | null;
    http_method: string;
    url: string;
    parameters: HttpToolParameter[];
    static_parameters: Record<string, JsonValue>;
    headers: HttpToolHeader[];
    auth_type: string | null;
    auth_config: Record<string, string> | null;
    system_tool: boolean;
    enabled: boolean;
}

function validateHttpTool(data: HttpToolInput) {
    const name = data.name?.trim();
    if (!name) {
        throw new Error('Name is required.');
    }
    const url = data.url?.trim();
    if (!url) {
        throw new Error('URL is required.');
    }
    const parameters = (data.parameters ?? [])
        .map((p) => ({
            ...p,
            name: (p.name ?? '').trim(),
            type: p.type || 'string',
            required: Boolean(p.required),
            description: p.description?.trim() || undefined,
            parameter_type: p.parameter_type,
        }))
        .filter((p) => p.name);

    // Keep only static values whose param still exists.
    const paramNames = new Set(parameters.map((p) => p.name));
    const staticParameters: Record<string, JsonValue> = {};
    for (const [key, value] of Object.entries(data.static_parameters ?? {})) {
        if (paramNames.has(key)) {
            staticParameters[key] = value;
        }
    }

    const headers = (data.headers ?? [])
        .map((h) => ({ key: (h.key ?? '').trim(), value: h.value ?? '' }))
        .filter((h) => h.key);

    const authType = data.auth_type || null;
    const authConfig =
        authType === 'aws_sigv4' ? (data.auth_config ?? null) : null;

    return {
        agentId: data.agentId,
        id: data.id,
        name,
        description: data.description?.trim() || null,
        http_method: data.http_method || 'GET',
        url,
        parameters,
        static_parameters: staticParameters,
        headers,
        auth_type: authType,
        auth_config: authConfig,
        system_tool: Boolean(data.system_tool),
        enabled: data.enabled ?? true,
    };
}

export const saveHttpTool = createServerFn({ method: 'POST' })
    .validator(validateHttpTool)
    .handler(async ({ data }): Promise<HttpTool> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const values = {
            agentId: data.agentId,
            name: data.name,
            description: data.description,
            httpMethod: data.http_method,
            url: data.url,
            parameters: data.parameters,
            staticParameters: data.static_parameters,
            headers: data.headers,
            authType: data.auth_type,
            authConfig: data.auth_config,
            systemTool: data.system_tool,
            enabled: data.enabled,
            updatedAt: new Date(),
        };

        if (data.id) {
            const [row] = await db
                .update(httpTools)
                .set(values)
                .where(
                    and(
                        eq(httpTools.id, data.id),
                        eq(httpTools.agentId, data.agentId),
                    ),
                )
                .returning();
            if (!row) {
                throw new Error('HTTP tool not found.');
            }
            return toHttpToolResource(row);
        }

        const [row] = await db.insert(httpTools).values(values).returning();
        return toHttpToolResource(row!);
    });

export const setHttpToolEnabled = createServerFn({ method: 'POST' })
    .validator((data: { agentId: number; id: number; enabled: boolean }) => data)
    .handler(async ({ data }): Promise<HttpTool> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const [row] = await db
            .update(httpTools)
            .set({ enabled: data.enabled, updatedAt: new Date() })
            .where(
                and(
                    eq(httpTools.id, data.id),
                    eq(httpTools.agentId, data.agentId),
                ),
            )
            .returning();
        if (!row) {
            throw new Error('HTTP tool not found.');
        }
        return toHttpToolResource(row);
    });

export const deleteHttpTool = createServerFn({ method: 'POST' })
    .validator((data: { agentId: number; id: number }) => data)
    .handler(async ({ data }): Promise<{ message: string }> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        await db
            .delete(httpTools)
            .where(
                and(
                    eq(httpTools.id, data.id),
                    eq(httpTools.agentId, data.agentId),
                ),
            );
        return { message: 'HTTP tool deleted.' };
    });

export interface TestHttpToolResponse {
    success: boolean;
    response: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
    };
    error?: string;
}

/**
 * Executes an HTTP tool against its real endpoint, building the request from
 * the tool's parameters by location (path / query / body), and returns the
 * full response (status, headers, body). Mirrors the portal's test endpoint.
 */
export const testHttpTool = createServerFn({ method: 'POST' })
    .validator(
        (data: {
            agentId: number;
            id: number;
            values: Record<string, JsonValue>;
        }) => data,
    )
    .handler(async ({ data }): Promise<TestHttpToolResponse> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const [tool] = await db
            .select()
            .from(httpTools)
            .where(
                and(
                    eq(httpTools.id, data.id),
                    eq(httpTools.agentId, data.agentId),
                ),
            )
            .limit(1);

        if (!tool) {
            throw new Error('HTTP tool not found.');
        }

        const method = (tool.httpMethod || 'GET').toUpperCase();
        const params = tool.parameters ?? [];
        // Static parameters supply fixed values; test-form values override them.
        const values = { ...(tool.staticParameters ?? {}), ...(data.values ?? {}) };

        let url = tool.url;
        const query = new URLSearchParams();
        const body: Record<string, unknown> = {};

        for (const p of params) {
            const value = values[p.name];
            if (value === undefined || value === '') {
                continue;
            }
            const location =
                p.parameter_type ??
                (method === 'GET' || method === 'DELETE' ? 'query' : 'body');

            if (location === 'path') {
                url = url.replace(
                    `{${p.name}}`,
                    encodeURIComponent(String(value)),
                );
            } else if (location === 'query') {
                query.set(p.name, String(value));
            } else {
                body[p.name] = value;
            }
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
            const u = new URL(url);
            query.forEach((v, k) => u.searchParams.set(k, v));

            const requestHeaders: Record<string, string> = {};
            for (const h of tool.headers ?? []) {
                if (h.key) {
                    requestHeaders[h.key] = h.value;
                }
            }
            const init: RequestInit = {
                method,
                signal: controller.signal,
                headers: requestHeaders,
            };
            if (Object.keys(body).length > 0) {
                requestHeaders['Content-Type'] = 'application/json';
                init.body = JSON.stringify(body);
            }

            const res = await fetch(u.toString(), init);
            const text = await res.text();
            const headers: Record<string, string> = {};
            res.headers.forEach((v, k) => {
                headers[k] = v;
            });

            return {
                success: res.ok,
                response: {
                    status: res.status,
                    statusText: res.statusText,
                    headers,
                    body: text.slice(0, 8000),
                },
            };
        } catch (err) {
            return {
                success: false,
                response: {
                    status: 0,
                    statusText: '',
                    headers: {},
                    body: '',
                },
                error: err instanceof Error ? err.message : 'Request failed.',
            };
        } finally {
            clearTimeout(timer);
        }
    });

/* ---------------------------- MCP servers ------------------------------ */

export interface McpServerInput {
    agentId: number;
    id?: number;
    name: string;
    url: string;
    headers: McpServerHeader[];
    tools: string[];
    enabled: boolean;
}

function validateMcpServer(data: McpServerInput) {
    const name = data.name?.trim();
    if (!name) {
        throw new Error('Name is required.');
    }
    const url = data.url?.trim();
    if (!url) {
        throw new Error('URL is required.');
    }
    const headers = (data.headers ?? [])
        .map((h) => ({ key: (h.key ?? '').trim(), value: h.value ?? '' }))
        .filter((h) => h.key);
    const tools = (data.tools ?? [])
        .map((t) => (t ?? '').trim())
        .filter(Boolean);

    return {
        agentId: data.agentId,
        id: data.id,
        name,
        url,
        headers,
        tools,
        enabled: data.enabled ?? true,
    };
}

export const saveMcpServer = createServerFn({ method: 'POST' })
    .validator(validateMcpServer)
    .handler(async ({ data }): Promise<McpServer> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const values = {
            agentId: data.agentId,
            name: data.name,
            url: data.url,
            headers: data.headers,
            tools: data.tools,
            enabled: data.enabled,
            updatedAt: new Date(),
        };

        if (data.id) {
            const [row] = await db
                .update(mcpServers)
                .set(values)
                .where(
                    and(
                        eq(mcpServers.id, data.id),
                        eq(mcpServers.agentId, data.agentId),
                    ),
                )
                .returning();
            if (!row) {
                throw new Error('MCP server not found.');
            }
            return toMcpServerResource(row);
        }

        const [row] = await db.insert(mcpServers).values(values).returning();
        return toMcpServerResource(row!);
    });

export const setMcpServerEnabled = createServerFn({ method: 'POST' })
    .validator((data: { agentId: number; id: number; enabled: boolean }) => data)
    .handler(async ({ data }): Promise<McpServer> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const [row] = await db
            .update(mcpServers)
            .set({ enabled: data.enabled, updatedAt: new Date() })
            .where(
                and(
                    eq(mcpServers.id, data.id),
                    eq(mcpServers.agentId, data.agentId),
                ),
            )
            .returning();
        if (!row) {
            throw new Error('MCP server not found.');
        }
        return toMcpServerResource(row);
    });

export const deleteMcpServer = createServerFn({ method: 'POST' })
    .validator((data: { agentId: number; id: number }) => data)
    .handler(async ({ data }): Promise<{ message: string }> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        await db
            .delete(mcpServers)
            .where(
                and(
                    eq(mcpServers.id, data.id),
                    eq(mcpServers.agentId, data.agentId),
                ),
            );
        return { message: 'MCP server deleted.' };
    });

export interface McpTestResult {
    ok: boolean;
    status: number;
    error?: string;
}

/** Attempts to reach an MCP server URL and reports whether it responded. */
export const testMcpConnection = createServerFn({ method: 'POST' })
    .validator(
        (data: {
            agentId: number;
            url: string;
            headers: McpServerHeader[];
        }) => data,
    )
    .handler(async ({ data }): Promise<McpTestResult> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
            const headers: Record<string, string> = {};
            for (const h of data.headers ?? []) {
                if (h.key) {
                    headers[h.key] = h.value;
                }
            }
            const res = await fetch(data.url, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });
            return { ok: res.ok, status: res.status };
        } catch (err) {
            return {
                ok: false,
                status: 0,
                error:
                    err instanceof Error ? err.message : 'Connection failed.',
            };
        } finally {
            clearTimeout(timer);
        }
    });
