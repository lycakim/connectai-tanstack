import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppSidebar } from '@/components/app-sidebar';
import { getSession } from '@/lib/auth.functions';

export const Route = createFileRoute('/_app')({
    beforeLoad: async () => {
        const session = await getSession();
        if (!session) {
            throw redirect({ to: '/login' });
        }
        return { user: session.user };
    },
    component: AppLayout,
});

function AppLayout() {
    const { user } = Route.useRouteContext();

    return (
        <div className="flex h-svh w-full overflow-hidden bg-sidebar">
            <AppSidebar user={user} />
            <main className="flex-1 overflow-y-auto p-2">
                <div className="min-h-full rounded-xl border bg-background p-6 shadow-sm sm:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
