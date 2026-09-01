/** @typedef {import('astro').AstroIntegration} AstroIntegration */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES = ['en', 'fa'];

/** @returns {AstroIntegration} */
export default function pagefindIntegration() {
  return {
    name: 'pagefind',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        let createIndex;

        try {
          ({ createIndex } = await import('pagefind'));
        } catch (error) {
          logger.error(
            `Pagefind is not installed: ${error instanceof Error ? error.message : String(error)}`,
          );
          return;
        }

        for (const locale of LOCALES) {
          const { index, errors: createErrors } = await createIndex({});
          if (!index) {
            logger.error(`Pagefind failed to create index for ${locale}`);
            createErrors.forEach((message) => logger.error(message));
            continue;
          }

          const { page_count, errors: addErrors } = await index.addDirectory({
            path: outDir,
            glob: `**/${locale}/**`,
          });
          if (addErrors.length) {
            logger.error(`Pagefind failed to index ${locale} HTML`);
            addErrors.forEach((message) => logger.error(message));
            continue;
          }

          const outputPath = path.join(outDir, 'pagefind', locale);
          const { errors: writeErrors } = await index.writeFiles({ outputPath });
          if (writeErrors.length) {
            logger.error(`Pagefind failed to write ${locale} index files`);
            writeErrors.forEach((message) => logger.error(message));
            continue;
          }

          if (!fs.existsSync(outputPath)) {
            logger.error(`Pagefind index directory was not created for ${locale}`);
            continue;
          }

          logger.info(`Pagefind indexed ${page_count} ${locale} pages into ${outputPath}`);
        }
      },
    },
  };
}
