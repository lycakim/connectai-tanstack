import {
    boolean,
    integer,
    jsonb,
    pgTable,
    serial,
    text,
    timestamp,
    uuid,
} from 'drizzle-orm/pg-core';

/**
 * Better Auth core tables. Field (property) names must match Better Auth's model
 * so the Drizzle adapter can map them; SQL column names are snake_case.
 */
export const user = pgTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Application tables — ports of the Laravel `agents` and `scheduled_calls`
 * tables. Agents are owned by a user, mirroring the portal's User hasMany Agent
 * relationship so data can be scoped to the authenticated user.
 */
export const agents = pgTable('agents', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    domain: text('domain'),
    connectwareExtension: text('connectware_extension'),
    connectwareFailoverExtension: text('connectware_failover_extension'),
    reseller: text('reseller'),
    production: boolean('production').notNull().default(false),
    systemPrompt: text('system_prompt'),
    welcomeMessage: text('welcome_message'),
    timezone: text('timezone'),
    voiceProvider: text('voice_provider').notNull().default('openai'),
    voiceModel: text('voice_model'),
    voice: text('voice'),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const scheduledCalls = pgTable('scheduled_calls', {
    id: serial('id').primaryKey(),
    agentId: integer('agent_id')
        .notNull()
        .references(() => agents.id, { onDelete: 'cascade' }),
    destination: text('destination').notNull(),
    metadata: jsonb('metadata').$type<Record<string, string> | null>(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('pending'),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export interface HttpToolArrayItemDefinition {
    type: string;
    properties?: HttpToolParameter[];
}

export interface HttpToolParameter {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    parameter_type?: 'body' | 'query' | 'path';
    enum?: string[];
    items?: HttpToolArrayItemDefinition;
    properties?: HttpToolParameter[];
}

export interface HttpToolHeader {
    key: string;
    value: string;
}

export const httpTools = pgTable('http_tools', {
    id: serial('id').primaryKey(),
    agentId: integer('agent_id')
        .notNull()
        .references(() => agents.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    httpMethod: text('http_method').notNull().default('GET'),
    url: text('url').notNull(),
    parameters: jsonb('parameters').$type<HttpToolParameter[] | null>(),
    staticParameters: jsonb('static_parameters').$type<Record<
        string,
        unknown
    > | null>(),
    headers: jsonb('headers').$type<HttpToolHeader[] | null>(),
    authType: text('auth_type'),
    authConfig: jsonb('auth_config').$type<Record<string, string> | null>(),
    systemTool: boolean('system_tool').notNull().default(false),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export interface McpServerHeader {
    key: string;
    value: string;
}

export const mcpServers = pgTable('mcp_servers', {
    id: serial('id').primaryKey(),
    agentId: integer('agent_id')
        .notNull()
        .references(() => agents.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    url: text('url').notNull(),
    headers: jsonb('headers').$type<McpServerHeader[] | null>(),
    tools: jsonb('tools').$type<string[] | null>(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const callLogs = pgTable('call_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    callId: text('call_id').notNull(),
    agentId: integer('agent_id')
        .notNull()
        .references(() => agents.id, { onDelete: 'cascade' }),
    voiceProvider: text('voice_provider'),
    callerNumber: text('caller_number'),
    calledNumber: text('called_number'),
    domainName: text('domain_name'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    duration: integer('duration'),
    status: text('status').notNull().default('completed'),
    transcript: jsonb('transcript').$type<TranscriptMessage[] | null>(),
    aiSummary: text('ai_summary'),
    aiTopics: jsonb('ai_topics').$type<string[] | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
    id: serial('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    prefix: text('prefix').notNull(),
    tokenHash: text('token_hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export type AgentRow = typeof agents.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type ScheduledCallRow = typeof scheduledCalls.$inferSelect;
export type HttpToolRow = typeof httpTools.$inferSelect;
export type McpServerRow = typeof mcpServers.$inferSelect;
export type CallLogRow = typeof callLogs.$inferSelect;
