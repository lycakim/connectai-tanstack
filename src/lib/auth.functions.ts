import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';

/** Returns the current session or null. Safe to call from beforeLoad/loaders. */
export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
    const headers = getRequestHeaders();
    return auth.api.getSession({ headers });
});

/** Returns the session or throws Unauthorized. Use to guard mutations. */
export const ensureSession = createServerFn({ method: 'GET' }).handler(
    async () => {
        const headers = getRequestHeaders();
        const session = await auth.api.getSession({ headers });

        if (!session) {
            throw new Error('Unauthorized');
        }

        return session;
    },
);
