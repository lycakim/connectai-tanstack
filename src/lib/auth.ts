import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema,
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
    },
    // Must be the last plugin — handles Set-Cookie for TanStack Start.
    plugins: [tanstackStartCookies()],
});
