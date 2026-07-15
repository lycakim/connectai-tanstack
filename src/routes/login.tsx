import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp } from '@/lib/auth-client';
import { getSession } from '@/lib/auth.functions';

export const Route = createFileRoute('/login')({
    beforeLoad: async () => {
        const session = await getSession();
        if (session) {
            throw redirect({ to: '/' });
        }
    },
    component: LoginPage,
});

function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isSignIn = mode === 'sign-in';

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);

        const result = isSignIn
            ? await signIn.email({ email, password })
            : await signUp.email({ email, password, name });

        setSubmitting(false);

        if (result.error) {
            setError(result.error.message ?? 'Authentication failed.');
            return;
        }

        await router.invalidate();
        router.navigate({ to: '/' });
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <div className="mb-1 flex items-center justify-center">
                            <AppLogo className="h-10 w-auto" />
                        </div>
                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium">
                                {isSignIn
                                    ? 'Log in to your account'
                                    : 'Create your account'}
                            </h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {isSignIn
                                    ? 'Enter your email and password below to log in'
                                    : 'Enter your details below to get started'}
                            </p>
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    ) : null}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {!isSignIn ? (
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Full name"
                                    required
                                />
                            </div>
                        ) : null}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                                autoComplete="email"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                autoComplete={
                                    isSignIn
                                        ? 'current-password'
                                        : 'new-password'
                                }
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="mt-2 w-full"
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Please wait…'
                                : isSignIn
                                  ? 'Log in'
                                  : 'Create account'}
                        </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
                        {isSignIn ? (
                            <>
                                Don&apos;t have an account?{' '}
                                <button
                                    type="button"
                                    className="font-medium text-foreground underline underline-offset-4"
                                    onClick={() => {
                                        setMode('sign-up');
                                        setError(null);
                                    }}
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    className="font-medium text-foreground underline underline-offset-4"
                                    onClick={() => {
                                        setMode('sign-in');
                                        setError(null);
                                    }}
                                >
                                    Log in
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
