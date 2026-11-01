/** @typedef {import('astro').AstroIntegration} AstroIntegration */

/** @returns {AstroIntegration} */
export default function designAtlasIntegration() {
  return {
    name: 'design-atlas',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (process.env.DESIGN_ATLAS !== '1') return

        injectRoute({
          pattern: '/_design',
          entrypoint: new URL('../atlas/AtlasRoute.astro', import.meta.url),
        })
      },
    },
  }
}
