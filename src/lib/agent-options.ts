/**
 * Static option lists for the Agent form. A trimmed version of the portal's
 * voice/timezone catalogs — enough to demonstrate the cascading provider →
 * model → voice selects and a timezone picker.
 */

export const VOICE_PROVIDERS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'gemini', label: 'Gemini' },
] as const;

export interface VoiceModel {
    provider: string;
    value: string;
    label: string;
}

export const VOICE_MODELS: VoiceModel[] = [
    { provider: 'openai', value: 'gpt-4o-realtime', label: 'GPT-4o Realtime' },
    {
        provider: 'openai',
        value: 'gpt-4o-mini-realtime',
        label: 'GPT-4o mini Realtime',
    },
    { provider: 'gemini', value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    {
        provider: 'gemini',
        value: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
    },
];

export interface VoiceOption {
    provider: string;
    value: string;
    label: string;
}

export const VOICES: VoiceOption[] = [
    { provider: 'openai', value: 'alloy', label: 'Alloy' },
    { provider: 'openai', value: 'echo', label: 'Echo' },
    { provider: 'openai', value: 'shimmer', label: 'Shimmer' },
    { provider: 'gemini', value: 'Puck', label: 'Puck' },
    { provider: 'gemini', value: 'Charon', label: 'Charon' },
    { provider: 'gemini', value: 'Kore', label: 'Kore' },
];

export const TIMEZONES = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Asia/Manila',
    'Asia/Tokyo',
    'Australia/Sydney',
    'UTC',
] as const;

export const SYSTEM_PROMPT_PLACEHOLDERS: { code: string; description: string }[] =
    [
        { code: '{{NmsAni}}', description: 'Caller extension or phone number' },
        { code: '{{CallerNumber}}', description: 'Sanitized caller number' },
        { code: '{{NmsDnis}}', description: 'Dialed number' },
        { code: '{{DialedNumber}}', description: 'Sanitized dialed number' },
        { code: '{{AccountDomain}}', description: 'ConnectWare domain' },
        { code: '{{AccountUser}}', description: 'ConnectWare extension' },
        { code: '{{OrigCallID}}', description: 'Original call ID' },
    ];
