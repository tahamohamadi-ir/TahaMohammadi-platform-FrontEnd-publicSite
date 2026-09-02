#!/usr/bin/env node
/**
 * Foreground static server for the built site, owned by the Playwright
 * webServer lifecycle. It listens on exactly the port given via --port
 * (resolved ephemerally by playwright.config.ts), never hops ports, has no
 * child processes, and terminates with the suite.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
}

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === '--port' || flag === '--root') {
      args[flag.slice(2)] = argv[index + 1]
      index += 1
    }
  }
  return args
}

const { port: portArg, root: rootArg } = parseArgs(process.argv)
const port = Number(portArg)
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error('serve-dist: a numeric --port is required')
  process.exit(1)
}

const distRoot = path.resolve(repositoryRoot, rootArg ?? 'dist')
if (!existsSync(distRoot)) {
  console.error(`serve-dist: dist root not found: ${distRoot}`)
  process.exit(1)
}

function isPathTraversal(urlPath) {
  return urlPath.includes('..') || urlPath.includes('\\')
}

function resolveDistFile(urlPath) {
  if (isPathTraversal(urlPath)) return null

  if (urlPath === '/') {
    return path.join(distRoot, 'index.html')
  }

  const normalizedPath = urlPath.endsWith('/')
    ? `${urlPath}index.html`
    : urlPath
  const candidate = path.resolve(distRoot, `.${normalizedPath}`)
  if (!candidate.startsWith(distRoot)) return null

  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate

  if (
    existsSync(`${candidate}.html`) &&
    statSync(`${candidate}.html`).isFile()
  ) {
    return `${candidate}.html`
  }

  const directoryIndex = path.join(candidate, 'index.html')
  if (existsSync(directoryIndex) && statSync(directoryIndex).isFile()) {
    return directoryIndex
  }

  return null
}

const server = createServer((request, response) => {
  const urlPath = decodeURIComponent(
    new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname,
  )
  const filePath = resolveDistFile(urlPath)

  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not Found')
    return
  }

  response.writeHead(200, {
    'Content-Type':
      MIME_TYPES[path.extname(filePath).toLowerCase()] ??
      'application/octet-stream',
  })
  const stream = createReadStream(filePath)
  stream.on('error', (error) => {
    if (!response.headersSent) {
      const status =
        error && 'code' in error && error.code === 'ENOENT' ? 404 : 500
      response.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8',
      })
    }
    response.end()
  })
  stream.pipe(response)
})

server.on('error', (error) => {
  console.error('serve-dist failed:', error)
  process.exit(1)
})

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}

server.listen(port, '127.0.0.1', () => {
  console.log(`serve-dist: serving ${distRoot} at http://127.0.0.1:${port}`)
})
