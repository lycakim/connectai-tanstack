import { useRouter } from '@tanstack/react-router';
import { Check, Copy, Pencil, Plus, Terminal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { HttpToolSheet } from '@/components/agents/http-tool-sheet';
import { HttpToolTestSheet } from '@/components/agents/http-tool-test-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { deleteHttpTool, setHttpToolEnabled } from '@/server/tools';
import type { HttpTool } from '@/types/scheduled-call';


function toolJson(tool: HttpTool): string {
    return JSON.stringify(
        {
            name: tool.name,
            description: tool.description,
            http_method: tool.http_method,
            url: tool.url,
            parameters: tool.parameters ?? [],
            enabled: tool.enabled,
        },
        null,
        2,
    );
}

interface HttpToolTableProps {
    agentId: number;
    httpTools: HttpTool[];
}

export function HttpToolTable({ agentId, httpTools }: HttpToolTableProps) {
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<HttpTool | null>(null);
    const [testTool, setTestTool] = useState<HttpTool | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    function openCreate() {
        setEditing(null);
        setSheetOpen(true);
    }

    function openEdit(tool: HttpTool) {
        setEditing(tool);
        setSheetOpen(true);
    }

    async function handleCopy(tool: HttpTool) {
        try {
            await navigator.clipboard.writeText(toolJson(tool));
            setCopiedId(tool.id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }

    async function handleToggle(tool: HttpTool, enabled: boolean) {
        await setHttpToolEnabled({ data: { agentId, id: tool.id, enabled } });
        await router.invalidate();
    }

    async function handleDelete(tool: HttpTool) {
        if (!window.confirm(`Delete HTTP tool "${tool.name}"?`)) {
            return;
        }
        await deleteHttpTool({ data: { agentId, id: tool.id } });
        await router.invalidate();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    HTTP Tools
                </h3>
                <Button size="sm" onClick={openCreate}>
                    <Plus />
                    Add HTTP Tool
                </Button>
            </div>

            {httpTools.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No HTTP tools configured. Click "Add HTTP Tool" to get
                    started.
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead>Parameters</TableHead>
                                <TableHead className="w-[90px]">
                                    Enabled
                                </TableHead>
                                <TableHead className="w-[160px] text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {httpTools.map((tool) => (
                                <TableRow key={tool.id}>
                                    <TableCell className="font-mono font-medium">
                                        {tool.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {tool.http_method}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                                        {tool.url}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {tool.parameters?.length ?? 0}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="w-fit">
                                                    <Switch
                                                        checked={tool.enabled}
                                                        onCheckedChange={(v) =>
                                                            handleToggle(tool, v)
                                                        }
                                                        aria-label={`Toggle ${tool.name}`}
                                                    />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {tool.enabled
                                                    ? 'Enabled — included in API'
                                                    : 'Disabled — excluded from API'}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <ActionButton
                                                label={
                                                    copiedId === tool.id
                                                        ? 'Copied!'
                                                        : 'Copy JSON'
                                                }
                                                onClick={() => handleCopy(tool)}
                                            >
                                                {copiedId === tool.id ? (
                                                    <Check />
                                                ) : (
                                                    <Copy />
                                                )}
                                            </ActionButton>
                                            <ActionButton
                                                label="Test"
                                                onClick={() =>
                                                    setTestTool(tool)
                                                }
                                            >
                                                <Terminal />
                                            </ActionButton>
                                            <ActionButton
                                                label="Edit"
                                                onClick={() => openEdit(tool)}
                                            >
                                                <Pencil />
                                            </ActionButton>
                                            <ActionButton
                                                label="Delete"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    handleDelete(tool)
                                                }
                                            >
                                                <Trash2 />
                                            </ActionButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <HttpToolSheet
                key={editing?.id ?? 'new'}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                agentId={agentId}
                tool={editing}
                onSaved={() => {
                    setSheetOpen(false);
                    router.invalidate();
                }}
            />

            <HttpToolTestSheet
                key={`test-${testTool?.id ?? 'none'}`}
                agentId={agentId}
                tool={testTool}
                onClose={() => setTestTool(null)}
            />
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    className,
    children,
}: {
    label: string;
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`size-8 ${className ?? ''}`}
                    onClick={onClick}
                    aria-label={label}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

