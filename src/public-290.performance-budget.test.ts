import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  LOCALE_FONT_PRELOADS,
  PERFORMANCE_BUDGET,
  PERFORMANCE_PROBE_ROUTES,
} from './test-harness/performance-budget';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checklistPath = path.join(repositoryRoot, 'docs', 'quality', 'PUBLIC-290-PERFORMANCE-BUDGET.md');
const e2ePath = path.join(repositoryRoot, 'tests', 'e2e', 'public-290-performance.e2e.ts');
const baseLayoutPath = path.join(repositoryRoot, 'src', 'layouts', 'BaseLayout.astro');
const fontsCssPath = path.join(repositoryRoot, 'src', 'styles', 'fonts.css');
const budgetHarnessPath = path.join(repositoryRoot, 'src', 'test-harness', 'performance-budget.ts');

describe('PUBLIC-290 performance budget scaffold', () => {
  it('mirrors central LCP and CLS thresholds', () => {
    expect(PERFORMANCE_BUDGET.lcpMs).toBe(2500);
    expect(PERFORMANCE_BUDGET.cls).toBe(0.1);
    expect(PERFORMANCE_BUDGET.inpMs).toBe(200);
    expect(existsSync(budgetHarnessPath)).toBe(true);
  });

  it('ships checklist, Playwright @performance probes, and locale font preloads', () => {
    expect(existsSync(checklistPath)).toBe(true);
    expect(existsSync(e2ePath)).toBe(true);
    expect(existsSync(baseLayoutPath)).toBe(true);
    expect(existsSync(fontsCssPath)).toBe(true);

    const checklist = readFileSync(checklistPath, 'utf8');
    const e2eSource = readFileSync(e2ePath, 'utf8');
    const layoutSource = readFileSync(baseLayoutPath, 'utf8');
    const fontsCss = readFileSync(fontsCssPath, 'utf8');

    for (const route of PERFORMANCE_PROBE_ROUTES) {
      expect(checklist).toContain(route.path);
    }

    expect(e2eSource).toContain('PERFORMANCE_PROBE_ROUTES');
    expect(e2eSource).toContain('route.path');

    for (const locale of ['en', 'fa'] as const) {
      for (const href of LOCALE_FONT_PRELOADS[locale]) {
        expect(layoutSource).toContain(href);
        expect(checklist).toContain(href);
      }
    }

    expect(e2eSource).toContain('@performance');
    expect(e2eSource).toContain('PUBLIC-290');
    expect(e2eSource).toContain('inpMs');
    expect(e2eSource).toContain('data-theme-toggle');
    expect(checklist).toContain('PERFORMANCE-BUDGET.md');
    expect(checklist).toContain('local static preview');
    expect(checklist).toContain('does **not** close `PUBLIC-190`');
    expect(fontsCss).toContain('font-display: swap');
  });
});
