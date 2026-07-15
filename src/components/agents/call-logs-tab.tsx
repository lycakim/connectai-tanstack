import { useRouter, useRouterState } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, RotateCw, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import type {
    CallLog,
    CallLogStatus,
    PaginatedCallLogs,
} from '@/types/scheduled-call';

const STATUS_VARIANT: Record<
    CallLogStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    completed: 'default',
    in_progress: 'secondary',
    failed: 'destructive',
};

const STATUS_LABEL: Record<CallLogStatus, string> = {
    completed: 'Completed',
    in_progress: 'In progress',
    failed: 'Failed',
};

function formatDuration(seconds: number | null): string {
    if (seconds == null) {
        return '-';
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface CallLogsFilters {
    page?: number;
    status?: string;
    q?: string;
}

interface CallLogsTabProps {
    data: PaginatedCallLogs;
    filters: CallLogsFilters;
    onFilters: (next: CallLogsFilters) => void;
}

export function CallLogsTab({ data, filters, onFilters }: CallLogsTabProps) {
    const router = useRouter();
    const isLoading = useRouterState({ select: (s) => s.isLoading });
    const [searchInput, setSearchInput] = useState(filters.q ?? '');
    const [openLog, setOpenLog] = useState<CallLog | null>(null);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleSearch(value: string) {
        setSearchInput(value);
        if (debounce.current) {
            clearTimeout(debounce.current);
        }
        debounce.current = setTimeout(() => {
            onFilters({ q: value, page: 1 });
        }, 300);
    }

    const logs = data.data;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    Call Logs
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.invalidate()}
                >
                    <RotateCw />
                    Refresh
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search call ID or number"
                        value={searchInput}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={filters.status ?? 'all'}
                    onValueChange={(status) => onFilters({ status, page: 1 })}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-lg border">
                {logs.length === 0 ? (
                    <div className="p-12 text-center text-sm text-muted-foreground">
                        No call logs found.
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Call ID</TableHead>
                                    <TableHead>Caller</TableHead>
                                    <TableHead>Dialed</TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Start At</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Topics</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-mono text-xs">
                                            {log.call_id}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {log.caller_number ?? '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {log.called_number ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            {log.voice_provider ? (
                                                <Badge
                                                    variant="outline"
                                                    className="capitalize"
                                                >
                                                    {log.voice_provider}
                                                </Badge>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {formatDate(log.start_at)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDuration(log.duration)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    STATUS_VARIANT[log.status]
                                                }
                                            >
                                                {STATUS_LABEL[log.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {(log.ai_topics ?? [])
                                                    .slice(0, 2)
                                                    .map((t) => (
                                                        <Badge
                                                            key={t}
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {t}
                                                        </Badge>
                                                    ))}
                                                {!log.ai_topics?.length ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        -
                                                    </span>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    !log.transcript?.length
                                                }
                                                onClick={() => setOpenLog(log)}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <div className="text-sm text-muted-foreground">
                                Showing {data.from} to {data.to} of {data.total}{' '}
                                results
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={data.page <= 1 || isLoading}
                                    onClick={() =>
                                        onFilters({ page: data.page - 1 })
                                    }
                                >
                                    <ChevronLeft />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        data.page >= data.lastPage || isLoading
                                    }
                                    onClick={() =>
                                        onFilters({ page: data.page + 1 })
                                    }
                                >
                                    Next
                                    <ChevronRight />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <TranscriptSheet log={openLog} onClose={() => setOpenLog(null)} />
        </div>
    );
}

function TranscriptSheet({
    log,
    onClose,
}: {
    log: CallLog | null;
    onClose: () => void;
}) {
    return (
        <Sheet open={log !== null} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="sm:max-w-xl">
                {log ? (
                    <>
                        <SheetHeader>
                            <SheetTitle>Call transcript</SheetTitle>
                            <SheetDescription className="font-mono">
                                {log.call_id} · {formatDuration(log.duration)}
                            </SheetDescription>
                        </SheetHeader>

                        {log.ai_summary ? (
                            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                                <p className="text-sm font-medium text-foreground">
                                    AI Summary
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {log.ai_summary}
                                </p>
                                {log.ai_topics?.length ? (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {log.ai_topics.map((t) => (
                                            <Badge
                                                key={t}
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {t}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-3">
                            {(log.transcript ?? []).map((m, i) => {
                                const isAgent = m.role === 'assistant';
                                return (
                                    <div
                                        key={i}
                                        className={`flex flex-col gap-1 ${
                                            isAgent ? 'items-start' : 'items-end'
                                        }`}
                                    >
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {isAgent ? 'Assistant' : 'User'}
                                        </span>
                                        <div
                                            className={`max-w-[85%] rounded-xl border px-4 py-2 text-sm ${
                                                isAgent
                                                    ? 'bg-background'
                                                    : 'bg-muted'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">
                                                {m.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
