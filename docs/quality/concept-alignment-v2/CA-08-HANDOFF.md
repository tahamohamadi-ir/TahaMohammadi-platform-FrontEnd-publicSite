# CA-08 Handoff — Shared shell fidelity

Task ID: CA-08
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-08`; no new branch or
worktree was created — work was done in the current checkout while
preserving unrelated dirty files listed below)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Resulting state: **uncommitted** — no commit, push, merge, or deploy was
performed. Changes are exactly the allowlisted paths below.
Stop marker: **`CA-08_HANDOFF_READY`** (no related-baseline deviations;
one pre-existing observation for the coordinator in §7)

## 1. Dependencies

`execution-tasks.json` (v2.1.0) records CA-08 with `depends_on: [CA-03]`.

- CA-03 was implemented in this same checkout before CA-08: integrated
  identity/graph hero (`CA-03-HANDOFF.md`, `HANDOFF_READY`, uncommitted,
  same base HEAD). Central acceptance of CA-03 is still pending; no
  CA-03 file was touched by this packet.
- Actual stylesheet confirmed as `src/styles/shell.css` (imported by
  `src/layouts/SiteLayout.astro`, asserted in the behavior suite), so no
  coordinator allowlist revision was needed. `Footer.astro` and
  `shell.css` required no edits and are unchanged.
- `src/lib/navigation.ts` was read-only input (route/copy source). It was
  not modified; no new copy was invented.

No backend, admin, central-queue, or `Front-End/Assets` file was touched.

## 2. Changed paths (exact allowlist only)

- `src/components/Header.astro` (MODIFIED, one line) — brand anchor now
  carries `aria-label={brandNameDisplay}` from existing locale copy
  (`TAHA MOHAMMADI` / `طه محمدی`). Desktop accessible name is unchanged
  (identical to the visible name text); the link no longer goes unnamed
  below 768px where brand text is visually hidden.
- `src/components/Footer.astro` (UNMODIFIED) — verified: all links derive
  from `primaryNav`/`footerResourceNav`/route helpers, contact meta uses
  truthful pending-publication placeholders, social buttons are honestly
  disabled; no invented links or literal concept footer address found.
- `src/styles/shell.css` (UNMODIFIED) — verified as the live stylesheet
  with logical properties, dual-theme hooks, and 44px targets intact.
- `src/components/shell/public-150.behavior.test.ts` (MODIFIED) — two new
  behavior tests: locale brand-link naming (en/fa) and native
  details/summary drawer with locale toggle copy (en/fa).
- `tests/e2e/public-150-shell.e2e.ts` (MODIFIED) — new `CA-08 shared
chrome navigation` block: brand-link naming at 390px (en/fa) and mobile
  drawer keyboard toggle with focus ring, no trap, and no overflow
  (en/fa).
- `docs/quality/concept-alignment-v2/CA-08-HANDOFF.md` (NEW, this file).

## 3. What was implemented

1. **Navigation naming**: the header brand link — the only chrome link
   whose accessible name depended on viewport width — is now named from
   locale copy on every viewport. Root cause: `.site-header__brand-text`
   is `display: none` below 768px while the mark image is `alt=""`, so
   the mobile brand link computed to an empty name.
2. **Verified intact, not changed**: mobile drawer stays a native
   `<details>/<summary>` (keyboard operable without JS, focus ring via
   the global tokenized `base.css` rule — a shell-local duplicate was
   deliberately not added after proving behavioral coverage), skip link
   → `#main-content` focus with tokenized outline, `aria-current="page"`
   active links, LanguageToggle honest unavailable state (no fallback
   home link), footer placeholders, and 44px targets (`ui-link`
   min-height, nav links, search link, social buttons, toggles).
3. **Link audit on built output** (`dist/{en,fa}/index.html`): zero
   `#`/`javascript:` hrefs; externals are only canonical/alternate
   build URLs plus the `#main-content` skip target; one Header, one
   Footer, one H1 each; skip link present.

## 4. Failing-before / passing-after evidence (focused checks)

Failing-before: the new brand-naming assertions failed on the unmodified
shell — unit (`aria-label` absent in rendered Header, en) and e2e
(`.site-header` brand link unresolvable by accessible name at 390px,
en+fa). The drawer keyboard-toggle e2e passed before and after and is
kept as a passing guard.

Passing-after (final):

- `npm.cmd test -- src/components/shell/public-150.behavior.test.ts` →
  **8 passed / 0 failed** (6 existing + 2 new).
- `npm.cmd exec playwright test tests/e2e/public-150-shell.e2e.ts` →
  **7 passed / 0 failed** (3 existing + 4 new: brand naming en/fa,
  drawer toggle en/fa).
- `npm.cmd run lint` → clean (0 errors, 0 warnings).
- `npm.cmd run build` → green, 33 pages, Pagefind en+fa indexed
  (repository-appropriate check for a header change shipping on every
  page).
- `npx prettier --check` on all three touched source/test paths → clean
  (no repo-wide format run; the one-line Header edit is prettier-clean).

## 5. Source / schema hashes (baseline record)

- No API, schema, or generated-contract content was consumed or modified:
  the shell is content-static besides `navigation.ts` locale copy (read,
  unchanged) and the CMS-gated footer bio placeholder path (unchanged).
  `src/generated/public-api.ts` untouched. No hash applies beyond the
  `git diff` in §2, which is confined to the allowlist.

## 6. Screenshots / rendered output (paired before/after)

No screenshots captured — the semantic change (`aria-label`) has zero
visual effect by construction, so paired visual captures would be
identical frames. Paired evidence instead:

