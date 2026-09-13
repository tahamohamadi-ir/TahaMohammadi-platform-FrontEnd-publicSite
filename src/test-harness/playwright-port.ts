import { createServer } from 'node:net'
import type { AddressInfo, Server } from 'node:net'

/**
 * Safe ephemeral-port selection for the Playwright harness.
 *
 * Why this exists instead of `server.listen(0)` alone: the operating system can
 * legitimately allocate a port that Chromium refuses to navigate to, and
 * Chromium then fails every `page.goto` with `net::ERR_UNSAFE_PORT`. That is not
 * a theoretical risk — measured on the Windows dev box used for this release,
 * `netsh int ipv4 show dynamicport tcp` reports `Start Port: 1024,
 * Number of Ports: 13977`, so `listen(0)` allocates from **1024–15000**, which
 * straddles Chromium's restricted list (1723, 2049, 3659, 4045, 4190, 5060,
 * 5061, 6000, 6566, 6665–6669, 6679, 6697 …). One run really did pick 1723 and
 * produced twelve bogus `ERR_UNSAFE_PORT` failures that looked like application
 * regressions.
 *
 * So the harness picks from an explicit safe range and proves the port is
 * actually bindable before handing it to Playwright.
 */

/**
 * Chromium's restricted-port list (`net/base/port_util.cc`, `kRestrictedPorts`).
 * Navigating to any of these yields `net::ERR_UNSAFE_PORT`.
 *
 * Every entry is below `SAFE_PORT_MIN`, so the range floor already excludes them
 * today; the explicit set is kept as the contract that is actually tested and so
 * that lowering the floor cannot silently reintroduce the failure.
 */
export const CHROMIUM_RESTRICTED_PORTS: readonly number[] = [
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79,
  87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137,
  139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532,
  540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723,
  2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669,
  6679, 6697, 10080,
]

const RESTRICTED = new Set(CHROMIUM_RESTRICTED_PORTS)

/** Inclusive bounds of the range the harness draws candidates from. */
export const SAFE_PORT_MIN = 20000
export const SAFE_PORT_MAX = 59999

/**
 * Ports this workspace reserves for manual/ad-hoc work. `astro preview` uses
 * 4321, so the harness must neither auto-select it nor accept it as an override.
 */
export const RESERVED_PORTS: readonly number[] = [4321]

/** Bounded: an inability to find a port is a condition, not something to spin on. */
export const MAX_PORT_ATTEMPTS = 30

/** Loopback only. Test servers must never depend on external networking. */
export const LOOPBACK_HOST = '127.0.0.1'

export function isChromiumRestrictedPort(port: number): boolean {
  return RESTRICTED.has(port)
}

export function isReservedPort(port: number): boolean {
  return RESERVED_PORTS.includes(port)
}

export function isValidPortNumber(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * The hard safety rule, and the one that applies to a deliberately chosen port:
 * an operator may pin any real port (including below the automatic range — the
 * harness must not reject a pin it cannot justify rejecting), but never one
 * Chromium refuses and never one this workspace reserves.
 */
export function isUsablePort(port: number): boolean {
  return (
    isValidPortNumber(port) &&
    !isChromiumRestrictedPort(port) &&
    !isReservedPort(port)
  )
}

/**
 * Automatic-selection rule: the hard rule plus the safe range, which steers
 * candidates away from the low window this machine's OS allocates from and away
 * from the reserved preview port.
 */
export function isSafePort(port: number): boolean {
  if (port < SAFE_PORT_MIN || port > SAFE_PORT_MAX) return false
  return isUsablePort(port)
}

/**
 * True when `port` can actually be bound on `host` right now.
 *
 * `exclusive: true` matters on Windows: without it SO_REUSEADDR lets a bind
 * succeed even while another process is already listening, which would make this
 * check report a busy port as free.
 */
export function isPortBindable(
  port: number,
  host: string = LOOPBACK_HOST,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const probe: Server = createServer()
    probe.unref()
    const fail = () => {
      probe.removeAllListeners()
      try {
        probe.close()
      } catch {
        /* already closed */
      }
      resolve(false)
    }
    probe.once('error', fail)
    probe.listen({ port, host, exclusive: true }, () => {
      const address = probe.address() as AddressInfo | null
      const bound = address?.port === port
      probe.close(() => resolve(bound))
    })
  })
}

export interface SafePortOptions {
  /**
   * Explicit override (the `TM_E2E_PORT` contract). When present it must be
   * valid: an unsafe override is a hard error, never silently ignored, because
   * accepting one is exactly how the ERR_UNSAFE_PORT outage was produced.
   */
  override?: string | undefined
  attempts?: number
  host?: string
  /** Injectable for tests. */
  choose?: (min: number, max: number) => number
  /** Injectable for tests. */
  isBindable?: (port: number, host: string) => Promise<boolean>
}

function defaultChoose(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/**
 * Resolve one usable, Chromium-safe port.
 *
 * Rejects candidates that are outside the safe range, on Chromium's restricted
 * list, or already bound, and gives up after `attempts` with an actionable
 * error rather than looping forever.
 */
export async function resolveSafePort(
  options: SafePortOptions = {},
): Promise<number> {
  const {
    override,
    attempts = MAX_PORT_ATTEMPTS,
    host = LOOPBACK_HOST,
    choose = defaultChoose,
    isBindable = isPortBindable,
  } = options

  if (override !== undefined && override !== '') {
    if (!/^\d+$/.test(override)) {
      throw new Error(
        `TM_E2E_PORT must be a plain port number, received "${override}".`,
      )
    }
    const parsed = Number(override)
    if (isChromiumRestrictedPort(parsed)) {
      throw new Error(
        `TM_E2E_PORT=${parsed} is on Chromium's restricted list, so every ` +
          'navigation would fail with net::ERR_UNSAFE_PORT. Choose another port.',
      )
    }
    if (!isValidPortNumber(parsed)) {
      throw new Error(
        `TM_E2E_PORT=${parsed} is not a valid port number (expected 1-65535).`,
      )
    }
    if (isReservedPort(parsed)) {
      throw new Error(
        `TM_E2E_PORT=${parsed} is reserved for the manual preview server ` +
          `(reserved: ${RESERVED_PORTS.join(', ')}). Choose another port.`,
      )
    }
    return parsed
  }

  const rejected: number[] = []
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = choose(SAFE_PORT_MIN, SAFE_PORT_MAX)
    if (!isSafePort(candidate)) {
      rejected.push(candidate)
      continue
    }
    if (!(await isBindable(candidate, host))) {
      rejected.push(candidate)
      continue
    }
    return candidate
  }

  throw new Error(
    `Could not find a bindable port in ${SAFE_PORT_MIN}-${SAFE_PORT_MAX} on ` +
      `${host} after ${attempts} attempts` +
      (rejected.length ? ` (rejected: ${rejected.join(', ')})` : '') +
      '. Another process may be holding the range; free a port or set ' +
      'TM_E2E_PORT explicitly.',
  )
}
