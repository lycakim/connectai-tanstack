import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { MoreVertical, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';
import { deleteAgent, getAgents } from '@/server/agents';
import type { Agent } from '@/types/scheduled-call';

export const Route = createFileRoute('/_app/')({
    loader: () => getAgents(),
    component: AgentsIndex,
});

function AgentsIndex() {
    const router = useRouter();
    const agents = Route.useLoaderData();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAgents = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
            return agents;
        }
        return agents.filter(
            (agent) =>
                agent.name.toLowerCase().includes(query) ||
                agent.system_prompt?.toLowerCase().includes(query) ||
                agent.connectware_extension?.toLowerCase().includes(query),
        );
    }, [agents, searchQuery]);

    function openAgent(agent: Agent) {
        router.navigate({
            to: '/agents/$agentId',
            params: { agentId: String(agent.id) },
        });
    }

    async function handleDelete(agent: Agent) {
        if (
            !window.confirm(
                `Delete "${agent.name}"? This action cannot be undone.`,
            )
        ) {
            return;
        }
        await deleteAgent({ data: { agentId: agent.id } });
        await router.invalidate();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    Agents
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage your AI agents. Click on an agent to view or edit its
                    details.
                </p>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Link
                    to="/agents/new"
                    className={buttonVariants({ size: 'sm' })}
                >
                    <Plus />
                    New Agent
                </Link>
            </div>

            {agents.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border p-12">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold text-foreground">
                            No agents yet
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create your first agent to get started.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-lg border">
                    {filteredAgents.length === 0 ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="text-center">
                                <h2 className="text-lg font-semibold text-foreground">
                                    No agents found
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {`No agents match "${searchQuery}". Try a different search term.`}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Extension</TableHead>
                                    <TableHead>Production</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-[50px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAgents.map((agent) => (
                                    <TableRow
                                        key={agent.id}
                                        className="cursor-pointer"
                                        onClick={() => openAgent(agent)}
                                    >
                                        <TableCell className="font-medium">
                                            {agent.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {agent.connectware_extension || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    agent.production
                                                        ? 'border-green-200 bg-green-50 text-green-700'
                                                        : 'border-border bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {agent.production ? 'Yes' : 'No'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {formatDate(agent.created_at)}
                                        </TableCell>
                                        <TableCell
                                            className="w-[50px]"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                    >
                                                        <MoreVertical />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            openAgent(agent)
                                                        }
                                                    >
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() =>
                                                            handleDelete(agent)
                                                        }
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}
        </div>
    );
}
