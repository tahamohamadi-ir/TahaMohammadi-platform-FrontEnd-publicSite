import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const publicMediaRoot = path.join(projectRoot, 'public', 'media');

function localPromotedMediaPath(urlPath) {
  if (!urlPath?.startsWith('/media/')) return null;
  const relative = urlPath.replace(/^\//, '').split('/').join(path.sep);
  const candidate = path.join(projectRoot, 'public', relative);
  if (!candidate.startsWith(publicMediaRoot)) return null;
  try {
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? urlPath : null;
  } catch {
    return null;
  }
}

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
        '/media': {
          target: apiProxyTarget,
          changeOrigin: true,
          bypass(req) {
            return localPromotedMediaPath(req.url) ?? undefined;
          },
        },
      },
    },
  },
});
