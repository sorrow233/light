import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;

                    if (
                        id.includes('/react/') ||
                        id.includes('/react-dom/') ||
                        id.includes('/react-router-dom/') ||
                        id.includes('/scheduler/')
                    ) {
                        return 'react-vendor';
                    }

                    if (
                        id.includes('/firebase/analytics') ||
                        id.includes('/@firebase/analytics')
                    ) {
                        return 'firebase-analytics-vendor';
                    }

                    if (
                        id.includes('/firebase/firestore') ||
                        id.includes('/@firebase/firestore')
                    ) {
                        return 'firebase-firestore-vendor';
                    }

                    if (
                        id.includes('/firebase/auth') ||
                        id.includes('/@firebase/auth')
                    ) {
                        return 'firebase-auth-vendor';
                    }

                    if (
                        id.includes('/firebase/app') ||
                        id.includes('/@firebase/app') ||
                        id.includes('/@firebase/component') ||
                        id.includes('/@firebase/util') ||
                        id.includes('/@firebase/')
                    ) {
                        return 'firebase-core-vendor';
                    }

                    if (
                        id.includes('/yjs/') ||
                        id.includes('/y-indexeddb/') ||
                        id.includes('/lib0/')
                    ) {
                        return 'sync-vendor';
                    }

                    if (id.includes('/date-fns/')) {
                        return 'date-vendor';
                    }

                    if (
                        id.includes('/framer-motion/') ||
                        id.includes('/lucide-react/') ||
                        id.includes('/sonner/')
                    ) {
                        return 'ui-vendor';
                    }

                    if (id.includes('/uuid/')) {
                        return 'utils-vendor';
                    }

                    return 'vendor';
                },
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
