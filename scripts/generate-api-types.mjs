#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pinPath = join(root, 'src/generated/openapi-hash.json')
const contractPinPath = join(root, 'contracts/openapi.public.sha256')
const schemaPath = resolve(
  root,
  '../../Back-End/docs/contracts/openapi/current/public-openapi.json',
)
const outputPath = join(root, 'src/generated/public-api.ts')

const pin = JSON.parse(readFileSync(pinPath, 'utf8'))
const contractPin = readFileSync(contractPinPath, 'utf8').trim()

if (pin.sha256 !== contractPin) {
  console.error(
    'Pin mismatch between src/generated/openapi-hash.json and contracts/openapi.public.sha256.',
  )
  process.exit(1)
}

const actual = createHash('sha256')
  .update(readFileSync(schemaPath))
  .digest('hex')

if (actual !== pin.sha256) {
  console.error('OpenAPI schema hash drift detected.')
  console.error(`  Expected (accepted): ${pin.sha256}`)
  console.error(`  Actual (source file): ${actual}`)
  console.error(
    'Update OPENAPI-ACCEPTANCE.md, repo pins, and openapi-hash.json before regenerating types.',
  )
  process.exit(1)
}

const result = spawnSync(
  'npx',
  ['openapi-typescript', schemaPath, '-o', outputPath],
  { cwd: root, stdio: 'inherit', shell: true },
)

process.exit(result.status ?? 1)
