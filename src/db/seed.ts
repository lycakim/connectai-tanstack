import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
    agents,
    callLogs,
    httpTools,
    mcpServers,
    scheduledCalls,
    user as userTable,
    type TranscriptMessage,
} from '@/db/schema';
import { auth } from '@/lib/auth';

/**
 * Seeds a demo user (via Better Auth so the password is hashed correctly) plus
 * agents and scheduled calls owned by them. Re-runnable: app data is cleared
 * and the demo user is reused if it already exists.
 */

const DEMO_EMAIL = 'demo@connectai.test';
const DEMO_PASSWORD = 'password123';
const DEMO_NAME = 'Demo User';

// Primary account: owns the seeded agents and calls.
const OWNER_EMAIL = 'lubay@netlinkvoice.com';
const OWNER_PASSWORD = 'password123';
const OWNER_NAME = 'Lyca Ubay';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function at(offsetMs: number): Date {
    return new Date(Date.now() + offsetMs);
}

/**
 * Creates a user via Better Auth (so the password is hashed correctly) if one
 * with this email does not already exist, and returns their id.
 */
async function ensureUser(
    email: string,
    password: string,
    name: string,
): Promise<string> {
    const [existing] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);

    if (existing) {
        return existing.id;
    }

    await auth.api.signUpEmail({ body: { email, password, name } });

    const [created] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);

    if (!created) {
        throw new Error(`Failed to create user ${email}.`);
    }

    return created.id;
}

