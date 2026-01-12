import { defineConfig } from 'vite';

export default defineConfig({
    root: 'public',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: 'public/index.html',
                guide: 'public/guide.html',
                devlog: 'public/devlog.html'
            },
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return 'css/[name]-[hash][extname]';
                    }
                    // Add hash to ALL assets for cache busting
                    return 'assets/[name]-[hash][extname]';
                },
                chunkFileNames: 'js/[name]-[hash].js',
                entryFileNames: 'js/[name]-[hash].js',
            }
        }
    }
});

