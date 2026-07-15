import { useRouter } from '@tanstack/react-router';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    SYSTEM_PROMPT_PLACEHOLDERS,
    TIMEZONES,
    VOICE_MODELS,
    VOICE_PROVIDERS,
    VOICES,
} from '@/lib/agent-options';
import { createAgent, updateAgent } from '@/server/agents';
import type { Agent } from '@/types/scheduled-call';

interface AgentFormProps {
    /** Provide an agent to edit; omit for the create flow. */
    agent?: Agent;
    /** Called when the create flow is cancelled. */
    onCancel?: () => void;
}

export function AgentForm({ agent, onCancel }: AgentFormProps) {
    const router = useRouter();
    const isEditing = Boolean(agent);

    const [name, setName] = useState(agent?.name ?? '');
    const [production, setProduction] = useState(agent?.production ?? false);
    const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '');
    const [welcomeMessage, setWelcomeMessage] = useState(
        agent?.welcome_message ?? '',
    );
    const [timezone, setTimezone] = useState(agent?.timezone ?? '');
    const [voiceProvider, setVoiceProvider] = useState(
        agent?.voice_provider ?? 'openai',
    );
    const [voiceModel, setVoiceModel] = useState(agent?.voice_model ?? '');
    const [voice, setVoice] = useState(agent?.voice ?? '');

    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const models = VOICE_MODELS.filter((m) => m.provider === voiceProvider);
    const voices = VOICES.filter((v) => v.provider === voiceProvider);

    function markDirty() {
        setSaved(false);
    }

    function handleProviderChange(next: string) {
        setVoiceProvider(next);
        setVoiceModel(
            VOICE_MODELS.find((m) => m.provider === next)?.value ?? '',
        );
        setVoice(VOICES.find((v) => v.provider === next)?.value ?? '');
        markDirty();
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSaved(false);
        setSubmitting(true);

        try {
            if (isEditing && agent) {
                await updateAgent({
                    data: {
                        agentId: agent.id,
                        name,
                        production,
                        system_prompt: systemPrompt,
                        welcome_message: welcomeMessage,
                        timezone: timezone || null,
                        voice_provider: voiceProvider,
                        voice_model: voiceModel || null,
                        voice: voice || null,
                    },
                });
                await router.invalidate();
                setSaved(true);
            } else {
                const created = await createAgent({
                    data: {
                        name,
                        system_prompt: systemPrompt,
                        welcome_message: welcomeMessage,
                        timezone: timezone || null,
                        voice_provider: voiceProvider,
                        voice_model: voiceModel || null,
                        voice: voice || null,
                    },
                });
                await router.invalidate();
                router.navigate({
                    to: '/agents/$agentId',
                    params: { agentId: String(created.id) },
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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

            {isEditing ? (
                <div className="grid gap-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="production">Production</Label>
                            <p className="text-sm text-muted-foreground">
                                This field is all about identifying which agent
                                is on production and which is not.
                            </p>
                        </div>
                        <Switch
                            id="production"
                            checked={production}
                            onCheckedChange={(checked) => {
                                setProduction(checked);
                                markDirty();
                            }}
                        />
                    </div>
                </div>
            ) : null}

            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        markDirty();
                    }}
                    required
                    autoFocus
                />
            </div>

            <div className="grid gap-2">
                <div className="flex items-center gap-2">
                    <Label htmlFor="system_prompt">System Prompt</Label>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="size-4 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="w-80">
                            <div className="space-y-2">
                                <p className="font-semibold">
                                    Available placeholders:
                                </p>
                                <div className="space-y-1">
                                    {SYSTEM_PROMPT_PLACEHOLDERS.map((p) => (
                                        <div key={p.code} className="text-xs">
                                            <code>{p.code}</code> -{' '}
                                            {p.description}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <Textarea
                    id="system_prompt"
                    value={systemPrompt}
                    onChange={(e) => {
                        setSystemPrompt(e.target.value);
                        markDirty();
                    }}
                    rows={10}
                    className="font-mono text-sm"
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="welcome_message">Welcome Message</Label>
                <Textarea
                    id="welcome_message"
                    value={welcomeMessage}
                    onChange={(e) => {
                        setWelcomeMessage(e.target.value);
                        markDirty();
                    }}
                    rows={4}
                    placeholder="Enter a welcome message for your agent..."
                />
                <p className="text-sm text-muted-foreground">
                    This message will play as soon as the call connects.
                </p>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                    value={timezone}
                    onValueChange={(value) => {
                        setTimezone(value);
                        markDirty();
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a timezone" />
                    </SelectTrigger>
                    <SelectContent>
                        {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                                {tz}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Select the timezone for this agent.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="voice_provider">Voice AI Provider</Label>
                    <Select
                        value={voiceProvider}
                        onValueChange={handleProviderChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                            {VOICE_PROVIDERS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="voice_model">Voice AI Model</Label>
                    <Select
                        value={voiceModel}
                        onValueChange={(value) => {
                            setVoiceModel(value);
                            markDirty();
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                            {models.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="voice">Voice</Label>
                    <Select
                        value={voice}
                        onValueChange={(value) => {
                            setVoice(value);
                            markDirty();
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                            {voices.map((v) => (
                                <SelectItem key={v.value} value={v.value}>
                                    {v.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting
                        ? isEditing
                            ? 'Saving…'
                            : 'Creating…'
                        : isEditing
                          ? 'Save'
                          : 'Create Agent'}
                </Button>
                {!isEditing && onCancel ? (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                ) : null}
            </div>
        </form>
    );
}
