import { createServer } from 'node:net'
import type { AddressInfo, Server } from 'node:net'
import { describe, expect, it } from 'vitest'
import {
  CHROMIUM_RESTRICTED_PORTS,
  LOOPBACK_HOST,
  MAX_PORT_ATTEMPTS,
  RESERVED_PORTS,
  SAFE_PORT_MAX,
  SAFE_PORT_MIN,
  isChromiumRestrictedPort,
  isPortBindable,
  isSafePort,
  isUsablePort,
  resolveSafePort,
} from './playwright-port'

/** Bind a port for the duration of `run`, then release it. */
async function withBoundPort(
  run: (port: number) => Promise<void>,
): Promise<void> {
  const server: Server = createServer()
  const port = await new Promise<number>((resolve, reject) => {
    server.once('error', reject)
    server.listen({ port: 0, host: LOOPBACK_HOST }, () => {
      resolve((server.address() as AddressInfo).port)
    })
  })
  try {
    await run(port)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

describe('Chromium restricted ports', () => {
  it('flags 1723 — the port that produced the ERR_UNSAFE_PORT outage', () => {
    // Regression pin for the actual incident: the OS handed out 1723 and every
    // page.goto failed with net::ERR_UNSAFE_PORT.
    expect(isChromiumRestrictedPort(1723)).toBe(true)
    expect(isSafePort(1723)).toBe(false)
  })

  it('flags the rest of the restricted list and accepts ordinary high ports', () => {
    for (const port of CHROMIUM_RESTRICTED_PORTS) {
      expect(isChromiumRestrictedPort(port), `port ${port}`).toBe(true)
      expect(isSafePort(port), `port ${port}`).toBe(false)
    }
    for (const port of [SAFE_PORT_MIN, 20001, 30000, SAFE_PORT_MAX]) {
      expect(isSafePort(port), `port ${port}`).toBe(true)
    }
  })

  it('keeps the local preview port 4321 out of the safe range and reserved', () => {
    // The harness must never pick the port the manual preview server uses.
    expect(SAFE_PORT_MIN).toBeGreaterThan(4321)
    expect(SAFE_PORT_MAX).toBeGreaterThan(SAFE_PORT_MIN)
    expect(RESERVED_PORTS).toContain(4321)
    expect(isSafePort(4321)).toBe(false)
    expect(isUsablePort(4321)).toBe(false)
  })

  it('rejects malformed and out-of-range values', () => {
    expect(isSafePort(Number.NaN)).toBe(false)
    expect(isSafePort(19999)).toBe(false) // below the floor, e.g. 4322
    expect(isSafePort(4322)).toBe(false)
    expect(isSafePort(60000)).toBe(false)
    expect(isSafePort(4321.5)).toBe(false)
  })
})

describe('resolveSafePort allocation', () => {
  it('returns a port inside the allowed range that is genuinely bindable', async () => {
    const port = await resolveSafePort()
    expect(isSafePort(port)).toBe(true)
    expect(port).toBeGreaterThanOrEqual(SAFE_PORT_MIN)
    expect(port).toBeLessThanOrEqual(SAFE_PORT_MAX)
    // Proves the returned port is usable, not merely well-formed.
    expect(await isPortBindable(port)).toBe(true)
  })

  it('never returns a Chromium-restricted port across repeated allocations', async () => {
    // Bounded sample: enough to demonstrate the old 1723-class failure cannot
    // come back out of the selector, without hundreds of iterations.
    const ports = new Set<number>()
    for (let i = 0; i < 30; i += 1) {
      const port = await resolveSafePort()
      expect(isChromiumRestrictedPort(port)).toBe(false)
      expect(isSafePort(port)).toBe(true)
      ports.add(port)
    }
    expect(ports.size).toBeGreaterThan(0)
  })

  it('skips a restricted port, then a busy one, then succeeds', async () => {
    const sequence = [1723, 20000, 21000]
    let calls = 0
    const port = await resolveSafePort({
      attempts: 10,
      choose: () => sequence[Math.min(calls++, sequence.length - 1)],
      isBindable: async (candidate) => candidate !== 20000,
    })
    expect(port).toBe(21000)
    expect(calls).toBe(3)
  })

  it('skips a port that is already bound by another process', async () => {
    await withBoundPort(async (bound) => {
      expect(await isPortBindable(bound)).toBe(false)
      // An ordinary free port on the same host stays bindable.
      expect(await isPortBindable(bound + 1)).toBe(true)
    })
  })

  it('bounds retries instead of looping forever', async () => {
    let calls = 0
    await expect(
      resolveSafePort({
        attempts: 5,
        choose: () => {
          calls += 1
          return 1723 // always rejected: restricted
        },
      }),
    ).rejects.toThrow(/Could not find a bindable port/)
    expect(calls).toBe(5)
  })

  it('reports an actionable error when the range is exhausted', async () => {
    const error = await resolveSafePort({
      attempts: 3,
      choose: () => 25000,
      isBindable: async () => false,
    }).catch((reason: unknown) => reason as Error)

    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).toContain(`${SAFE_PORT_MIN}-${SAFE_PORT_MAX}`)
    expect(message).toContain(String(3)) // attempts, so the budget is visible
    expect(message).toContain('25000') // what was rejected, so it is debuggable
    expect(message).toContain('TM_E2E_PORT') // the way out
  })
})

describe('resolveSafePort explicit override', () => {
  it('honours a valid pin so parallel workers agree on one port', async () => {
    expect(await resolveSafePort({ override: '4399' })).toBe(4399)
  })

  it('accepts a pin below the automatic range', async () => {
    // Deliberate asymmetry: the range steers *automatic* selection away from the
    // low window this OS allocates from, but it must not second-guess an
    // operator who explicitly pins a workable port.
    expect(isSafePort(19999)).toBe(false)
    expect(isUsablePort(19999)).toBe(true)
    expect(await resolveSafePort({ override: '19999' })).toBe(19999)
  })

  it('refuses to pin a port Chromium blocks, instead of failing 12 tests later', async () => {
    await expect(resolveSafePort({ override: '1723' })).rejects.toThrow(
      /net::ERR_UNSAFE_PORT/,
    )
    // 22 is on Chromium's restricted list. Note that 80 and 443 are
    // deliberately NOT — Chromium permits plain HTTP there, so the harness
    // accepts them as explicit pins too.
    await expect(resolveSafePort({ override: '22' })).rejects.toThrow(
      /net::ERR_UNSAFE_PORT/,
    )
    await expect(resolveSafePort({ override: '6000' })).rejects.toThrow(
      /net::ERR_UNSAFE_PORT/,
    )
  })

  it('refuses to pin the reserved preview port', async () => {
    await expect(resolveSafePort({ override: '4321' })).rejects.toThrow(
      /reserved for the manual preview server/,
    )
  })

  it('refuses a malformed or impossible pin', async () => {
    await expect(resolveSafePort({ override: 'not-a-port' })).rejects.toThrow(
      /plain port number/,
    )
    await expect(resolveSafePort({ override: '70000' })).rejects.toThrow(
      /not a valid port number/,
    )
  })
})

describe('harness networking discipline', () => {
  it('never depends on production networking', () => {
    // Loopback only: the harness must not require external connectivity.
    expect(LOOPBACK_HOST).toBe('127.0.0.1')
  })

  it('exposes a bounded default attempt budget', () => {
    expect(MAX_PORT_ATTEMPTS).toBeGreaterThan(0)
    expect(MAX_PORT_ATTEMPTS).toBeLessThanOrEqual(100)
  })
})
