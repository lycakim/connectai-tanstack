import type {
    AgentRow,
    CallLogRow,
    HttpToolRow,
    McpServerRow,
    ScheduledCallRow,
} from '@/db/schema';
import type {
    Agent,
    CallLog,
    CallLogStatus,
    HttpTool,
    JsonValue,
    McpServer,
    ScheduledCall,
} from '@/types/scheduled-call';

/** Maps an agents row to the API resource shape used by the UI. */
export function toAgentResource(row: AgentRow): Agent {
    return {
        id: row.id,
        name: row.name,
        domain: row.domain,
        connectware_extension: row.connectwareExtension,
        connectware_failover_extension: row.connectwareFailoverExtension,
        reseller: row.reseller,
        production: row.production,
        system_prompt: row.systemPrompt,
        welcome_message: row.welcomeMessage,
        timezone: row.timezone,
        voice_provider: row.voiceProvider,
        voice_model: row.voiceModel,
        voice: row.voice,
        created_at: row.createdAt.toISOString(),
    };
}

export function toHttpToolResource(row: HttpToolRow): HttpTool {
    return {
        id: row.id,
        agent_id: row.agentId,
        name: row.name,
        description: row.description,
        http_method: row.httpMethod,
        url: row.url,
        parameters: row.parameters ?? null,
        static_parameters:
            (row.staticParameters as Record<string, JsonValue> | null) ?? null,
        headers: row.headers ?? null,
        auth_type: row.authType,
        auth_config: row.authConfig ?? null,
        system_tool: row.systemTool,
        enabled: row.enabled,
    };
}

export function toCallLogResource(row: CallLogRow): CallLog {
    return {
        id: row.id,
        call_id: row.callId,
        agent_id: row.agentId,
        voice_provider: row.voiceProvider,
        caller_number: row.callerNumber,
        called_number: row.calledNumber,
        domain_name: row.domainName,
        start_at: row.startAt ? row.startAt.toISOString() : null,
        end_at: row.endAt ? row.endAt.toISOString() : null,
        duration: row.duration,
        status: row.status as CallLogStatus,
        transcript: row.transcript ?? null,
        ai_summary: row.aiSummary,
        ai_topics: row.aiTopics ?? null,
    };
}

export function toMcpServerResource(row: McpServerRow): McpServer {
    return {
        id: row.id,
        agent_id: row.agentId,
        name: row.name,
        url: row.url,
        headers: row.headers ?? null,
        tools: row.tools ?? null,
        enabled: row.enabled,
    };
}

/** Mirrors App\Http\Resources\ScheduledCallResource. */
export function toScheduledCallResource(row: ScheduledCallRow): ScheduledCall {
    return {
        id: row.id,
        agent_id: row.agentId,
        destination: row.destination,
        metadata: row.metadata ?? null,
        scheduled_at: row.scheduledAt.toISOString(),
        status: row.status as ScheduledCall['status'],
        dispatched_at: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
        failure_reason: row.failureReason ?? null,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
    };
}
