import { Link, useRouter } from '@tanstack/react-router';
import { Bot, KeyRound, LogOut } from 'lucide-react';
import type { ComponentType } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

interface NavItem {
    title: string;
    to: string;
    icon: ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
    {
        title: 'Agents',
        to: '/',
        icon: Bot,
    },
    {
        title: 'API Keys',
        to: '/api-keys',
        icon: KeyRound,
    },
];

interface SidebarUser {
    name: string;
    email: string;
}

function initials(name: string, email: string): string {
    const source = name?.trim() || email;
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

export function AppSidebar({ user }: { user: SidebarUser }) {
    const router = useRouter();

    async function handleSignOut() {
        await signOut();
        await router.invalidate();
        router.navigate({ to: '/login' });
    }

    return (
        <aside className="flex w-64 shrink-0 flex-col gap-2 bg-sidebar text-sidebar-foreground">
            <div className="p-3">
                <Link
                    to="/"
                    className="flex h-12 items-center gap-2 rounded-lg px-2 hover:bg-sidebar-accent"
                >
                    <AppLogo className="h-9 w-auto" />
                </Link>
            </div>

            <nav className="flex-1 space-y-1 px-3">
                {mainNavItems.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        activeOptions={{ exact: item.to === '/' }}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                        activeProps={{
                            className:
                                'bg-sidebar-accent text-sidebar-accent-foreground',
                        }}
                    >
                        <item.icon className="size-4" />
                        {item.title}
                    </Link>
                ))}
            </nav>

            <div className="border-t border-sidebar-border p-3">
                <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                        {initials(user.name, user.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                            {user.name}
                        </p>
                        <p className="truncate text-xs text-sidebar-foreground/60">
                            {user.email}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        onClick={handleSignOut}
                        title="Sign out"
                    >
                        <LogOut />
                    </Button>
                </div>
            </div>
        </aside>
    );
}
