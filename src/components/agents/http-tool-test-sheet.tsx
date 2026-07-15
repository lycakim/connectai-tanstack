import { Loader2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { testHttpTool, type TestHttpToolResponse } from '@/server/tools';
import type { HttpTool, HttpToolParameter } from '@/types/scheduled-call';

const LOCATION_BADGE: Record<string, string> = {
    path: 'bg-blue-100 text-blue-700',
    query: 'bg-green-100 text-green-700',
    body: 'bg-orange-100 text-orange-700',
};

function formatJson(data: unknown): string {
    try {
        if (typeof data === 'string') {
            return JSON.stringify(JSON.parse(data), null, 2);
        }
        return JSON.stringify(data, null, 2);
    } catch {
        return typeof data === 'string' ? data : JSON.stringify(data);
    }
}

export function HttpToolTestSheet({
    agentId,
    tool,
    onClose,
}: {
    agentId: number;
    tool: HttpTool | null;
    onClose: () => void;
}) {
    const [values, setValues] = useState<
        Record<string, import('@/types/scheduled-call').JsonValue>
    >({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TestHttpToolResponse | null>(null);

    const params = tool?.parameters ?? [];

    function update(
        name: string,
        value: import('@/types/scheduled-call').JsonValue,
    ) {
        setValues((v) => ({ ...v, [name]: value }));
    }

    function validationErrors(): Record<string, string> {
        const errors: Record<string, string> = {};
        for (const p of params) {
            if (!p.required) {
                continue;
            }
            const v = values[p.name];
            const empty =
                v === undefined ||
                v === null ||
                (typeof v === 'string' && v.trim() === '');
            if (empty) {
                errors[p.name] = `The ${p.name} parameter is required.`;
            }
        }
        return errors;
    }

    const errors = validationErrors();
    const invalid = Object.keys(errors).length > 0;

    async function handleExecute() {
        if (!tool) {
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await testHttpTool({
                data: { agentId, id: tool.id, values },
            });
            setResult(res);
            if (res.success) {
                toast.success('Test executed successfully');
            } else {
                toast.error(res.error ?? 'Test execution failed');
            }
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to execute test';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    function renderInput(p: HttpToolParameter) {
        const value = values[p.name];
        switch (p.type) {
            case 'integer':
            case 'number':
                return (
                    <Input
                        id={p.name}
                        type="number"
                        value={value === undefined ? '' : String(value)}
                        onChange={(e) => {
                            const n =
                                p.type === 'integer'
                                    ? parseInt(e.target.value, 10)
                                    : parseFloat(e.target.value);
                            update(p.name, Number.isNaN(n) ? '' : n);
                        }}
                        placeholder={p.description ?? ''}
                    />
                );
            case 'boolean':
                return (
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={Boolean(value)}
                            onCheckedChange={(c) => update(p.name, c)}
                        />
                        <span className="text-sm text-muted-foreground">
                            {p.description ?? 'Enable'}
                        </span>
                    </div>
                );
            case 'array':
            case 'object':
                return (
                    <Textarea
                        id={p.name}
                        value={
                            typeof value === 'object' && value !== null
                                ? JSON.stringify(value, null, 2)
                                : typeof value === 'string'
                                  ? value
                                  : ''
                        }
                        onChange={(e) => {
                            try {
                                update(p.name, JSON.parse(e.target.value));
                            } catch {
                                update(p.name, e.target.value);
                            }
                        }}
                        rows={3}
                        className="font-mono text-xs"
                        placeholder={
                            p.type === 'array'
                                ? '["item1", "item2"]'
                                : '{ "key": "value" }'
                        }
                    />
                );
            default:
                return (
                    <Input
                        id={p.name}
                        value={value === undefined ? '' : String(value)}
                        onChange={(e) => update(p.name, e.target.value)}
                        placeholder={p.description ?? ''}
                    />
                );
        }
    }

    return (
        <Sheet open={tool !== null} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="sm:max-w-2xl">
                {tool ? (
                    <>
                        <SheetHeader>
                            <SheetTitle>Test HTTP Tool: {tool.name}</SheetTitle>
                            <SheetDescription>
                                Test your HTTP tool with custom parameter values.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-col gap-6">
                            <div className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                                {tool.http_method} {tool.url}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Test Parameters
                                </h3>
                                {params.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        This tool has no parameters to configure.
                                    </p>
                                ) : (
                                    params.map((p) => (
                                        <div key={p.name} className="space-y-2">
                                            <Label
                                                htmlFor={p.name}
                                                className="flex items-center gap-2 text-sm font-medium"
                                            >
                                                {p.description || p.name}
                                                {p.required ? (
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                ) : null}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    ({p.type})
                                                </span>
                                                {p.parameter_type ? (
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${
                                                            LOCATION_BADGE[
                                                                p.parameter_type
                                                            ] ??
                                                            'bg-muted text-muted-foreground'
                                                        }`}
                                                    >
                                                        {p.parameter_type}
                                                    </span>
                                                ) : null}
                                            </Label>
                                            {renderInput(p)}
                                            {errors[p.name] ? (
                                                <p className="text-xs text-destructive">
                                                    {errors[p.name]}
                                                </p>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>

                            {invalid ? (
                                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
                                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                                    <div>
                                        <p className="font-medium">
                                            Fill in all required parameters
                                            before executing.
                                        </p>
                                        <ul className="mt-1 list-inside list-disc">
                                            {Object.values(errors).map((e) => (
                                                <li key={e}>{e}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleExecute}
                                    disabled={loading || invalid}
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" />
                                    ) : null}
                                    {loading ? 'Executing…' : 'Execute Test'}
                                </Button>
                            </div>

                            {result ? (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Response
                                    </h3>
                                    <div className="space-y-4 rounded-md border p-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-semibold">
                                                Status:
                                            </span>
                                            <span
                                                className={`font-mono ${
                                                    result.response.status >=
                                                        200 &&
                                                    result.response.status < 300
                                                        ? 'text-green-600'
                                                        : 'text-destructive'
                                                }`}
                                            >
                                                {result.response.status || '—'}{' '}
                                                {result.response.statusText}
                                            </span>
                                        </div>
                                        {result.error ? (
                                            <p className="text-sm text-destructive">
                                                <span className="font-semibold">
                                                    Error:{' '}
                                                </span>
                                                {result.error}
                                            </p>
                                        ) : null}
                                        <div>
                                            <Label className="mb-2 block text-xs text-muted-foreground">
                                                Response Headers
                                            </Label>
                                            <pre className="max-h-52 overflow-auto rounded-md border bg-background p-3 font-mono text-xs">
                                                <code>
                                                    {formatJson(
                                                        result.response.headers,
                                                    )}
                                                </code>
                                            </pre>
                                        </div>
                                        <div>
                                            <Label className="mb-2 block text-xs text-muted-foreground">
                                                Response Body
                                            </Label>
                                            <pre className="max-h-72 overflow-auto rounded-md border bg-background p-3 font-mono text-xs">
                                                <code>
                                                    {result.response.body
                                                        ? formatJson(
                                                              result.response
                                                                  .body,
                                                          )
                                                        : '(empty response)'}
                                                </code>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