- Before (HEAD): `<a href="/en/" class="site-header__brand">` — mobile
  accessible name empty (proven by the failing e2e audition in §4).
- After (working copy): `<a href="/en/" class="site-header__brand"
aria-label="TAHA MOHAMMADI">` (`طه محمدی` for fa) — named on every
  viewport, desktop rendering byte-identical apart from the attribute.
- Styling before/after: identical — `shell.css` untouched, so no visual
  regression is possible from this packet; contrast/skip-link e2e
  re-verified after the change.

A passing automated check is not claimed as visual or owner acceptance;
PUBLIC-190 remains open per ADR-0008.

## 7. Coordinator observation (not a deviation)

The FA footer legal line renders `© {year} طه محمدی. All rights
reserved.` — the trailing legal formula is English inside the FA locale.
This predates CA-08 and was left as-is: correcting it needs owner FA
legal copy and `navigation.ts` (read-only for this packet) is the only
legitimate home for it. No invented translation was substituted. Suggested
follow-up: owner supplies the FA legal formula, or explicitly keeps the
English formula as a literal legal term, before page-family workers
start.

## 8. Dirty status and boundaries kept

Pre-existing dirty/untracked files were preserved untouched (`AGENTS.md`,
`PROJECT-MANIFEST.md`, CA-01..07 allowlist paths, Atlas sections,
fixtures, central V2 queue). Generated output (`dist/`,
`.e2e-serve-dist/`, `test-results/`) is ignored build/test evidence and
uncommitted. No secrets, publication, deploy, legacy code copy, invented
content/links/routes/translations, Figma implementation, or
`Front-End/Assets` use. No next packet started; PUBLIC-190/PUBLIC-350
acceptance untouched.

## 9. Done-when verification

- [x] No invented links (built-HTML href audit) and no literal concept
      footer address (placeholder states verified truthful).
- [x] Shared chrome works both themes (contrast e2e light+dark) and both
      locales (brand naming + drawer toggle en/fa, locale toggle states
      in unit).
- [x] Mobile menu and skip link intact (native disclosure pinned in unit;
      keyboard toggle/focus/no-trap/no-overflow in e2e; skip-link focus
      e2e re-green).
- [x] Actual stylesheet confirmed as `shell.css`; no allowlist revision
      needed and none requested.
- [x] Before/after evidence recorded with fixture-vs-published labels
      (shell carries no published-record content; states are static).

## 2026-09-07 — CMS-controlled shell regressions (CA-08/CM-02)

- `src/components/shell/managed-shell.test.ts` (2 tests): Header/Footer
  render through AstroContainer with mocked `fetchLocalizedSiteSettings`;
  absent settings must not resurrect identity, biography, role line or
  menu; explicitly empty published footer stays empty and real nav edits
  are honored.
- `src/lib/home-content.test.ts` (4 tests): Home loaders return honest
  empty states when APIs are unavailable; updated published profile,
  landing and exact-locale research records flow through.
- Run 2026-09-07: `npm test -- src/components/shell/managed-shell.test.ts
src/lib/home-content.test.ts` -> **6/6 passed**.
  `npm run lint` -> clean. `npm run build` -> 42 pages.

## 2026-09-07 — Stale shell tests rewritten + brand pipeline restored

- `public-150.behavior.test.ts` still asserted the pre-CMS shell
  (hardcoded brand/skip/drawer copy, `ContactCTA` import, promo/social
  placeholders): 4 failures. Rewritten to the CMS contract with a
  `site-settings-content` mock — copy-driven brand/skip/drawer asserts,
  promo gated by `footer.cta`, honest-empty footer. Now **8/8 passed**.
- Owner decision: restore promoted-media images (dropped in the rewire).
  `Header`/`Footer` render `PromotedPicture` `brand.mark` again (footer
  picture inside the conditional brand link — no image without published
  brand); `HomeFeaturedProjects` (`home.project.preview`) and
  `HomeExploreRails` (`home.rail.preview` in `MediaTile`) render guarded
  on optional `assetId`, so missing CMS media stays imageless without
  breaking layout. `PUBLIC-261` shell+home wiring tests green again.
- `PageFamilyJourneyFlowShell` rendered nothing when empty while every
  sibling shell renders empty chrome (`PUBLIC-200` red). It now always
  renders the section shell with a `getCmsPlaceholderCopy` line when no
  milestones exist.
- Full suite: **87 files / 451 tests passed**. `npm run lint` clean.
  `npm run build` -> 42 pages.

---

## 10. Stop Marker

**CA-08_HANDOFF_READY**

## 2026-09-07 — CMS-unavailable shell guard

- The static E2E server has no public API base, so localized settings are
  correctly absent. The prior browser assertions instead expected the retired
  hardcoded brand and menu, while the rendered header contained unnamed
  brand/search/theme/menu controls and an empty skip link.
- Header, ThemeToggle, and SkipLink now omit controls whose published label or
  data is absent. The desktop/mobile navigation is also omitted when there are
  no published navigation items; no fallback identity, link, or copy was
  restored.
- A new component regression first failed against the unnamed controls, then
  passed after the guard. The managed-settings unit fixture continues to cover
  named brand and native drawer behavior when published settings are present.
- Browser evidence: `npm exec playwright test
tests/e2e/public-150-shell.e2e.ts` → **5/5 passed**. The E2E suite now
  checks the honest unavailable state, while component tests cover the
  CMS-populated behavior.

This repair does not supply CMS content, alter visual acceptance, or change
packet status; real populated-data visual review remains a coordinator gate.
