import { createRouter, Link } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

function NotFound() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">
                404 — Page not found
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
                We couldn&apos;t find that page
            </h1>
            <Link
                to="/"
                className="mt-2 text-sm font-medium text-foreground underline underline-offset-4"
            >
                Back to Agents
            </Link>
        </div>
    );
}

export function getRouter() {
    const router = createRouter({
        routeTree,
        scrollRestoration: true,
        defaultPreload: 'intent',
        defaultNotFoundComponent: NotFound,
    });

    return router;
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
