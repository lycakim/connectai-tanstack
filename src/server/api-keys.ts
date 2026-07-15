import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { auth } from '@/lib/auth';

/**
 * Personal access tokens — ports the portal's ApiKeyController (Sanctum tokens).
 * The plaintext token is returned only once, on creation; only a SHA-256 hash
 * and a short prefix are stored.
 */

async function requireUser() {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    if (!session) {
        throw new Error('Unauthorized');
    }
    return session.user;
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function generateToken(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return `cai_${toHex(bytes)}`;
}

async function hashToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(token),
    );
    return toHex(digest);
}

export interface ApiKeySummary {
    id: number;
    name: string;
    prefix: string;
    created_at: string;
    last_used_at: string | null;
}

/** GET — the current user's API keys (never returns the token or hash). */
export const getApiKeys = createServerFn({ method: 'GET' }).handler(
    async (): Promise<ApiKeySummary[]> => {
        const user = await requireUser();
        const rows = await db
            .select()
            .from(apiKeys)
            .where(eq(apiKeys.userId, user.id))
            .orderBy(desc(apiKeys.createdAt));

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            prefix: row.prefix,
            created_at: row.createdAt.toISOString(),
            last_used_at: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
        }));
    },
);

export interface CreatedApiKey {
    id: number;
    name: string;
    token: string;
}

/** POST — create a key and return the plaintext token once. */
export const createApiKey = createServerFn({ method: 'POST' })
    .validator((data: { name: string }) => {
        const name = data.name?.trim();
        if (!name) {
            throw new Error('Name is required.');
        }
        return { name };
    })
    .handler(async ({ data }): Promise<CreatedApiKey> => {
        const user = await requireUser();
        const token = generateToken();
        const tokenHash = await hashToken(token);

        const [row] = await db
            .insert(apiKeys)
            .values({
                userId: user.id,
                name: data.name,
                prefix: token.slice(0, 12),
                tokenHash,
            })
            .returning();

        return { id: row!.id, name: row!.name, token };
    });

/** DELETE — revoke a key owned by the current user. */
export const deleteApiKey = createServerFn({ method: 'POST' })
    .validator((data: { id: number }) => data)
    .handler(async ({ data }): Promise<{ message: string }> => {
        const user = await requireUser();
        await db
            .delete(apiKeys)
            .where(and(eq(apiKeys.id, data.id), eq(apiKeys.userId, user.id)));
        return { message: 'API key revoked.' };
    });
