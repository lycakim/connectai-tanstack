import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { agents } from '@/db/schema';
import { auth } from '@/lib/auth';
import { toAgentResource } from '@/server/mappers';
import type { Agent } from '@/types/scheduled-call';

/**
 * Server functions for the `agents` resource — ports of AgentController's
 * index/show/update. Every function requires an authenticated session and
 * scopes data to the user's own agents.
 */

async function requireUser() {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });

    if (!session) {
        throw new Error('Unauthorized');
    }

    return session.user;
}

async function findOwnedAgent(agentId: number, userId: string) {
    const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
        .limit(1);

    return agent;
}

/** GET — list agents owned by the current user. */
export const getAgents = createServerFn({ method: 'GET' }).handler(
    async (): Promise<Agent[]> => {
        const user = await requireUser();

        const rows = await db
            .select()
            .from(agents)
            .where(eq(agents.userId, user.id))
            .orderBy(agents.id);

        return rows.map(toAgentResource);
    },
);

export interface CreateAgentInput {
    name: string;
    system_prompt?: string | null;
    welcome_message?: string | null;
    timezone?: string | null;
    voice_provider?: string;
    voice_model?: string | null;
    voice?: string | null;
}

/** POST /agents — create a new agent owned by the current user. */
export const createAgent = createServerFn({ method: 'POST' })
    .validator((data: CreateAgentInput) => {
        const name = data.name?.trim();
        if (!name) {
            throw new Error('Name is required.');
        }

        return {
            name,
            system_prompt: data.system_prompt?.trim() || null,
            welcome_message: data.welcome_message?.trim() || null,
            timezone: data.timezone || null,
            voice_provider: data.voice_provider || 'openai',
            voice_model: data.voice_model || null,
            voice: data.voice || null,
        };
    })
    .handler(async ({ data }): Promise<Agent> => {
        const user = await requireUser();

        const [row] = await db
            .insert(agents)
            .values({
                name: data.name,
                systemPrompt: data.system_prompt,
                welcomeMessage: data.welcome_message,
                timezone: data.timezone,
                voiceProvider: data.voice_provider,
                voiceModel: data.voice_model,
                voice: data.voice,
                userId: user.id,
            })
            .returning();

        return toAgentResource(row!);
    });

/** GET /agents/{agent} */
export const getAgent = createServerFn({ method: 'GET' })
    .validator((data: { agentId: number }) => data)
    .handler(async ({ data }): Promise<Agent> => {
        const user = await requireUser();
        const agent = await findOwnedAgent(data.agentId, user.id);

        if (!agent) {
            throw new Error(`Agent ${data.agentId} not found.`);
        }

        return toAgentResource(agent);
    });

/**
 * Partial update input — each tab of the agent page submits only its own
 * fields, so only the keys present are written (others are left untouched).
 */
export interface UpdateAgentInput {
    agentId: number;
    name?: string;
    domain?: string | null;
    connectware_extension?: string | null;
    connectware_failover_extension?: string | null;
    production?: boolean;
    system_prompt?: string | null;
    welcome_message?: string | null;
    timezone?: string | null;
    voice_provider?: string;
    voice_model?: string | null;
    voice?: string | null;
}

/** PUT /agents/{agent} — partially update core agent fields. */
export const updateAgent = createServerFn({ method: 'POST' })
    .validator((data: UpdateAgentInput) => {
        if ('name' in data && !data.name?.trim()) {
            throw new Error('Name is required.');
        }
        return data;
    })
    .handler(async ({ data }): Promise<Agent> => {
        const user = await requireUser();
        const agent = await findOwnedAgent(data.agentId, user.id);

        if (!agent) {
            throw new Error(`Agent ${data.agentId} not found.`);
        }

        const set: Record<string, unknown> = { updatedAt: new Date() };
        if ('name' in data) {
            set.name = data.name!.trim();
        }
        if ('domain' in data) {
            set.domain = data.domain?.trim() || null;
        }
        if ('connectware_extension' in data) {
            set.connectwareExtension =
                data.connectware_extension?.trim() || null;
        }
        if ('connectware_failover_extension' in data) {
            set.connectwareFailoverExtension =
                data.connectware_failover_extension?.trim() || null;
        }
        if ('production' in data) {
            set.production = Boolean(data.production);
        }
        if ('system_prompt' in data) {
            set.systemPrompt = data.system_prompt?.trim() || null;
        }
        if ('welcome_message' in data) {
            set.welcomeMessage = data.welcome_message?.trim() || null;
        }
        if ('timezone' in data) {
            set.timezone = data.timezone || null;
        }
        if ('voice_provider' in data) {
            set.voiceProvider = data.voice_provider || 'openai';
        }
        if ('voice_model' in data) {
            set.voiceModel = data.voice_model || null;
        }
        if ('voice' in data) {
            set.voice = data.voice || null;
        }

        const [row] = await db
            .update(agents)
            .set(set)
            .where(eq(agents.id, agent.id))
            .returning();

        return toAgentResource(row!);
    });

/**
 * Syncs the reseller for an agent from the ConnectWare API. Mirrors the portal
 * flow: the client passes the current (possibly unsaved) domain, the server
 * looks it up and persists the result. ConnectWare isn't reachable from the
 * POC, so the lookup is simulated from the domain; an empty domain yields no
 * reseller (the client surfaces that as an error, like the portal).
 */
export const syncReseller = createServerFn({ method: 'POST' })
    .validator((data: { agentId: number; domain?: string | null }) => data)
    .handler(async ({ data }): Promise<{ reseller: string | null }> => {
        const user = await requireUser();
        const agent = await findOwnedAgent(data.agentId, user.id);

        if (!agent) {
            throw new Error(`Agent ${data.agentId} not found.`);
        }

        const domain = (data.domain ?? agent.domain)?.trim() || null;
        const reseller = domain ? `Reseller for ${domain}` : null;

        await db
            .update(agents)
            .set({ reseller, updatedAt: new Date() })
            .where(eq(agents.id, agent.id));

        return { reseller };
    });

/** DELETE /agents/{agent} */
export const deleteAgent = createServerFn({ method: 'POST' })
    .validator((data: { agentId: number }) => data)
    .handler(async ({ data }): Promise<{ message: string }> => {
        const user = await requireUser();
        const agent = await findOwnedAgent(data.agentId, user.id);

        if (!agent) {
            throw new Error(`Agent ${data.agentId} not found.`);
        }

        await db.delete(agents).where(eq(agents.id, agent.id));

        return { message: 'Agent deleted.' };
    });
