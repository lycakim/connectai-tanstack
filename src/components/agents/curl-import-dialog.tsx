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
import { Textarea } from '@/components/ui/textarea';
import type {
    HttpToolHeader,
    HttpToolParameter,
    JsonValue,
} from '@/types/scheduled-call';

export interface ParsedCurl {
    name: string;
    method: string;
    url: string;
    headers: HttpToolHeader[];
    parameters: HttpToolParameter[];
    staticParameters: Record<string, JsonValue>;
}

/** Splits a shell-ish command into tokens, respecting quotes and line continuations. */
function tokenize(input: string): string[] {
    const cleaned = input.replace(/\\\r?\n/g, ' ');
    const tokens: string[] = [];
    let i = 0;
    while (i < cleaned.length) {
        const ch = cleaned[i];
        if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
            i++;
            continue;
        }
        if (ch === "'" || ch === '"') {
            const quote = ch;
            let value = '';
            i++;
            while (i < cleaned.length && cleaned[i] !== quote) {
                value += cleaned[i];
                i++;
            }
            i++;
            tokens.push(value);
            continue;
        }
        let value = '';
        while (
            i < cleaned.length &&
            !/\s/.test(cleaned[i]!) &&
            cleaned[i] !== "'" &&
            cleaned[i] !== '"'
        ) {
            value += cleaned[i];
            i++;
        }
        tokens.push(value);
    }
    return tokens;
}

function inferType(value: JsonValue): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (value !== null && typeof value === 'object') return 'object';
    return 'string';
}

function parseCurl(input: string): ParsedCurl | null {
    const tokens = tokenize(input.trim());
    if (tokens.length === 0 || tokens[0] !== 'curl') {
        // tolerate missing leading `curl`
        if (tokens[0]?.startsWith('http')) {
            tokens.unshift('curl');
        } else {
            return null;
        }
    }

    let method = '';
    let url = '';
    const headers: HttpToolHeader[] = [];
    let body = '';

    for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i]!;
        if (t === '-X' || t === '--request') {
            method = (tokens[++i] ?? '').toUpperCase();
        } else if (t === '-H' || t === '--header') {
            const h = tokens[++i] ?? '';
            const idx = h.indexOf(':');
            if (idx > 0) {
                headers.push({
                    key: h.slice(0, idx).trim(),
                    value: h.slice(idx + 1).trim(),
                });
            }
        } else if (
            t === '-d' ||
            t === '--data' ||
            t === '--data-raw' ||
            t === '--data-binary'
        ) {
            body = tokens[++i] ?? '';
        } else if (t === '--url') {
            url = tokens[++i] ?? '';
        } else if (t === '-u' || t === '--user') {
            i++; // skip credentials
        } else if (!t.startsWith('-') && !url && /^https?:\/\//.test(t)) {
            url = t;
        }
    }

    if (!url) {
        return null;
    }
    if (!method) {
        method = body ? 'POST' : 'GET';
    }

    const parameters: HttpToolParameter[] = [];
    const staticParameters: Record<string, JsonValue> = {};

    // Body params (JSON or form-encoded) → body parameters with static values.
    if (body) {
        let parsedBody: Record<string, JsonValue> | null = null;
        try {
            const j = JSON.parse(body);
            if (j && typeof j === 'object' && !Array.isArray(j)) {
                parsedBody = j as Record<string, JsonValue>;
            }
        } catch {
            if (body.includes('=')) {
                parsedBody = {};
                for (const pair of body.split('&')) {
                    const [k, v = ''] = pair.split('=');
                    if (k) {
                        parsedBody[decodeURIComponent(k)] = decodeURIComponent(v);
                    }
                }
            }
        }
        if (parsedBody) {
            for (const [key, value] of Object.entries(parsedBody)) {
                parameters.push({
                    name: key,
                    type: inferType(value),
                    required: true,
                    description: '',
                    parameter_type: 'body',
                });
                staticParameters[key] = value;
            }
        }
    }

    // Query params from the URL → query parameters with static values.
    let name = 'imported_tool';
    try {
        const u = new URL(url);
        u.searchParams.forEach((value, key) => {
            parameters.push({
                name: key,
                type: 'string',
                required: true,
                description: '',
                parameter_type: 'query',
            });
            staticParameters[key] = value;
        });
        url = `${u.origin}${u.pathname}`;
        const last = u.pathname.split('/').filter(Boolean).pop();
        if (last) {
            name = last.replace(/[^a-z0-9_]/gi, '_');
        }
    } catch {
        /* keep default name */
    }

    return { name, method, url, headers, parameters, staticParameters };
}

export function CurlImportDialog({
    open,
    onOpenChange,
    onImport,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onImport: (data: ParsedCurl) => void;
}) {
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);

    function handleImport() {
        const parsed = parseCurl(text);
        if (!parsed) {
            setError('Could not parse the cURL command. Check it includes a URL.');
            return;
        }
        onImport(parsed);
        setText('');
        setError(null);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Import from cURL</DialogTitle>
                    <DialogDescription>
                        Paste a cURL command to prefill the tool. Body and query
                        values are imported as static parameters.
                    </DialogDescription>
                </DialogHeader>
                {error ? (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={8}
                    className="font-mono text-xs"
                    placeholder={`curl -X POST https://api.example.com/appointments \\\n  -H "Authorization: Bearer TOKEN" \\\n  -d '{"phone":"5125550142"}'`}
                />
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleImport} disabled={!text.trim()}>
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
