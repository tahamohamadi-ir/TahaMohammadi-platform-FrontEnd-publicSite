import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, envField } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'
import designAtlasIntegration from './src/integrations/design-atlas.mjs'
import pagefindIntegration from './src/integrations/pagefind.mjs'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const publicMediaRoot = path.join(projectRoot, 'public', 'media')

function localPromotedMediaPath(urlPath) {
  if (!urlPath?.startsWith('/media/')) return null
  const relative = urlPath.replace(/^\//, '').split('/').join(path.sep)
  const candidate = path.join(projectRoot, 'public', relative)
  if (!candidate.startsWith(publicMediaRoot)) return null
  try {
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      ? urlPath
      : null
  } catch {
    return null
  }
}

const site = process.env.PUBLIC_SITE_URL ?? 'http://127.0.0.1:4321'
const designAtlasEnabled = process.env.DESIGN_ATLAS === '1'
const apiProxyTarget =
  process.env.PUBLIC_API_PROXY_TARGET ?? 'http://127.0.0.1:8000'

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [
    pagefindIntegration(),
    sitemap({
      i18n: {
        defaultLocale: 'fa',
        locales: {
          fa: 'fa',
          en: 'en',
        },
      },
      filter: (page) => {
        const pathname = new URL(page).pathname
        return (
          !pathname.startsWith('/pagefind/') &&
          !pathname.startsWith('/_design/') &&
          !pathname.includes('/creative/empty-shell')
        )
      },
    }),
    ...(designAtlasEnabled ? [designAtlasIntegration()] : []),
  ],
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
    define: {
      __TM_DESIGN_ATLAS__: JSON.stringify(designAtlasEnabled),
    },
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
        '/health': { target: apiProxyTarget, changeOrigin: true },
        '/media': {
          target: apiProxyTarget,
          changeOrigin: true,
          bypass(req) {
            return localPromotedMediaPath(req.url) ?? undefined
          },
        },
      },
    },
  },
})
