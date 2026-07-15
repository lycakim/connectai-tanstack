import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { AgentForm } from '@/components/agents/agent-form';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Route = createFileRoute('/_app/agents/new')({
    component: NewAgentPage,
});

function NewAgentPage() {
    const router = useRouter();

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold text-foreground">
                        New Agent
                    </h1>
                    <Link
                        to="/"
                        className={buttonVariants({
                            variant: 'ghost',
                            size: 'sm',
                        })}
                    >
                        <ArrowLeft />
                        Cancel
                    </Link>
                </div>

                <Card>
                    <CardContent>
                        <AgentForm onCancel={() => router.navigate({ to: '/' })} />
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
