import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RESPONSIVE_MATRIX_WIDTHS } from './test-harness/responsive-matrix-widths';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checklistPath = path.join(repositoryRoot, 'docs', 'quality', 'PUBLIC-280-RESPONSIVE-MATRIX-EVIDENCE.md');
const e2ePath = path.join(repositoryRoot, 'tests', 'e2e', 'public-280-responsive-matrix.visual.e2e.ts');
const widthsPath = path.join(repositoryRoot, 'src', 'test-harness', 'responsive-matrix-widths.ts');

describe('PUBLIC-280 responsive matrix scaffold', () => {
  it('defines the six-width contract (320–1440 CSS px)', () => {
    expect(RESPONSIVE_MATRIX_WIDTHS).toEqual([320, 390, 768, 1024, 1280, 1440]);
    expect(existsSync(widthsPath)).toBe(true);
  });

  it('ships checklist and Playwright @visual scaffold for PF-01 at all widths', () => {
    expect(existsSync(checklistPath)).toBe(true);
    expect(existsSync(e2ePath)).toBe(true);

    const checklist = readFileSync(checklistPath, 'utf8');
    const source = readFileSync(e2ePath, 'utf8');

    for (const width of RESPONSIVE_MATRIX_WIDTHS) {
      expect(checklist).toContain(String(width));
    }

    expect(source).toContain('RESPONSIVE_MATRIX_WIDTHS');
    expect(checklist).toContain('PUBLIC-270');
    expect(checklist).toContain('does **not** close `PUBLIC-190`');
    expect(source).toContain('@visual');
    expect(source).toContain('PUBLIC-280');
  });
});
