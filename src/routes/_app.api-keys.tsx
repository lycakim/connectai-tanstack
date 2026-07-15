import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Check, Copy, KeyRound, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    createApiKey,
    deleteApiKey,
    getApiKeys,
    type CreatedApiKey,
} from '@/server/api-keys';

export const Route = createFileRoute('/_app/api-keys')({
    loader: () => getApiKeys(),
    component: ApiKeysPage,
});

function ApiKeysPage() {
    const router = useRouter();
    const keys = Route.useLoaderData();

    const [createOpen, setCreateOpen] = useState(false);
    const [revealOpen, setRevealOpen] = useState(false);
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<CreatedApiKey | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const res = await createApiKey({ data: { name } });
            setCreated(res);
            setName('');
            setCreateOpen(false);
            setRevealOpen(true);
            await router.invalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCopy() {
        if (!created) {
            return;
        }
        try {
            await navigator.clipboard.writeText(created.token);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }

    function closeReveal() {
        setRevealOpen(false);
        setCreated(null);
        setCopied(false);
    }

    async function handleDelete(id: number, keyName: string) {
        if (
            !window.confirm(`Revoke API key "${keyName}"? This cannot be undone.`)
        ) {
            return;
        }
        await deleteApiKey({ data: { id } });
        await router.invalidate();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        API Keys
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create personal access tokens to call the ConnectAI API.
                    </p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus />
                    Create API key
                </Button>
            </div>

            {keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
                    <KeyRound className="size-8 text-muted-foreground" />
                    <div>
                        <p className="font-medium text-foreground">
                            No API keys yet
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create your first key to authenticate API requests.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Last used</TableHead>
                                <TableHead className="w-[80px] text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {keys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">
                                        {key.name}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {key.prefix}…
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                        {formatDate(key.created_at)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                        {key.last_used_at
                                            ? formatDate(key.last_used_at)
                                            : 'Never'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                handleDelete(key.id, key.name)
                                            }
                                        >
                                            <Trash2 />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create API key</DialogTitle>
                        <DialogDescription>
                            Give the key a name so you can recognize it later.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="flex flex-col gap-5">
                        {error ? (
                            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                                {error}
                            </div>
                        ) : null}
                        <div className="grid gap-2">
                            <Label htmlFor="key_name">Name</Label>
                            <Input
                                id="key_name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Production server"
                                required
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Create key'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Token reveal dialog */}
            <Dialog
                open={revealOpen}
                onOpenChange={(open) => (open ? setRevealOpen(true) : closeReveal())}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>API key created</DialogTitle>
                        <DialogDescription>
                            Copy your key now — you won&apos;t be able to see it
                            again.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        {created?.name ? (
                            <div className="grid gap-1">
                                <Label>Name</Label>
                                <p className="text-sm font-medium text-foreground">
                                    {created.name}
                                </p>
                            </div>
                        ) : null}
                        <div className="grid gap-2">
                            <Label>API key</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={created?.token ?? ''}
                                    readOnly
                                    className="select-all font-mono text-sm"
                                    onClick={(e) => e.currentTarget.select()}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopy}
                                    title={copied ? 'Copied!' : 'Copy'}
                                >
                                    {copied ? (
                                        <Check className="text-green-600" />
                                    ) : (
                                        <Copy />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
                            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                            <p>
                                This is the only time you&apos;ll see this token.
                                Store it somewhere secure.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeReveal}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
