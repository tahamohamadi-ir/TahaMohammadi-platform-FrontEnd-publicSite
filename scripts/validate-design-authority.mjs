import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const snapshotRoot =
  process.env.DESIGN_AUTHORITY_SNAPSHOT_ROOT ||
  path.join(repositoryRoot, 'contracts', 'design-authority')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const sha256 = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const snapshotSha256 = (file) =>
  crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, ''),
    )
    .digest('hex')
const fail = (message) => {
  throw new Error(`Design authority validation failed: ${message}`)
}

const manifest = readJson(path.join(snapshotRoot, 'manifest.json'))
if (manifest.snapshotDate !== '2026-08-29')
  fail('snapshot date must remain 2026-08-29')

for (const entry of Object.values(manifest.files)) {
  const localFile = path.join(snapshotRoot, entry.filename)
  if (!fs.existsSync(localFile))
    fail(`missing local snapshot ${entry.filename}`)
  if (sha256(localFile) !== entry.rawSha256)
    fail(`local snapshot raw-byte hash drift for ${entry.filename}`)
  if (snapshotSha256(localFile) !== entry.sha256)
    fail(`local snapshot hash drift for ${entry.filename}`)
}

const components = readJson(
  path.join(snapshotRoot, manifest.files.components.filename),
)
const templates = readJson(
  path.join(snapshotRoot, manifest.files.templates.filename),
)
const componentNames = components.components.map((component) => component.name)
const templateIds = templates.templates.map((template) => template.id)
if (
  componentNames.length !== manifest.inventories.components ||
  new Set(componentNames).size !== 24
) {
  fail(
    `expected exactly 24 unique component names, found ${componentNames.length}`,
  )
}
if (
  templateIds.length !== manifest.inventories.templates ||
  new Set(templateIds).size !== 6
) {
  fail(`expected exactly 6 unique template IDs, found ${templateIds.length}`)
}

const centralRoot =
  process.env.DESIGN_AUTHORITY_ROOT || manifest.centralSourcePath

const overlayFile = path.join(snapshotRoot, 'v2-overlay.json')
if (!fs.existsSync(overlayFile))
  fail('missing versioned V2 overlay v2-overlay.json')
const overlay = readJson(overlayFile)
const isEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right)
if (overlay.version !== '2.1.0') fail('V2 overlay version must be 2.1.0')
if (
  typeof overlay.authority !== 'string' ||
  !overlay.authority.includes('ADR-0008')
)
  fail('V2 overlay authority must reference ADR-0008')
if (overlay.inherits !== 'Docs/references/frontend-design-authority')
  fail('V2 overlay must inherit Docs/references/frontend-design-authority')
if (overlay?.home?.hero !== 'identity-and-research-graph')
  fail('V2 overlay home hero must be identity-and-research-graph')
if (overlay?.home?.portal !== false)
  fail(
    'V2 overlay portal placement contradiction: Home must not own the portal',
  )
if (overlay?.home?.standaloneGraphSection !== false)
  fail(
    'V2 overlay portal placement contradiction: Home must not keep a separate graph section',
  )
if (
  !isEqual(overlay?.home?.order, [
    'identity-lead-with-graph',
    'audience-paths',
    'selected-work',
    'research-axes',
    'recent-writing',
    'collaboration-cv-contact',
  ])
)
  fail(
    'V2 overlay home order contradiction: order must start with identity-lead-with-graph and match the accepted V2 sequence',
  )
if (overlay?.gateway?.portal !== 'procedural-threejs')
  fail('V2 overlay gateway portal must be procedural-threejs')
if (overlay?.gateway?.localeLinks !== 'native-html-immediate-navigation')
  fail(
    'V2 overlay gateway locale links must be native-html-immediate-navigation',
  )
if (!isEqual(overlay?.portalDecorationRoutes, ['/']))
  fail(
    'V2 overlay portal placement contradiction: portal decoration is reserved for "/"',
  )
if (overlay?.rendering?.scene !== 'threejs-vanilla-typescript')
  fail('V2 overlay rendering scene must be threejs-vanilla-typescript')
if (overlay?.rendering?.motion !== 'gsap')
  fail('V2 overlay rendering motion must be gsap')
if (overlay?.rendering?.labels !== 'semantic-html')
  fail('V2 overlay rendering labels must be semantic-html')
if (overlay?.rendering?.noJS !== 'native-html-list')
  fail('V2 overlay rendering noJS must be native-html-list')
