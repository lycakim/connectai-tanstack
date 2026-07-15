import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { agents, scheduledCalls } from '@/db/schema';
import { auth } from '@/lib/auth';
import { toAgentResource, toScheduledCallResource } from '@/server/mappers';
import type { Agent, ScheduledCall } from '@/types/scheduled-call';

/**
 * Resolves the authenticated user from request headers or throws. Only called
 * inside server-function handlers, so its server-only imports are stripped from
 * the client bundle.
 */
async function requireUser() {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });

    if (!session) {
        throw new Error('Unauthorized');
    }

    return session.user;
}

/**
 * Server functions replacing App\Http\Controllers\Api\ScheduledCallController.
 * Data now comes from Postgres via Drizzle, and every function is scoped to the
 * authenticated user (mirrors the portal's User hasMany Agent ownership model).
 */

async function findOwnedAgent(agentId: number, userId: string) {
    const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
        .limit(1);

    return agent;
}

export interface AgentScheduledCalls {
    agent: Agent;
    scheduledCalls: ScheduledCall[];
}

/** GET /agents/{agent}/schedule-call */
export const getScheduledCalls = createServerFn({ method: 'GET' })
    .validator((data: { agentId: number }) => data)
    .handler(async ({ data }): Promise<AgentScheduledCalls> => {
        const user = await requireUser();
        const agent = await findOwnedAgent(data.agentId, user.id);

        if (!agent) {
            throw new Error(`Agent ${data.agentId} not found.`);
        }

        const rows = await db
            .select()
            .from(scheduledCalls)
            .where(eq(scheduledCalls.agentId, agent.id))
            .orderBy(desc(scheduledCalls.scheduledAt));

        return {
            agent: toAgentResource(agent),
            scheduledCalls: rows.map(toScheduledCallResource),
        };
    });

export interface CreateScheduledCallInput {
    agentId: number;
    destination: string;
    scheduled_at: string;
    metadata?: Record<string, string> | null;
}

/**
 * POST /agents/{agent}/schedule-call
 * Ports ScheduleCallRequest validation: destination required, scheduled_at must
 * be a valid future date, metadata is an optional string map.
 */
export const createScheduledCall = createServerFn({ method: 'POST' })
    .validator((data: CreateScheduledCallInput) => {
        const destination = data.destination?.trim();
        if (!destination) {
            throw new Error('Destination is required.');
        }

        const scheduledAt = new Date(data.scheduled_at);
        if (Number.isNaN(scheduledAt.getTime())) {
            throw new Error('Scheduled at must be a valid date.');
        }
        if (scheduledAt.getTime() <= Date.now()) {
            throw new Error('Scheduled at must be in the future.');
        }

        return {
            agentId: data.agentId,
            destination,
            scheduledAt,
            metadata: data.metadata ?? null,
        };
    })
    .handler(async ({ data }): Promise<ScheduledCall> => {
        const user = await requireUser();
        const agent = await findOwnedAgent(data.agentId, user.id);

        if (!agent) {
            throw new Error(`Agent ${data.agentId} not found.`);
        }

        const [row] = await db
            .insert(scheduledCalls)
            .values({
                agentId: agent.id,
                destination: data.destination,
                metadata: data.metadata,
                scheduledAt: data.scheduledAt,
                status: 'pending',
            })
            .returning();

        return toScheduledCallResource(row!);
    });

/**
 * DELETE /scheduled-calls/{scheduledCall}
 * Ports ScheduledCallController@destroy: only pending or failed calls may be
 * cancelled; cancelling sets status to 'cancelled' rather than hard-deleting.
 */
export const cancelScheduledCall = createServerFn({ method: 'POST' })
    .validator((data: { id: number }) => data)
    .handler(async ({ data }): Promise<{ message: string }> => {
        const user = await requireUser();

        const [call] = await db
            .select({
                id: scheduledCalls.id,
                status: scheduledCalls.status,
                agentUserId: agents.userId,
            })
            .from(scheduledCalls)
            .innerJoin(agents, eq(scheduledCalls.agentId, agents.id))
            .where(eq(scheduledCalls.id, data.id))
            .limit(1);

        if (!call || call.agentUserId !== user.id) {
            throw new Error('Scheduled call not found.');
        }

        if (call.status === 'dispatched' || call.status === 'cancelled') {
            throw new Error(
                'Only pending or failed scheduled calls can be cancelled.',
            );
        }

        await db
            .update(scheduledCalls)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(scheduledCalls.id, data.id));

        return { message: 'Scheduled call cancelled.' };
    });
