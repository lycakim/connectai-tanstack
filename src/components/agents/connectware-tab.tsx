import { useRouter } from '@tanstack/react-router';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { syncReseller, updateAgent } from '@/server/agents';
import type { Agent } from '@/types/scheduled-call';

export function ConnectwareTab({ agent }: { agent: Agent }) {
    const router = useRouter();

    const [domain, setDomain] = useState(agent.domain ?? '');
    const [extension, setExtension] = useState(
        agent.connectware_extension ?? '',
    );
    const [failover, setFailover] = useState(
        agent.connectware_failover_extension ?? '',
    );
    const [resellerDisplay, setResellerDisplay] = useState<string | null>(
        agent.reseller ?? null,
    );
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    function markDirty() {
        setSaved(false);
    }

    async function handleSync() {
        setSyncing(true);
        setError(null);
        try {
            const { reseller } = await syncReseller({
                data: { agentId: agent.id, domain: domain || null },
            });
            setResellerDisplay(reseller);
            if (reseller === null) {
                setError('Could not fetch reseller from ConnectWare.');
            }
            await router.invalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sync failed.');
        } finally {
            setSyncing(false);
        }
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSaved(false);
        setSubmitting(true);
        try {
            await updateAgent({
                data: {
                    agentId: agent.id,
                    domain: domain || null,
                    connectware_extension: extension || null,
                    connectware_failover_extension: failover || null,
                },
            });
            await router.invalidate();
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
            {error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}
            {saved ? (
                <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700">
                    Changes saved.
                </div>
            ) : null}

            {domain ? (
                <div className="grid gap-2">
                    <Label htmlFor="reseller">Agent Reseller</Label>
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={handleSync}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSync();
                            }
                        }}
                        className="relative cursor-pointer rounded-md"
                        title="Click to sync reseller from ConnectWare"
                    >
                        <Input
                            id="reseller"
                            value={resellerDisplay ?? ''}
                            placeholder="Not synced yet"
                            readOnly
                            className="pointer-events-none cursor-pointer bg-muted pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            {syncing ? (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : (
                                <RefreshCw className="size-4 text-muted-foreground" />
                            )}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Click the field to sync the reseller from ConnectWare.
                    </p>
                </div>
            ) : null}

            <div className="grid gap-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                    id="domain"
                    value={domain}
                    onChange={(e) => {
                        setDomain(e.target.value);
                        markDirty();
                    }}
                    placeholder="example.com"
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="connectware_extension">Extension</Label>
                <Input
                    id="connectware_extension"
                    value={extension}
                    onChange={(e) => {
                        setExtension(e.target.value);
                        markDirty();
                    }}
                    placeholder="Enter extension"
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="connectware_failover_extension">
                    Failover Extension
                </Label>
                <Input
                    id="connectware_failover_extension"
                    value={failover}
                    onChange={(e) => {
                        setFailover(e.target.value);
                        markDirty();
                    }}
                    placeholder="Enter failover extension"
                />
            </div>

            <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
            </Button>
        </form>
    );
}
