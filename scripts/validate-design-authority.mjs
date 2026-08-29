import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotRoot = process.env.DESIGN_AUTHORITY_SNAPSHOT_ROOT || path.join(repositoryRoot, 'contracts', 'design-authority');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const snapshotSha256 = (file) =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, ''))
    .digest('hex');
const fail = (message) => {
  throw new Error(`Design authority validation failed: ${message}`);
};

const manifest = readJson(path.join(snapshotRoot, 'manifest.json'));
if (manifest.snapshotDate !== '2026-08-29') fail('snapshot date must remain 2026-08-29');

for (const entry of Object.values(manifest.files)) {
  const localFile = path.join(snapshotRoot, entry.filename);
  if (!fs.existsSync(localFile)) fail(`missing local snapshot ${entry.filename}`);
  if (sha256(localFile) !== entry.rawSha256) fail(`local snapshot raw-byte hash drift for ${entry.filename}`);
  if (snapshotSha256(localFile) !== entry.sha256) fail(`local snapshot hash drift for ${entry.filename}`);
}

const components = readJson(path.join(snapshotRoot, manifest.files.components.filename));
const templates = readJson(path.join(snapshotRoot, manifest.files.templates.filename));
const componentNames = components.components.map((component) => component.name);
const templateIds = templates.templates.map((template) => template.id);
if (componentNames.length !== manifest.inventories.components || new Set(componentNames).size !== 24) {
  fail(`expected exactly 24 unique component names, found ${componentNames.length}`);
}
if (templateIds.length !== manifest.inventories.templates || new Set(templateIds).size !== 6) {
  fail(`expected exactly 6 unique template IDs, found ${templateIds.length}`);
}

const centralRoot = process.env.DESIGN_AUTHORITY_ROOT || manifest.centralSourcePath;
if (fs.existsSync(centralRoot)) {
  for (const entry of Object.values(manifest.files)) {
    const centralFile = path.join(centralRoot, entry.filename);
    if (!fs.existsSync(centralFile)) fail(`central authority is missing ${entry.filename}`);
    if (sha256(centralFile) !== entry.sourceSha256) fail(`central source hash drift for ${entry.filename}`);
    if (snapshotSha256(centralFile) !== entry.sha256) fail(`central authority content drift for ${entry.filename}`);
  }
  console.log(`PASS: snapshot validated locally and against central authority (${componentNames.length} components, ${templateIds.length} templates).`);
} else {
  console.log(`PASS: standalone snapshot validated (${componentNames.length} components, ${templateIds.length} templates); central authority unavailable.`);
}
