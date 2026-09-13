#!/usr/bin/env node
/**
 * Playwright webServer entry — cross-platform build + dist readiness + serve.
 *
 * Avoids shell `&&` chains on Windows and optional dist snapshot so a
 * concurrent `astro build` cannot delete files the harness is serving.
 *
 * Also runs the deterministic site-settings fixture (see
 * `scripts/e2e-site-settings-fixture.mjs`) and points the E2E build at it, so
 * the built gateway satisfies the same site-settings input contract production
 * satisfies. Nothing here runs during a normal, staging or production build.
 *
 * Env:
 *   TM_E2E_SKIP_BUILD=1     — skip build (review:visual pre-builds dist)
 *   TM_E2E_PORT             — required listen port (from playwright.config.ts)
 *   TM_E2E_SETTINGS_PORT    — port for the site-settings fixture server
 *   TM_E2E_DIST_SNAPSHOT    — default 1 when skip-build; copy dist before serve
 */
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const port = Number(process.env.TM_E2E_PORT)
const settingsPort = Number(process.env.TM_E2E_SETTINGS_PORT)
const skipBuild = process.env.TM_E2E_SKIP_BUILD === '1'
const snapshotByDefault = skipBuild
const useSnapshot =
  process.env.TM_E2E_DIST_SNAPSHOT === '1' ||
  (process.env.TM_E2E_DIST_SNAPSHOT !== '0' && snapshotByDefault)

const sourceDist = path.join(repositoryRoot, 'dist')
const serveRoot = useSnapshot
  ? path.join(repositoryRoot, '.e2e-serve-dist')
  : sourceDist

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- deterministic site-settings fixture -----------------------------------
let settingsFixture = null

function useSettingsFixture() {
  return (
    Number.isInteger(settingsPort) && settingsPort > 0 && settingsPort <= 65535
  )
}

function startSettingsFixture() {
  settingsFixture = spawn(
    process.execPath,
    ['scripts/e2e-site-settings-fixture.mjs'],
    {
      cwd: repositoryRoot,
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, TM_E2E_SETTINGS_PORT: String(settingsPort) },
    },
  )
  settingsFixture.on('error', (error) => {
    console.error(
      `playwright-web-server: settings fixture failed: ${error.message}`,
    )
  })
}

function stopSettingsFixture() {
  if (settingsFixture && !settingsFixture.killed) {
    try {
      settingsFixture.kill()
    } catch {
      /* already gone */
    }
  }
  settingsFixture = null
}

/** Bounded readiness poll — never wait forever for the fixture. */
async function waitForSettingsFixture() {
  const url = `http://127.0.0.1:${settingsPort}/api/v1/site/en`
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
      })
      if (response.ok) {
        const body = await response.json()
        if (body?.locale === 'en' && body?.brandName) {
          return
        }
      }
    } catch {
      /* not up yet */
    }
    await sleep(150)
  }

  console.error(
    `playwright-web-server: settings fixture never became ready on ${settingsPort}`,
  )
  stopSettingsFixture()
  process.exit(1)
}

function runBuild(extraEnv = {}) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['run', 'build', '--silent'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
    // Windows: spawnSync('npm.cmd', …, { shell: false }) often returns EINVAL.
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

async function waitForDistReady(distRoot) {
  const marker = path.join(distRoot, 'index.html')
  const deadline = Date.now() + 120_000
  let lastSize = -1
  let stableReads = 0

  while (Date.now() < deadline) {
    if (existsSync(marker)) {
      const { size } = statSync(marker)
      if (size > 0 && size === lastSize) {
        stableReads += 1
        if (stableReads >= 3) {
          return
        }
      } else {
        stableReads = 0
        lastSize = size
      }
    } else {
      stableReads = 0
      lastSize = -1
    }

    await sleep(200)
  }

  console.error(`playwright-web-server: dist not ready — missing ${marker}`)
  process.exit(1)
}

function materializeServeRoot() {
  if (!useSnapshot) {
    return
  }

  if (!existsSync(sourceDist)) {
    console.error(`playwright-web-server: source dist not found: ${sourceDist}`)
    process.exit(1)
  }

  rmSync(serveRoot, { recursive: true, force: true })
  cpSync(sourceDist, serveRoot, { recursive: true })
}

function startServeDist() {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/serve-dist.mjs',
      '--port',
      String(port),
      '--root',
      path.relative(repositoryRoot, serveRoot),
    ],
    {
      cwd: repositoryRoot,
      stdio: 'inherit',
      shell: false,
    },
  )

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  process.exit(result.status ?? 0)
}

async function main() {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(
      'playwright-web-server: TM_E2E_PORT must be a valid port number',
    )
    process.exit(1)
  }

  const withFixture = useSettingsFixture()

  // The fixture must outlive this process's blocking serve step, so it is torn
  // down explicitly rather than left orphaned.
  process.on('exit', stopSettingsFixture)
  process.on('SIGINT', () => {
    stopSettingsFixture()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    stopSettingsFixture()
    process.exit(143)
  })

  if (withFixture) {
    startSettingsFixture()
    await waitForSettingsFixture()
  }

  if (skipBuild) {
    if (withFixture) {
      console.warn(
        'playwright-web-server: TM_E2E_SKIP_BUILD=1 — reusing an existing dist. ' +
          'The site-settings fixture cannot change an already-built artifact, so ' +
          'gateway title assertions (.gw__title) only pass after a real build.',
      )
    }
  } else {
    runBuild(
      withFixture
        ? { PUBLIC_API_BASE_URL: `http://127.0.0.1:${settingsPort}` }
        : {},
    )
  }

  await waitForDistReady(sourceDist)
  materializeServeRoot()

  if (useSnapshot) {
    await waitForDistReady(serveRoot)
  }

  startServeDist()
}

main()
