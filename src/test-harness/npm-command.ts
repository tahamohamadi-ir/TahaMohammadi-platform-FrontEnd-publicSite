import { platform } from 'node:os'

/** Cross-platform npm executable for spawnSync (Windows uses npm.cmd). */
export function npmCommand(): string {
  return platform() === 'win32' ? 'npm.cmd' : 'npm'
}
