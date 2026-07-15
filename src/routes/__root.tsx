import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import appCss from '@/styles.css?url';

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'ConnectAI Portal' },
        ],
        links: [
            { rel: 'stylesheet', href: appCss },
            { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
            { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
            { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        ],
    }),
    component: RootComponent,
});

function RootComponent() {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Toaster richColors position="top-right" />
                <Scripts />
            </body>
        </html>
    );
}
