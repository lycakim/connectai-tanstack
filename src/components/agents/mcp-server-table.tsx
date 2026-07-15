import { useRouter } from '@tanstack/react-router';
import { Check, Copy, Loader2, Pencil, Plus, PlugZap, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
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
import {
    deleteMcpServer,
    saveMcpServer,
    setMcpServerEnabled,
    testMcpConnection,
} from '@/server/tools';
import type { McpServer, McpServerHeader } from '@/types/scheduled-call';

function serverJson(server: McpServer): string {
    return JSON.stringify(
        {
            name: server.name,
            url: server.url,
            headers: server.headers ?? [],
            tools: server.tools ?? [],
            enabled: server.enabled,
        },
        null,
        2,
    );
}

interface TestState {
    id: number;
    ok: boolean;
    status: number;
    error?: string;
}

interface McpServerTableProps {
    agentId: number;
    mcpServers: McpServer[];
}

export function McpServerTable({ agentId, mcpServers }: McpServerTableProps) {
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<McpServer | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [testResult, setTestResult] = useState<TestState | null>(null);

    function openCreate() {
        setEditing(null);
        setSheetOpen(true);
    }

    function openEdit(server: McpServer) {
        setEditing(server);
        setSheetOpen(true);
    }

    async function handleCopy(server: McpServer) {
        try {
            await navigator.clipboard.writeText(serverJson(server));
            setCopiedId(server.id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }

    async function handleTest(server: McpServer) {
        setTestingId(server.id);
        setTestResult(null);
        try {
            const res = await testMcpConnection({
                data: {
                    agentId,
                    url: server.url,
                    headers: server.headers ?? [],
                },
            });
            setTestResult({ id: server.id, ...res });
        } finally {
            setTestingId(null);
        }
    }

    async function handleToggle(server: McpServer, enabled: boolean) {
        await setMcpServerEnabled({
            data: { agentId, id: server.id, enabled },
        });
        await router.invalidate();
    }

    async function handleDelete(server: McpServer) {
        if (!window.confirm(`Delete MCP server "${server.name}"?`)) {
            return;
        }
        await deleteMcpServer({ data: { agentId, id: server.id } });
        await router.invalidate();
    }

    const tested = testResult
        ? mcpServers.find((s) => s.id === testResult.id)
        : undefined;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    MCP Servers
                </h3>
                <Button size="sm" onClick={openCreate}>
                    <Plus />
                    Add MCP Server
                </Button>
            </div>

            {testResult ? (
                <div
                    className={`rounded-md border px-4 py-2 text-sm ${
                        testResult.ok
                            ? 'border-green-500/40 bg-green-500/10 text-green-700'
                            : 'border-destructive/50 bg-destructive/10 text-destructive'
                    }`}
                >
                    {testResult.ok
                        ? `Connection to "${tested?.name ?? 'server'}" succeeded (HTTP ${testResult.status}).`
                        : `Connection to "${tested?.name ?? 'server'}" failed: ${
                              testResult.error ?? `HTTP ${testResult.status}`
                          }`}
                </div>
            ) : null}

            {mcpServers.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No MCP servers configured. Click "Add MCP Server" to get
                    started.
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead>Tools</TableHead>
                                <TableHead className="w-[90px]">
                                    Enabled
                                </TableHead>
                                <TableHead className="w-[160px] text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mcpServers.map((server) => (
                                <TableRow key={server.id}>
                                    <TableCell className="font-medium">
                                        {server.name}
                                    </TableCell>
                                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                                        {server.url}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {server.tools?.length ?? 0}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="w-fit">
                                                    <Switch
                                                        checked={server.enabled}
                                                        onCheckedChange={(v) =>
                                                            handleToggle(
                                                                server,
                                                                v,
                                                            )
                                                        }
                                                        aria-label={`Toggle ${server.name}`}
                                                    />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {server.enabled
                                                    ? 'Enabled — included in API'
                                                    : 'Disabled — excluded from API'}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <ActionButton
                                                label="Test Connection"
                                                disabled={
                                                    testingId === server.id
                                                }
                                                onClick={() =>
                                                    handleTest(server)
                                                }
                                            >
                                                {testingId === server.id ? (
                                                    <Loader2 className="animate-spin" />
                                                ) : (
                                                    <PlugZap />
                                                )}
                                            </ActionButton>
                                            <ActionButton
                                                label={
                                                    copiedId === server.id
                                                        ? 'Copied!'
                                                        : 'Copy JSON'
                                                }
                                                onClick={() =>
                                                    handleCopy(server)
                                                }
                                            >
                                                {copiedId === server.id ? (
                                                    <Check />
                                                ) : (
                                                    <Copy />
                                                )}
                                            </ActionButton>
                                            <ActionButton
                                                label="Edit"
                                                onClick={() => openEdit(server)}
                                            >
                                                <Pencil />
                                            </ActionButton>
                                            <ActionButton
                                                label="Delete"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    handleDelete(server)
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

            <McpServerSheet
                key={editing?.id ?? 'new'}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                agentId={agentId}
                server={editing}
                onSaved={() => {
                    setSheetOpen(false);
                    router.invalidate();
                }}
            />
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    className,
    disabled,
    children,
}: {
    label: string;
    onClick: () => void;
    className?: string;
    disabled?: boolean;
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
                    disabled={disabled}
                    aria-label={label}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

interface McpServerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agentId: number;
    server: McpServer | null;
    onSaved: () => void;
}

function McpServerSheet({
    open,
    onOpenChange,
    agentId,
    server,
    onSaved,
}: McpServerSheetProps) {
    const [name, setName] = useState(server?.name ?? '');
    const [url, setUrl] = useState(server?.url ?? '');
    const [enabled, setEnabled] = useState(server?.enabled ?? true);
    const [headers, setHeaders] = useState<McpServerHeader[]>(
        server?.headers ?? [],
    );
    const [toolsText, setToolsText] = useState(
        (server?.tools ?? []).join(', '),
    );
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await saveMcpServer({
                data: {
                    agentId,
                    id: server?.id,
                    name,
                    url,
                    headers,
                    tools: toolsText
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    enabled,
                },
            });
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>
                        {server ? 'Edit MCP Server' : 'Add MCP Server'}
                    </SheetTitle>
                    <SheetDescription>
                        Connect the agent to a Model Context Protocol server.
                    </SheetDescription>
                </SheetHeader>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-1 flex-col gap-5"
                >
                    {error ? (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    ) : null}

                    <div className="grid gap-2">
                        <Label htmlFor="mcp_name">Name</Label>
                        <Input
                            id="mcp_name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Clinic Knowledge MCP"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="mcp_url">URL</Label>
                        <Input
                            id="mcp_url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://mcp.example.com/sse"
                            className="font-mono text-sm"
                            required
                        />
                    </div>

                    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                                Headers
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setHeaders((h) => [
                                        ...h,
                                        { key: '', value: '' },
                                    ])
                                }
                            >
                                <Plus />
                                Add
                            </Button>
                        </div>
                        {headers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No headers. Add auth headers if the server
                                requires them.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {headers.map((h, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2"
                                    >
                                        <Input
                                            value={h.key}
                                            onChange={(e) =>
                                                setHeaders((hs) =>
                                                    hs.map((x, j) =>
                                                        j === i
                                                            ? {
                                                                  ...x,
                                                                  key: e.target
                                                                      .value,
                                                              }
                                                            : x,
                                                    ),
                                                )
                                            }
                                            placeholder="Authorization"
                                            className="bg-background"
                                        />
                                        <Input
                                            value={h.value}
                                            onChange={(e) =>
                                                setHeaders((hs) =>
                                                    hs.map((x, j) =>
                                                        j === i
                                                            ? {
                                                                  ...x,
                                                                  value: e.target
                                                                      .value,
                                                              }
                                                            : x,
                                                    ),
                                                )
                                            }
                                            placeholder="Bearer …"
                                            className="bg-background"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                setHeaders((hs) =>
                                                    hs.filter((_, j) => j !== i),
                                                )
                                            }
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="mcp_tools">Tools</Label>
                        <Input
                            id="mcp_tools"
                            value={toolsText}
                            onChange={(e) => setToolsText(e.target.value)}
                            placeholder="search_docs, get_hours"
                        />
                        <p className="text-xs text-muted-foreground">
                            Comma-separated list of tool names exposed by this
                            server.
                        </p>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-foreground">
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                        Enabled
                    </label>

                    <SheetFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving…' : 'Save server'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