if (overlay?.rendering?.reducedMotion !== 'static-pose-instant-selection')
  fail(
    'V2 overlay rendering reducedMotion must be static-pose-instant-selection',
  )
if (overlay?.rendering?.failure !== 'semantic-fallback')
  fail('V2 overlay rendering failure must be semantic-fallback')
if (overlay?.rendering?.idle !== 'render-on-change')
  fail('V2 overlay rendering idle must be render-on-change')
if (overlay?.graph?.existingEndpoint !== '/api/graph/{locale}')
  fail('V2 overlay graph endpoint must be /api/graph/{locale}')
if (overlay?.graph?.generatedType !== 'GraphPayloadOut')
  fail('V2 overlay graph generated type must be GraphPayloadOut')
if (overlay?.graph?.groupsFieldExists !== false)
  fail('V2 overlay graph must record groupsFieldExists=false')
if (!isEqual(overlay?.graph?.relatedRecordFields, ['family', 'id']))
  fail('V2 overlay graph related records must be [family, id]')
if (
  overlay?.graph?.inventEdges !== false ||
  overlay?.graph?.inventHrefs !== false ||
  overlay?.graph?.truncateToThree !== false
)
  fail('V2 overlay graph must forbid invented edges, hrefs and truncation')
if (!isEqual(overlay?.widths, [320, 390, 768, 1024, 1280, 1440]))
  fail('V2 overlay widths must be 320, 390, 768, 1024, 1280, 1440')
if (!isEqual(overlay?.locales, ['fa', 'en']))
  fail('V2 overlay locales must be [fa, en]')
if (!isEqual(overlay?.themes, ['light', 'dark']))
  fail('V2 overlay themes must be [light, dark]')
if (overlay?.referencePolicy?.historicalSnapshots !== 'preserve-pinned-bytes')
  fail('V2 overlay must preserve pinned bytes for historical snapshots')
if (overlay?.referencePolicy?.overlayAdoption !== 'CA-01')
  fail('V2 overlay adoption must be CA-01')
if (
  overlay?.productAuthority !==
  'Docs/09-decisions/ADR-0010-UNIFIED-EXECUTION-CONTRACTS.md'
)
  fail('V2 overlay product authority must be ADR-0010')
if (
  overlay?.pinnedSnapshot?.components !== manifest.inventories.components ||
  overlay?.pinnedSnapshot?.templates !== manifest.inventories.templates ||
  overlay?.pinnedSnapshot?.components !== 24 ||
  overlay?.pinnedSnapshot?.templates !== 6
)
  fail('V2 overlay pinned snapshot must record 24 components and 6 templates')
if (
  !overlay?.allowedSceneDependencies?.gsap ||
  !overlay?.allowedSceneDependencies?.three
)
  fail('V2 overlay must record allowed scene dependencies for gsap and three')
if (overlay?.runtimeChange?.dependencies !== false)
  fail('V2 overlay baseline must record no dependency change')
if (overlay?.runtimeChange?.css !== false)
  fail('V2 overlay baseline must record no runtime CSS change')
const packageManifestFile =
  process.env.DESIGN_AUTHORITY_PACKAGE_JSON ||
  path.join(repositoryRoot, 'package.json')
const packageManifest = readJson(packageManifestFile)
if (!packageManifest?.dependencies?.gsap)
  fail('V2 overlay baseline requires the existing gsap dependency')
for (const scope of [
  packageManifest?.dependencies,
  packageManifest?.devDependencies,
]) {
  if (scope?.three !== undefined && typeof scope.three !== 'string')
    fail('V2 overlay scene dependency three must declare a version range')
}

if (fs.existsSync(centralRoot)) {
  for (const entry of Object.values(manifest.files)) {
    const centralFile = path.join(centralRoot, entry.filename)
    if (!fs.existsSync(centralFile))
      fail(`central authority is missing ${entry.filename}`)
    if (sha256(centralFile) !== entry.sourceSha256)
      fail(`central source hash drift for ${entry.filename}`)
    if (snapshotSha256(centralFile) !== entry.sha256)
      fail(`central authority content drift for ${entry.filename}`)
  }
  console.log(
    `PASS: snapshot validated locally and against central authority (${componentNames.length} components, ${templateIds.length} templates). V2 overlay 2.1.0 validated.`,
  )
} else {
  console.log(
    `PASS: standalone snapshot validated (${componentNames.length} components, ${templateIds.length} templates); central authority unavailable. V2 overlay 2.1.0 validated.`,
  )
}
