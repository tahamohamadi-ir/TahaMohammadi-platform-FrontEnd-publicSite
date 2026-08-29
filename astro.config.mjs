import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.PUBLIC_SITE_URL ?? 'http://127.0.0.1:4321';
const apiProxyTarget =
  process.env.PUBLIC_API_PROXY_TARGET ?? 'http://127.0.0.1:8000';

// https://astro.build/config
export default defineConfig({
  site,
  i18n: {
    defaultLocale: 'fa',
    locales: ['fa', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  env: {
    schema: {
      PUBLIC_API_BASE_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        default: '',
      }),
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'http://127.0.0.1:4321',
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
        '/health': { target: apiProxyTarget, changeOrigin: true },
        '/media': { target: apiProxyTarget, changeOrigin: true },
      },
    },
  },
});
