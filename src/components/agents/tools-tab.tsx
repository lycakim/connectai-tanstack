import { HttpToolTable } from '@/components/agents/http-tool-table';
import { McpServerTable } from '@/components/agents/mcp-server-table';
import type { HttpTool, McpServer } from '@/types/scheduled-call';

interface ToolsTabProps {
    agentId: number;
    httpTools: HttpTool[];
    mcpServers: McpServer[];
}

export function ToolsTab({ agentId, httpTools, mcpServers }: ToolsTabProps) {
    return (
        <div className="space-y-10">
            <McpServerTable agentId={agentId} mcpServers={mcpServers} />
            <HttpToolTable agentId={agentId} httpTools={httpTools} />
        </div>
    );
}
