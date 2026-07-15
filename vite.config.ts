import { fileURLToPath } from 'node:url';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    plugins: [
        tailwindcss(),
        tanstackStart(),
        // Nitro provides the deployment layer; it auto-detects Vercel at build
        // time (VERCEL env) and emits the correct output.
        nitro(),
        // react's vite plugin must come after start's vite plugin
        viteReact(),
    ],
});
