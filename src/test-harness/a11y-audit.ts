/**
 * PUBLIC-080 automated accessibility crawl route map.
 * Reuses the same 23 static build routes as PUBLIC-300 no-JS audit.
 */

export {
  NO_JS_AUDIT_ROUTE_COUNT as A11Y_AUDIT_ROUTE_COUNT,
  NO_JS_AUDIT_ROUTES as A11Y_AUDIT_ROUTES,
  type NoJsAuditRoute as A11yAuditRoute,
  type NoJsAuditProfile as A11yAuditProfile,
} from './no-js-audit'

/** WCAG 2.2 AA axe tag set for automated route scans. */
export const A11Y_AXE_WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
] as const
