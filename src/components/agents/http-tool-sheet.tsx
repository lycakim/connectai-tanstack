import {
    ChevronDown,
    ChevronRight,
    KeyRound,
    Plus,
    Terminal,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { CurlImportDialog, type ParsedCurl } from '@/components/agents/curl-import-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { saveHttpTool } from '@/server/tools';
import type {
    HttpTool,
    HttpToolHeader,
    HttpToolParameter,
    HttpToolParameterLocation,
    JsonValue,
} from '@/types/scheduled-call';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PARAMETER_TYPES = [
    'string',
    'number',
    'integer',
    'boolean',
    'array',
    'object',
];
const LOCATIONS: {
    value: HttpToolParameterLocation;
    title: string;
    description: string;
}[] = [
    { value: 'body', title: 'Body', description: 'Sent in the request body as JSON' },
    {
        value: 'path',
        title: 'Path',
        description: 'Injected into the URL path (e.g. /users/{id})',
    },
    {
        value: 'query',
        title: 'Query',
        description: 'Appended as the URL query string (e.g. ?page=1)',
    },
];

const AWS_EMPTY: Record<string, string> = {
    region: '',
    service: '',
    access_key: '',
    secret_key: '',
};

function StaticValueInput({
    param,
    value,
    onChange,
}: {
    param: HttpToolParameter;
    value: JsonValue | undefined;
    onChange: (v: JsonValue) => void;
}) {
    if (param.type === 'boolean') {
        return (
            <Select
                value={value === true ? 'true' : 'false'}
                onValueChange={(v) => onChange(v === 'true')}
            >
                <SelectTrigger className="h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                </SelectContent>
            </Select>
        );
    }
    if (param.type === 'integer' || param.type === 'number') {
        return (
            <Input
                type="number"
                className="h-8 bg-background"
                value={value === undefined || value === null ? '' : String(value)}
                onChange={(e) => {
                    const n =
                        param.type === 'integer'
                            ? parseInt(e.target.value, 10)
                            : parseFloat(e.target.value);
                    onChange(Number.isNaN(n) ? e.target.value : n);
                }}
                placeholder="Static value"
            />
        );
    }
    if (param.type === 'array' || param.type === 'object') {
        return (
            <Textarea
                rows={3}
                className="bg-background font-mono text-xs"
                value={
                    value === undefined
                        ? ''
                        : typeof value === 'string'
                          ? value
                          : JSON.stringify(value, null, 2)
                }
                onChange={(e) => {
                    try {
                        onChange(JSON.parse(e.target.value));
                    } catch {
                        onChange(e.target.value);
                    }
                }}
                placeholder={param.type === 'array' ? '["a", "b"]' : '{ "k": "v" }'}
            />
        );
    }
    return (
        <Input
            className="h-8 bg-background"
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Static value"
        />
    );
}

interface SectionProps {
    location: HttpToolParameterLocation;
    title: string;
    description: string;
    parameters: HttpToolParameter[];
    staticParameters: Record<string, JsonValue>;
    onAdd: (location: HttpToolParameterLocation) => void;
    onUpdate: (index: number, patch: Partial<HttpToolParameter>) => void;
    onRemove: (index: number) => void;
    onToggleStatic: (name: string, makeStatic: boolean) => void;
    onStaticValue: (name: string, value: JsonValue) => void;
}

function ParameterSection({
    location,
    title,
    description,
    parameters,
    staticParameters,
    onAdd,
    onUpdate,
    onRemove,
    onToggleStatic,
    onStaticValue,
}: SectionProps) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const rows = parameters
        .map((param, index) => ({ param, index }))
        .filter(({ param }) => (param.parameter_type ?? 'body') === location);

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium">{title}</span>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAdd(location)}
                >
                    <Plus />
                    Add
                </Button>
            </div>

            {rows.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
                    No {title.toLowerCase()} parameters.
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-28">Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-24">Source</TableHead>
                                <TableHead className="w-20 text-center">
                                    Required
                                </TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(({ param, index }) => {
                                const isStatic = param.name in staticParameters;
                                const nested =
                                    param.type === 'object' ||
                                    param.type === 'array';
                                const isOpen = expanded[index] ?? false;
                                return (
                                    <>
                                        <TableRow key={index}>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {nested ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-6"
                                                            onClick={() =>
                                                                setExpanded(
                                                                    (e) => ({
                                                                        ...e,
                                                                        [index]:
                                                                            !isOpen,
                                                                    }),
                                                                )
                                                            }
                                                        >
                                                            {isOpen ? (
                                                                <ChevronDown />
                                                            ) : (
                                                                <ChevronRight />
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <span className="w-6" />
                                                    )}
                                                    <Input
                                                        value={param.name}
                                                        onChange={(e) =>
                                                            onUpdate(index, {
                                                                name: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        placeholder="name"
                                                        className="font-mono text-sm"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={param.type}
                                                    onValueChange={(v) =>
                                                        onUpdate(index, {
                                                            type: v,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {PARAMETER_TYPES.map(
                                                            (t) => (
                                                                <SelectItem
                                                                    key={t}
                                                                    value={t}
                                                                >
                                                                    {t}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={
                                                        param.description ?? ''
                                                    }
                                                    onChange={(e) =>
                                                        onUpdate(index, {
                                                            description:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder={
                                                        isStatic
                                                            ? 'Optional'
                                                            : 'City name'
                                                    }
                                                    className="text-sm"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={
                                                        isStatic
                                                            ? 'static'
                                                            : 'ai'
                                                    }
                                                    onValueChange={(v) =>
                                                        onToggleStatic(
                                                            param.name,
                                                            v === 'static',
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ai">
                                                            AI
                                                        </SelectItem>
                                                        <SelectItem value="static">
                                                            Static
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={
                                                        isStatic ||
                                                        location === 'path' ||
                                                        param.required
                                                    }
                                                    disabled={
                                                        isStatic ||
                                                        location === 'path'
                                                    }
                                                    onCheckedChange={(c) =>
                                                        onUpdate(index, {
                                                            required: !!c,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() =>
                                                        onRemove(index)
                                                    }
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {isStatic && param.name ? (
                                            <TableRow key={`${index}-static`}>
                                                <TableCell
                                                    colSpan={6}
                                                    className="bg-muted/30"
                                                >
                                                    <div className="flex items-start gap-2 pl-8">
                                                        <Label className="mt-2 shrink-0 text-xs text-muted-foreground">
                                                            Static value:
                                                        </Label>
                                                        <div className="flex-1">
                                                            <StaticValueInput
                                                                param={param}
                                                                value={
                                                                    staticParameters[
                                                                        param
                                                                            .name
                                                                    ]
                                                                }
                                                                onChange={(v) =>
                                                                    onStaticValue(
                                                                        param.name,
                                                                        v,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                        {nested && isOpen && !isStatic ? (
                                            <TableRow key={`${index}-nested`}>
                                                <TableCell
                                                    colSpan={6}
                                                    className="bg-muted/30"
                                                >
                                                    <div className="space-y-1 pl-8">
                                                        <Label className="text-xs text-muted-foreground">
                                                            {param.type ===
                                                            'array'
                                                                ? 'Array item definition (JSON)'
                                                                : 'Object properties (JSON)'}
                                                        </Label>
                                                        <Textarea
                                                            rows={4}
                                                            className="bg-background font-mono text-xs"
                                                            value={JSON.stringify(
                                                                param.type ===
                                                                    'array'
                                                                    ? (param.items ??
                                                                          {
                                                                              type: 'string',
                                                                          })
                                                                    : (param.properties ??
                                                                          []),
                                                                null,
                                                                2,
                                                            )}
                                                            onChange={(e) => {
                                                                try {
                                                                    const parsed =
                                                                        JSON.parse(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );
                                                                    onUpdate(
                                                                        index,
                                                                        param.type ===
                                                                            'array'
                                                                            ? {
                                                                                  items: parsed,
                                                                              }
                                                                            : {
                                                                                  properties:
                                                                                      parsed,
                                                                              },
                                                                    );
                                                                } catch {
                                                                    /* ignore */
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                    </>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}

interface HttpToolSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agentId: number;
    tool: HttpTool | null;
    onSaved: () => void;
}

export function HttpToolSheet({
    open,
    onOpenChange,
    agentId,
    tool,
    onSaved,
}: HttpToolSheetProps) {
    const [name, setName] = useState(tool?.name ?? '');
    const [description, setDescription] = useState(tool?.description ?? '');
    const [method, setMethod] = useState(tool?.http_method ?? 'GET');
    const [url, setUrl] = useState(tool?.url ?? '');
    const [parameters, setParameters] = useState<HttpToolParameter[]>(
        tool?.parameters ?? [],
    );
    const [staticParameters, setStaticParameters] = useState<
        Record<string, JsonValue>
    >(tool?.static_parameters ?? {});
    const [headers, setHeaders] = useState<HttpToolHeader[]>(
        tool?.headers ?? [],
    );
    const [authType, setAuthType] = useState<string | null>(
        tool?.auth_type ?? null,
    );
    const [authConfig, setAuthConfig] = useState<Record<string, string> | null>(
        tool?.auth_config ?? null,
    );
    const [systemTool, setSystemTool] = useState(tool?.system_tool ?? false);
    const [enabled, setEnabled] = useState(tool?.enabled ?? true);
    const [tab, setTab] = useState('form');
    const [jsonText, setJsonText] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [curlOpen, setCurlOpen] = useState(false);

    function payload() {
        return {
            name,
            description: description || null,
            http_method: method,
            url,
            parameters,
            static_parameters: staticParameters,
            headers,
            auth_type: authType,
            auth_config: authConfig,
            system_tool: systemTool,
            enabled,
        };
    }

    function updateParam(index: number, patch: Partial<HttpToolParameter>) {
        setParameters((ps) => ps.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    }

    function addParam(location: HttpToolParameterLocation) {
        setParameters((ps) => [
            ...ps,
            {
                name: '',
                type: 'string',
                required: location === 'path',
                description: '',
                parameter_type: location,
            },
        ]);
    }

    function removeParam(index: number) {
        const removed = parameters[index];
        setParameters((ps) => ps.filter((_, i) => i !== index));
        if (removed && removed.name in staticParameters) {
            setStaticParameters((s) => {
                const next = { ...s };
                delete next[removed.name];
                return next;
            });
        }
    }

    function toggleStatic(paramName: string, makeStatic: boolean) {
        setStaticParameters((s) => {
            const next = { ...s };
            if (makeStatic) {
                next[paramName] = '';
            } else {
                delete next[paramName];
            }
            return next;
        });
    }

    function handleTabChange(next: string) {
        if (next === 'json') {
            setJsonText(JSON.stringify(payload(), null, 2));
            setJsonError(null);
        }
        setTab(next);
    }

    function handleJsonChange(text: string) {
        setJsonText(text);
        try {
            const p = JSON.parse(text);
            if (typeof p.name === 'string') setName(p.name);
            setDescription(typeof p.description === 'string' ? p.description : '');
            if (typeof p.http_method === 'string') setMethod(p.http_method.toUpperCase());
            if (typeof p.url === 'string') setUrl(p.url);
            if (Array.isArray(p.parameters)) setParameters(p.parameters);
            if (p.static_parameters && typeof p.static_parameters === 'object')
                setStaticParameters(p.static_parameters);
            if (Array.isArray(p.headers))
                setHeaders(
                    p.headers.map((h: Record<string, unknown>) => ({
                        key: String(h.key ?? h.name ?? ''),
                        value: String(h.value ?? ''),
                    })),
                );
            if (typeof p.auth_type === 'string' || p.auth_type === null)
                setAuthType(p.auth_type);
            if (p.auth_config === null || typeof p.auth_config === 'object')
                setAuthConfig(p.auth_config);
            if (typeof p.system_tool === 'boolean') setSystemTool(p.system_tool);
            if (typeof p.enabled === 'boolean') setEnabled(p.enabled);
            setJsonError(null);
        } catch {
            setJsonError('Invalid JSON — fix the syntax to apply changes.');
        }
    }

    function applyCurl(data: ParsedCurl) {
        setName(data.name);
        setMethod(data.method);
        setUrl(data.url);
        setHeaders(data.headers);
        setParameters(data.parameters);
        setStaticParameters(data.staticParameters);
        setTab('form');
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await saveHttpTool({ data: { agentId, id: tool?.id, ...payload() } });
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl">
                <SheetHeader>
                    <div className="flex items-center justify-between gap-2 pr-6">
                        <SheetTitle>
                            {tool ? 'Edit HTTP Tool' : 'Add HTTP Tool'}
                        </SheetTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCurlOpen(true)}
                        >
                            <Terminal />
                            Import cURL
                        </Button>
                    </div>
                    <SheetDescription>
                        Define an HTTP endpoint the agent can call during a
                        conversation.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
                    {error ? (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    ) : null}

                    <Tabs
                        value={tab}
                        onValueChange={handleTabChange}
                        className="flex flex-1 flex-col gap-5"
                    >
                        <TabsList className="w-fit">
                            <TabsTrigger value="form">Form</TabsTrigger>
                            <TabsTrigger value="json">JSON</TabsTrigger>
                        </TabsList>

                        <TabsContent value="form" className="flex flex-col gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="tool_name">Name</Label>
                                <Input
                                    id="tool_name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="lookup_appointment"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tool_description">
                                    Description
                                </Label>
                                <Textarea
                                    id="tool_description"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    rows={2}
                                    placeholder="What does this tool do?"
                                />
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-3">
                                <div className="grid gap-2">
                                    <Label>Method</Label>
                                    <Select
                                        value={method}
                                        onValueChange={setMethod}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {HTTP_METHODS.map((m) => (
                                                <SelectItem key={m} value={m}>
                                                    {m}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="tool_url">URL</Label>
                                    <Input
                                        id="tool_url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://api.example.com/resource"
                                        className="font-mono text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <Label>Parameters</Label>
                                <div className="grid gap-4">
                                    {LOCATIONS.map((loc) => (
                                        <ParameterSection
                                            key={loc.value}
                                            location={loc.value}
                                            title={loc.title}
                                            description={loc.description}
                                            parameters={parameters}
                                            staticParameters={staticParameters}
                                            onAdd={addParam}
                                            onUpdate={updateParam}
                                            onRemove={removeParam}
                                            onToggleStatic={toggleStatic}
                                            onStaticValue={(n, v) =>
                                                setStaticParameters((s) => ({
                                                    ...s,
                                                    [n]: v,
                                                }))
                                            }
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        Headers
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setHeaders((h) => [
                                                    ...h,
                                                    {
                                                        key: 'Authorization',
                                                        value: 'Bearer ',
                                                    },
                                                ])
                                            }
                                        >
                                            <KeyRound />
                                            Add Auth Header
                                        </Button>
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
                                            Add Header
                                        </Button>
                                    </div>
                                </div>
                                {headers.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No headers. Click "Add Header" to add one.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                                            <span className="flex-1">Name</span>
                                            <span className="flex-1">Value</span>
                                            <span className="w-9 shrink-0" />
                                        </div>
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
                                                                          key: e
                                                                              .target
                                                                              .value,
                                                                      }
                                                                    : x,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="Header name"
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
                                                                          value: e
                                                                              .target
                                                                              .value,
                                                                      }
                                                                    : x,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="Value"
                                                    className="bg-background"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() =>
                                                        setHeaders((hs) =>
                                                            hs.filter(
                                                                (_, j) =>
                                                                    j !== i,
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

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label>Authentication</Label>
                                    <Select
                                        value={authType ?? 'none'}
                                        onValueChange={(v) => {
                                            if (v === 'none') {
                                                setAuthType(null);
                                                setAuthConfig(null);
                                            } else {
                                                setAuthType(v);
                                                if (v === 'aws_sigv4' && !authConfig)
                                                    setAuthConfig({
                                                        ...AWS_EMPTY,
                                                    });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                None
                                            </SelectItem>
                                            <SelectItem value="aws_sigv4">
                                                AWS SigV4
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {authType === 'aws_sigv4' && authConfig ? (
                                    <div className="grid gap-3 rounded-md border p-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="grid gap-1">
                                                <Label className="text-xs">
                                                    Region
                                                </Label>
                                                <Input
                                                    value={
                                                        authConfig.region ?? ''
                                                    }
                                                    onChange={(e) =>
                                                        setAuthConfig({
                                                            ...authConfig,
                                                            region: e.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="us-east-1"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">
                                                    Service
                                                </Label>
                                                <Input
                                                    value={
                                                        authConfig.service ?? ''
                                                    }
                                                    onChange={(e) =>
                                                        setAuthConfig({
                                                            ...authConfig,
                                                            service: e.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="sms-voice"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">
                                                Access Key
                                            </Label>
                                            <Input
                                                value={
                                                    authConfig.access_key ?? ''
                                                }
                                                onChange={(e) =>
                                                    setAuthConfig({
                                                        ...authConfig,
                                                        access_key:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="AKIA…"
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">
                                                Secret Key
                                            </Label>
                                            <Input
                                                type="password"
                                                value={
                                                    authConfig.secret_key ?? ''
                                                }
                                                onChange={(e) =>
                                                    setAuthConfig({
                                                        ...authConfig,
                                                        secret_key:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="system_tool">
                                        System Tool
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Mark this as a system-provided tool.
                                    </p>
                                </div>
                                <Switch
                                    id="system_tool"
                                    checked={systemTool}
                                    onCheckedChange={setSystemTool}
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-foreground">
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={setEnabled}
                                />
                                Enabled
                            </label>
                        </TabsContent>

                        <TabsContent value="json" className="flex flex-col gap-3">
                            <Textarea
                                value={jsonText}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                rows={20}
                                className="font-mono text-xs"
                            />
                            {jsonError ? (
                                <div className="text-sm text-destructive">
                                    {jsonError}
                                </div>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                                Paste or edit the full tool JSON. Changes are
                                reflected in the Form tab.
                            </p>
                        </TabsContent>
                    </Tabs>

                    <SheetFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || !!jsonError}
                        >
                            {submitting ? 'Saving…' : 'Save tool'}
                        </Button>
                    </SheetFooter>
                </form>

                <CurlImportDialog
                    open={curlOpen}
                    onOpenChange={setCurlOpen}
                    onImport={applyCurl}
                />
            </SheetContent>
        </Sheet>
    );
}
