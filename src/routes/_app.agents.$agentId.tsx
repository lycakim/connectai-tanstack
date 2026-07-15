import {
    createFileRoute,
    Link,
    notFound,
    useRouter,
} from '@tanstack/react-router';
import {
    ArrowLeft,
    BarChart3,
    BookOpen,
    Settings2,
    Trash2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { AgentForm } from '@/components/agents/agent-form';
import { CallLogsTab } from '@/components/agents/call-logs-tab';
import { ConnectwareTab } from '@/components/agents/connectware-tab';
import { ScheduledCallsTab } from '@/components/agents/scheduled-calls-tab';
import { ToolsTab } from '@/components/agents/tools-tab';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { deleteAgent } from '@/server/agents';
import { getCallLogs } from '@/server/call-logs';
import { getScheduledCalls } from '@/server/scheduled-calls';
import { getAgentTools } from '@/server/tools';

export interface CallLogsSearch {
    page?: number;
    status?: string;
    q?: string;
}

export const Route = createFileRoute('/_app/agents/$agentId')({
    component: AgentPage,
    errorComponent: AgentError,
    notFoundComponent: AgentNotFound,
    validateSearch: (search: Record<string, unknown>): CallLogsSearch => ({
        page: Number(search.page) > 0 ? Number(search.page) : undefined,
        status:
            typeof search.status === 'string' && search.status !== 'all'
                ? search.status
                : undefined,
        q:
            typeof search.q === 'string' && search.q.trim()
                ? search.q
                : undefined,
    }),
    loaderDeps: ({ search }) => ({
        page: search.page,
        status: search.status,
        q: search.q,
    }),
    loader: async ({ params, deps }) => {
        const agentId = Number(params.agentId);
        if (!Number.isInteger(agentId)) {
            throw notFound();
        }
        try {
            const [scheduled, tools, callLogs] = await Promise.all([
                getScheduledCalls({ data: { agentId } }),
                getAgentTools({ data: { agentId } }),
                getCallLogs({
                    data: {
                        agentId,
                        page: deps.page,
                        status: deps.status,
                        search: deps.q,
                    },
                }),
            ]);
            return { ...scheduled, ...tools, callLogs };
        } catch (err) {
            if (err instanceof Error && err.message.includes('not found')) {
                throw notFound();
            }
            throw err;
        }
    },
});

function AgentNotFound() {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
            <h2 className="text-lg font-semibold text-foreground">
                Agent not found
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
                This agent doesn&apos;t exist or may have been deleted.
            </p>
            <Link
                to="/"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
                <ArrowLeft />
                Back to Agents
            </Link>
        </div>
    );
}

function AgentError({ error }: { error: Error }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
            <h2 className="text-lg font-semibold text-foreground">
                Something went wrong
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
                {error.message}
            </p>
            <Link
                to="/"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
                <ArrowLeft />
                Back to Agents
            </Link>
        </div>
    );
}

function TabPlaceholder({
    title,
    icon: Icon,
}: {
    title: string;
    icon: ComponentType<{ className?: string }>;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
            <Icon className="size-8 text-muted-foreground" />
            <div>
                <p className="font-medium text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Not included in this evaluation build.
                </p>
            </div>
        </div>
    );
}

function AgentPage() {
    const router = useRouter();
    const { agent, scheduledCalls, httpTools, mcpServers, callLogs } =
        Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        if (
            !window.confirm(
                `Delete "${agent.name}"? This action cannot be undone.`,
            )
        ) {
            return;
        }

        setDeleting(true);
        try {
            await deleteAgent({ data: { agentId: agent.id } });
            router.navigate({ to: '/' });
        } finally {
            setDeleting(false);
        }
    }

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Edit {agent.name}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/"
                            className={buttonVariants({
                                variant: 'ghost',
                                size: 'sm',
                            })}
                        >
                            <ArrowLeft />
                            Back to Agents
                        </Link>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            <Trash2 />
                            {deleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent>
                        <Tabs defaultValue="agent">
                            <TabsList className="flex-wrap">
                                <TabsTrigger value="agent">Agent</TabsTrigger>
                                <TabsTrigger value="connectware">
                                    ConnectWare
                                </TabsTrigger>
                                <TabsTrigger value="tools">Tools</TabsTrigger>
                                <TabsTrigger value="knowledge-base">
                                    Knowledge Base
                                </TabsTrigger>
                                <TabsTrigger value="metrics">
                                    Metrics
                                </TabsTrigger>
                                <TabsTrigger value="call-logs">
                                    Call Logs
                                </TabsTrigger>
                                <TabsTrigger value="advanced">
                                    Advanced
                                </TabsTrigger>
                                <TabsTrigger value="scheduled-calls">
                                    Scheduled Calls
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="agent" className="mt-6">
                                <AgentForm agent={agent} />
                            </TabsContent>

                            <TabsContent value="connectware" className="mt-6">
                                <ConnectwareTab agent={agent} />
                            </TabsContent>

                            <TabsContent value="tools" className="mt-6">
                                <ToolsTab
                                    agentId={agent.id}
                                    httpTools={httpTools}
                                    mcpServers={mcpServers}
                                />
                            </TabsContent>

                            <TabsContent value="knowledge-base" className="mt-6">
                                <TabPlaceholder
                                    title="Knowledge Base"
                                    icon={BookOpen}
                                />
                            </TabsContent>

                            <TabsContent value="metrics" className="mt-6">
                                <TabPlaceholder
                                    title="Metrics"
                                    icon={BarChart3}
                                />
                            </TabsContent>

                            <TabsContent value="call-logs" className="mt-6">
                                <CallLogsTab
                                    data={callLogs}
                                    filters={search}
                                    onFilters={(next) =>
                                        navigate({
                                            search: (prev) => ({
                                                ...prev,
                                                ...next,
                                            }),
                                        })
                                    }
                                />
                            </TabsContent>

                            <TabsContent value="advanced" className="mt-6">
                                <TabPlaceholder
                                    title="Advanced"
                                    icon={Settings2}
                                />
                            </TabsContent>

                            <TabsContent
                                value="scheduled-calls"
                                className="mt-6"
                            >
                                <ScheduledCallsTab
                                    agentId={agent.id}
                                    scheduledCalls={scheduledCalls}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
