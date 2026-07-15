import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { agents, callLogs } from '@/db/schema';
import { auth } from '@/lib/auth';
import { toCallLogResource } from '@/server/mappers';
import type { PaginatedCallLogs } from '@/types/scheduled-call';

/**
 * Read-only, paginated access to an agent's call logs. Ports the portal's
 * agent Call Logs tab. Scoped: the agent must belong to the current user.
 */

const PER_PAGE = 10;

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

export interface GetCallLogsInput {
    agentId: number;
    page?: number;
    status?: string;
    search?: string;
}

export const getCallLogs = createServerFn({ method: 'GET' })
    .validator((data: GetCallLogsInput) => data)
    .handler(async ({ data }): Promise<PaginatedCallLogs> => {
        const user = await requireUser();
        await assertOwnsAgent(data.agentId, user.id);

        const conditions = [eq(callLogs.agentId, data.agentId)];
        if (data.status && data.status !== 'all') {
            conditions.push(eq(callLogs.status, data.status));
        }
        const search = data.search?.trim();
        if (search) {
            const like = `%${search}%`;
            conditions.push(
                or(
                    ilike(callLogs.callId, like),
                    ilike(callLogs.callerNumber, like),
                    ilike(callLogs.calledNumber, like),
                )!,
            );
        }
        const where = and(...conditions);

        const countRows = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(callLogs)
            .where(where);

        const total = countRows[0]?.count ?? 0;
        const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
        const page = Math.min(Math.max(1, data.page ?? 1), lastPage);

        const rows = await db
            .select()
            .from(callLogs)
            .where(where)
            .orderBy(desc(callLogs.startAt))
            .limit(PER_PAGE)
            .offset((page - 1) * PER_PAGE);

        return {
            data: rows.map(toCallLogResource),
            page,
            perPage: PER_PAGE,
            total,
            lastPage,
            from: total === 0 ? 0 : (page - 1) * PER_PAGE + 1,
            to: (page - 1) * PER_PAGE + rows.length,
        };
    });