async function seed(): Promise<void> {
    const userId = await ensureUser(OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME);
    await ensureUser(DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME);

    await db.delete(scheduledCalls);
    await db.delete(agents).where(eq(agents.userId, userId));

    const insertedAgents = await db
        .insert(agents)
        .values([
            {
                name: 'Front Desk Assistant',
                domain: 'acme-clinic.example.com',
                connectwareExtension: '1001',
                connectwareFailoverExtension: '1009',
                reseller: 'Reseller for acme-clinic.example.com',
                production: true,
                systemPrompt:
                    'You are the front desk assistant for Acme Clinic. Greet callers warmly, answer questions about hours and services, and help them book or reschedule appointments. The caller is dialing from {{CallerNumber}}.',
                welcomeMessage:
                    'Thank you for calling Acme Clinic. How can I help you today?',
                timezone: 'America/Chicago',
                voiceProvider: 'openai',
                voiceModel: 'gpt-4o-realtime',
                voice: 'alloy',
                userId,
            },
            {
                name: 'Outbound Sales Agent',
                domain: 'acme-software.example.com',
                connectwareExtension: '1002',
                production: false,
                systemPrompt:
                    'You are an outbound sales agent for Acme Software. Be concise and friendly, qualify the lead, and book a demo when there is interest.',
                welcomeMessage:
                    'Hi, this is Acme Software calling about your recent inquiry.',
                timezone: 'America/New_York',
                voiceProvider: 'gemini',
                voiceModel: 'gemini-2.5-flash',
                voice: 'Puck',
                userId,
            },
        ])
        .returning();

    const frontDesk = insertedAgents[0]!;
    const sales = insertedAgents[1]!;

    await db.insert(scheduledCalls).values([
        {
            agentId: frontDesk.id,
            destination: '5125550142',
            metadata: { campaign: 'reminder', locale: 'en-US' },
            scheduledAt: at(2 * HOUR),
            status: 'pending',
        },
        {
            agentId: frontDesk.id,
            destination: '5125550178',
            metadata: null,
            scheduledAt: at(-3 * HOUR),
            status: 'dispatched',
            dispatchedAt: at(-3 * HOUR),
        },
        {
            agentId: frontDesk.id,
            destination: '5125550190',
            metadata: { campaign: 'follow-up' },
            scheduledAt: at(-DAY),
            status: 'failed',
            dispatchedAt: at(-DAY),
            failureReason:
                'Destination unreachable (no answer after 3 attempts).',
        },
        {
            agentId: sales.id,
            destination: '5125550200',
            metadata: { campaign: 'q3-outreach' },
            scheduledAt: at(6 * HOUR),
            status: 'pending',
        },
    ]);

    await db.insert(httpTools).values([
        {
            agentId: frontDesk.id,
            name: 'lookup_appointment',
            description: 'Look up an existing appointment by phone number.',
            httpMethod: 'GET',
            url: 'https://api.acme-clinic.example.com/appointments',
            parameters: [
                {
                    name: 'phone',
                    type: 'string',
                    required: true,
                    parameter_type: 'query',
                    description: 'Caller phone number',
                },
                {
                    name: 'date',
                    type: 'string',
                    required: false,
                    parameter_type: 'query',
                    description: 'Filter by date (YYYY-MM-DD)',
                },
            ],
            enabled: true,
        },
        {
            agentId: frontDesk.id,
            name: 'book_appointment',
            description: 'Create a new appointment for the caller.',
            httpMethod: 'POST',
            url: 'https://api.acme-clinic.example.com/appointments',
            parameters: [
                {
                    name: 'phone',
                    type: 'string',
                    required: true,
                    parameter_type: 'body',
                    description: 'Caller phone number',
                },
                {
                    name: 'service',
                    type: 'string',
                    required: true,
                    parameter_type: 'body',
                    description: 'Requested service',
                },
                {
                    name: 'starts_at',
                    type: 'string',
                    required: true,
                    parameter_type: 'body',
                    description: 'Appointment start time (ISO 8601)',
                },
            ],
            headers: [{ key: 'Authorization', value: 'Bearer •••••' }],
            authType: null,
            authConfig: null,
            enabled: true,
        },
    ]);

    await db.insert(mcpServers).values([
        {
            agentId: frontDesk.id,
            name: 'Clinic Knowledge MCP',
            url: 'https://mcp.acme-clinic.example.com/sse',
            headers: [{ key: 'Authorization', value: 'Bearer •••••' }],
            tools: ['search_docs', 'get_hours', 'list_services'],
            enabled: true,
        },
    ]);

    const sampleTranscript: TranscriptMessage[] = [
        {
            role: 'assistant',
            content:
                'Thank you for calling Acme Clinic. How can I help you today?',
        },
        {
            role: 'user',
            content: 'Hi, I need to reschedule my appointment.',
        },
        {
            role: 'assistant',
            content: 'Of course. Can I get the phone number on the appointment?',
        },
        { role: 'user', content: 'It is 512-555-0142.' },
        {
            role: 'assistant',
            content: 'Found it. What day works better for you?',
        },
        { role: 'user', content: 'Next Tuesday morning if possible.' },
        {
            role: 'assistant',
            content: "You're booked for Tuesday at 9 AM. Anything else?",
        },
        { role: 'user', content: 'No, that is all. Thank you!' },
    ];

    const callLogValues = Array.from({ length: 13 }).map((_, i) => {
        const status =
            i === 0 ? 'in_progress' : i % 5 === 2 ? 'failed' : 'completed';
        const duration = status === 'completed' ? 45 + i * 17 : null;
        const startAt = at(-(i + 1) * 3 * HOUR);
        const endAt = duration
            ? new Date(startAt.getTime() + duration * 1000)
            : null;
        const completed = status === 'completed';
        return {
            agentId: frontDesk.id,
            callId: `CID-${1000 + i}`,
            voiceProvider: i % 2 === 0 ? 'openai' : 'gemini',
            callerNumber: `512555${(1042 + i).toString()}`,
            calledNumber: '5125559000',
            domainName: 'acme-clinic.example.com',
            startAt,
            endAt,
            duration,
            status,
            transcript: completed ? sampleTranscript : null,
            aiSummary: completed
                ? 'Caller rescheduled an appointment for next Tuesday at 9 AM.'
                : null,
            aiTopics: completed ? ['appointment', 'reschedule'] : null,
        };
    });

    await db.insert(callLogs).values(callLogValues);

    console.log(`Seeded data owned by ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
    console.log(`Demo account also available: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seed()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
