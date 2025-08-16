import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from "node:url";
import path from 'path';
import { readdirSync, rmdirSync, rmSync } from 'fs';

const externalLibs = [
    'vue',
    'vuetify',
    'vuetify/components',
    'vuetify/directives',
    'axios',
    'vue-toastification'
]

const cleanAssetsPlugin = () => ({
    name: 'clean-assets',
    closeBundle() {
        const cleanDirectory = (dirPath: string, patterns: RegExp[]) => {
            try {
                const files = readdirSync(dirPath);
                files.forEach(file => {
                    if (patterns.some(pattern => pattern.test(file))) {
                        rmSync(path.join(dirPath, file));
                    }
                });
            } catch (e: any) {
                console.error(`Ошибка при очистке ${dirPath}:`, e.message);
            }
        };

        const removeEmptyDir = (dirPath: string) => {
            try {
                const files = readdirSync(dirPath);
                if (files.length === 0) {
                    rmdirSync(dirPath);
                }
            } catch (e: any) {
                console.error(`Ошибка при проверке папки ${dirPath}:`, e.message);
            }
        };

        try {
            const assetsDir = path.join(process.cwd(), 'dist', 'assets');
            cleanDirectory(assetsDir, [
                /^materialdesignicons\..*\.css$/,
                /^vue\.global\..*\.js$/,
                /^vuetify\.min.*\.css$/,
                /^vuetify\.min.*\.js$/
            ]);

            const fontsDir = path.join(process.cwd(), 'dist', 'fonts');
            cleanDirectory(fontsDir, [
                /^materialdesignicons.*\.ttf$/,
                /^materialdesignicons.*\.woff$/,
                /^materialdesignicons.*\.woff2$/
            ]);

            removeEmptyDir(assetsDir);
            removeEmptyDir(fontsDir);

        } catch (e: any) {
            console.error('Ошибка при очистке:', e);
        }
    }
});
export default defineConfig(({ command }) => {
    const isDev = command === 'serve';

    return {
        plugins: [vue(), cleanAssetsPlugin()],
        resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
        ...(isDev
            ? {}
            : {
                build: {
                    lib: {
                        entry: './dev/main.ts',
                        name: 'AppModule',
                        formats: ['iife'],
                        fileName: () => 'dev-b24vue.js',
                    },
                    rollupOptions: {
                        external: externalLibs,
                        output: {
                            globals: {
                                vue: 'Vue',
                                vuetify: 'Vuetify',
                                'vuetify/components': 'Vuetify.components',
                                'vuetify/directives': 'Vuetify.directives',
                                axios: 'axios',
                                'vue-toastification': 'Toast',
                            },
                        },
                    },
                    cssCodeSplit: false,
                },
            }),
    };
});
