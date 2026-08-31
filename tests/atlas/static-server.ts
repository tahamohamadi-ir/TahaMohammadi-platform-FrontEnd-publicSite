import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function contentTypeFor(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function isPathTraversal(urlPath: string) {
  return urlPath.includes('..') || urlPath.includes('\\');
}

function resolveDistFile(distRoot: string, urlPath: string) {
  if (isPathTraversal(urlPath)) {
    return null;
  }

  const distRootResolved = path.resolve(distRoot);

  if (urlPath === '/') {
    return path.join(distRootResolved, 'index.html');
  }

  if (urlPath === '/_design' || urlPath === '/_design/') {
    return path.join(distRootResolved, '_design', 'index.html');
  }

  const normalizedPath = urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath;
  let candidate = path.resolve(distRootResolved, `.${normalizedPath}`);

  if (!candidate.startsWith(distRootResolved)) {
    return null;
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  if (existsSync(`${candidate}.html`) && statSync(`${candidate}.html`).isFile()) {
    return `${candidate}.html`;
  }

  const directoryIndex = path.join(candidate, 'index.html');
  if (existsSync(directoryIndex) && statSync(directoryIndex).isFile()) {
    return directoryIndex;
  }

  return null;
}

export async function startDistStaticServer(distRoot: string, host = '127.0.0.1') {
  const server = createServer((request, response) => {
    const urlPath = decodeURIComponent(new URL(request.url ?? '/', `http://${host}`).pathname);
    const filePath = resolveDistFile(distRoot, urlPath);

    if (!filePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
      return;
    }

    response.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    createReadStream(filePath).pipe(response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve ephemeral static server port.');
  }

  return {
    server,
    baseUrl: `http://${host}:${address.port}`,
  };
}

export async function stopDistStaticServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
