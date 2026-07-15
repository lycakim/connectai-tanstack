import { useRouter } from '@tanstack/react-router';
import {
    CalendarClock,
    CalendarPlus,
    Phone,
    Plus,
    RotateCw,
    Tags,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import {
    cancelScheduledCall,
    createScheduledCall,
} from '@/server/scheduled-calls';
import type { ScheduledCall, ScheduledCallStatus } from '@/types/scheduled-call';

const STATUS_VARIANT: Record<
    ScheduledCallStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    pending: 'secondary',
    dispatched: 'default',
    cancelled: 'outline',
    failed: 'destructive',
};

function ScheduledCallStatusBadge({ status }: { status: ScheduledCallStatus }) {
    return (
        <Badge variant={STATUS_VARIANT[status]} className="capitalize">
            {status}
        </Badge>
    );
}

const CANCELLABLE: ScheduledCallStatus[] = ['pending', 'failed'];

interface MetadataRow {
    key: string;
    value: string;
}

interface ScheduledCallsTabProps {
    agentId: number;
    scheduledCalls: ScheduledCall[];
}

export function ScheduledCallsTab({
    agentId,
    scheduledCalls,
}: ScheduledCallsTabProps) {
    const router = useRouter();

    const [destination, setDestination] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [metadataRows, setMetadataRows] = useState<MetadataRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    function resetForm() {
        setDestination('');
        setScheduledAt('');
        setMetadataRows([]);
    }

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);

        const metadata = metadataRows.reduce<Record<string, string>>(
            (acc, row) => {
                const key = row.key.trim();
                if (key) {
                    acc[key] = row.value;
                }
                return acc;
            },
            {},
        );

        try {
            await createScheduledCall({
                data: {
                    agentId,
                    destination,
                    // datetime-local yields local time; convert to ISO for the server.
                    scheduled_at: new Date(scheduledAt).toISOString(),
                    metadata:
                        Object.keys(metadata).length > 0 ? metadata : null,
                },
            });
            resetForm();
            await router.invalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to schedule.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCancel(call: ScheduledCall) {
        setError(null);
        setBusyId(call.id);
        try {
            await cancelScheduledCall({ data: { id: call.id } });
            await router.invalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="space-y-8">
            {error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarPlus className="size-4 text-muted-foreground" />
                        Schedule a call
                    </CardTitle>
                    <CardDescription>
                        Queue an outbound call for this agent to place at a
                        future time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="destination">Destination</Label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="destination"
                                        value={destination}
                                        onChange={(e) =>
                                            setDestination(e.target.value)
                                        }
                                        placeholder="5125550142"
                                        className="pl-9 font-mono"
                                        inputMode="tel"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Phone number or extension to dial.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="scheduled_at">
                                    Scheduled at
                                </Label>
                                <div className="relative">
                                    <CalendarClock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="scheduled_at"
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={(e) =>
                                            setScheduledAt(e.target.value)
                                        }
                                        className="pl-9"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Must be a time in the future.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Tags className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">
                                        Metadata
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Optional
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setMetadataRows((rows) => [
                                            ...rows,
                                            { key: '', value: '' },
                                        ])
                                    }
                                >
                                    <Plus />
                                    Add field
                                </Button>
                            </div>

                            {metadataRows.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    Attach key/value pairs (e.g. a campaign name)
                                    that travel with the call.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {metadataRows.map((row, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2"
                                        >
                                            <Input
                                                value={row.key}
                                                onChange={(e) =>
                                                    setMetadataRows((rows) =>
                                                        rows.map((r, i) =>
                                                            i === index
                                                                ? {
                                                                      ...r,
                                                                      key: e
                                                                          .target
                                                                          .value,
                                                                  }
                                                                : r,
                                                        ),
                                                    )
                                                }
                                                placeholder="key (e.g. campaign)"
                                                className="bg-background"
                                            />
                                            <Input
                                                value={row.value}
                                                onChange={(e) =>
                                                    setMetadataRows((rows) =>
                                                        rows.map((r, i) =>
                                                            i === index
                                                                ? {
                                                                      ...r,
                                                                      value: e
                                                                          .target
                                                                          .value,
                                                                  }
                                                                : r,
                                                        ),
                                                    )
                                                }
                                                placeholder="value"
                                                className="bg-background"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    setMetadataRows((rows) =>
                                                        rows.filter(
                                                            (_, i) =>
                                                                i !== index,
                                                        ),
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

                        <div className="flex items-center justify-end gap-2 border-t pt-4">
                            {(destination ||
                                scheduledAt ||
                                metadataRows.length > 0) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetForm}
                                    disabled={submitting}
                                >
                                    Clear
                                </Button>
                            )}
                            <Button type="submit" disabled={submitting}>
                                <CalendarPlus />
                                {submitting ? 'Scheduling…' : 'Schedule call'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                        Scheduled Calls
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

                {scheduledCalls.length === 0 ? (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No scheduled calls for this agent.
                    </div>
                ) : (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Scheduled At</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Dispatched At</TableHead>
                                    <TableHead>Failure Reason</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scheduledCalls.map((scheduledCall) => (
                                    <TableRow key={scheduledCall.id}>
                                        <TableCell className="font-mono text-sm">
                                            {scheduledCall.destination}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(
                                                scheduledCall.scheduled_at,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <ScheduledCallStatusBadge
                                                status={scheduledCall.status}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {scheduledCall.dispatched_at
                                                ? formatDate(
                                                      scheduledCall.dispatched_at,
                                                  )
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                                            {scheduledCall.failure_reason ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {CANCELLABLE.includes(
                                                scheduledCall.status,
                                            ) ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={
                                                        busyId ===
                                                        scheduledCall.id
                                                    }
                                                    onClick={() =>
                                                        handleCancel(
                                                            scheduledCall,
                                                        )
                                                    }
                                                >
                                                    <Trash2 />
                                                    Cancel
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
