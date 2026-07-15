/**
 * Mirrors App\Http\Resources\ScheduledCallResource from the Laravel portal.
 * Keep this shape identical so the mock server layer can be swapped for the
 * real API without touching the UI.
 */
export type ScheduledCallStatus =
    | 'pending'
    | 'dispatched'
    | 'cancelled'
    | 'failed';

export interface ScheduledCall {
    id: number;
    agent_id: number;
    destination: string;
    metadata: Record<string, string> | null;
    scheduled_at: string;
    status: ScheduledCallStatus;
    dispatched_at: string | null;
    failure_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface Agent {
    id: number;
    name: string;
    domain: string | null;
    connectware_extension: string | null;
    connectware_failover_extension: string | null;
    reseller: string | null;
    production: boolean;
    system_prompt: string | null;
    welcome_message: string | null;
    timezone: string | null;
    voice_provider: string;
    voice_model: string | null;
    voice: string | null;
    created_at: string;
}

export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

export type HttpToolParameterLocation = 'body' | 'query' | 'path';

export interface HttpToolArrayItemDefinition {
    type: string;
    properties?: HttpToolParameter[];
}

export interface HttpToolParameter {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    parameter_type?: HttpToolParameterLocation;
    enum?: string[];
    items?: HttpToolArrayItemDefinition;
    properties?: HttpToolParameter[];
}

export interface HttpToolHeader {
    key: string;
    value: string;
}

export interface HttpTool {
    id: number;
    agent_id: number;
    name: string;
    description: string | null;
    http_method: string;
    url: string;
    parameters: HttpToolParameter[] | null;
    static_parameters: Record<string, JsonValue> | null;
    headers: HttpToolHeader[] | null;
    auth_type: string | null;
    auth_config: Record<string, string> | null;
    system_tool: boolean;
    enabled: boolean;
}

export interface McpServerHeader {
    key: string;
    value: string;
}

export interface McpServer {
    id: number;
    agent_id: number;
    name: string;
    url: string;
    headers: McpServerHeader[] | null;
    tools: string[] | null;
    enabled: boolean;
}

export interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
}

export type CallLogStatus = 'in_progress' | 'completed' | 'failed';

export interface CallLog {
    id: string;
    call_id: string;
    agent_id: number;
    voice_provider: string | null;
    caller_number: string | null;
    called_number: string | null;
    domain_name: string | null;
    start_at: string | null;
    end_at: string | null;
    duration: number | null;
    status: CallLogStatus;
    transcript: TranscriptMessage[] | null;
    ai_summary: string | null;
    ai_topics: string[] | null;
}

export interface PaginatedCallLogs {
    data: CallLog[];
    page: number;
    perPage: number;
    total: number;
    lastPage: number;
    from: number;
    to: number;
}
