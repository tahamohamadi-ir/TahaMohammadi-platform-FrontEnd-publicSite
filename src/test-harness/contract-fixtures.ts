import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const workspaceRoot = path.resolve(repositoryRoot, '..', '..');

export const PUBLIC_OPENAPI_PATH = path.resolve(
  workspaceRoot,
  'Back-End/docs/contracts/openapi/current/public-openapi.json',
);

export const OPENAPI_HASH_PIN_PATH = path.join(
  repositoryRoot,
  'contracts/openapi.public.sha256',
);

/** Accepted hash recorded at PS-05 (CRLF-encoded bytes). */
export const ACCEPTED_PUBLIC_OPENAPI_SHA256 =
  '0f672693de28ed33286789e5119eb3226c062693fb15168b1aba5513c257c0a5';

/** Canonical LF hash of the accepted public OpenAPI artifact (BACKEND-140). */
export const CANONICAL_PUBLIC_OPENAPI_LF_SHA256 =
  'be8fdbea748aa5215d20ceb4140434fc4e90582c667e66607956cb02ebaf5f94';

export const CONSUMER_RESPONSES_DIR = path.join(
  repositoryRoot,
  'tests/fixtures/contracts/responses',
);

export const CONSUMER_ERRORS_DIR = path.join(
  repositoryRoot,
  'tests/fixtures/contracts/errors',
);

export const BACKEND_PUBLIC_FIXTURES_DIR = path.resolve(
  workspaceRoot,
  'Back-End/tests/fixtures/contracts/public',
);

export const BACKEND_ERROR_FIXTURES_DIR = path.resolve(
  workspaceRoot,
  'Back-End/tests/fixtures/contracts/errors',
);

/** Observed profile detail shape (Gap A — no accepted OpenAPI component yet). */
export const PROFILE_DETAIL_FIELDS = new Set([
  'locale',
  'slug',
  'title',
  'seoTitle',
  'seoDescription',
  'shortBio',
  'longBio',
  'availability',
  'publishedAt',
  'availableLocales',
  'skills',
  'experience',
  'education',
  'publications',
  'researchProjects',
  'certificates',
  'socials',
]);

export type OpenApiArtifact = {
  components: {
    schemas: Record<
      string,
      {
        properties?: Record<string, unknown>;
        required?: string[];
        allOf?: Array<{ $ref?: string; properties?: Record<string, unknown>; required?: string[] }>;
      }
    >;
  };
};

export type ResolvedComponent = {
  properties: Set<string>;
  required: Set<string>;
};

export type PublicResponseFixtureSpec = {
  file: string;
  component?: string;
  itemComponent?: string;
  profileFieldsOnly?: boolean;
};

export type PublicErrorFixtureSpec =
  | {
      file: string;
      kind: 'json';
      matrix: 'profile-not-found' | 'contact-json-failure';
    }
  | {
      file: string;
      kind: 'html';
      matrix: 'contact-html-422';
      marker: string;
    };

export const PUBLIC_RESPONSE_FIXTURES: PublicResponseFixtureSpec[] = [
  { file: 'landing.get.200.json', component: 'LandingOut' },
  {
    file: 'articles.get.200.json',
    component: 'PagedArticleListOut',
    itemComponent: 'ArticleListOut',
  },
  { file: 'articles-detail.get.200.json', component: 'ArticleDetailOut' },
  { file: 'profile-detail.get.200.json', profileFieldsOnly: true },
  { file: 'publication-detail.get.200.json', component: 'PublicationDetailOut' },
  { file: 'project-detail.get.200.json', component: 'ProjectDetailOut' },
  { file: 'site.get.200.json', component: 'PublicSiteSettingsOut' },
];

export const PUBLIC_ERROR_FIXTURES: PublicErrorFixtureSpec[] = [
  { file: 'profile-not-found.404.json', kind: 'json', matrix: 'profile-not-found' },
  { file: 'contact.post.error.json', kind: 'json', matrix: 'contact-json-failure' },
  {
    file: 'contact.post.validation.html',
    kind: 'html',
    matrix: 'contact-html-422',
    marker: 'Message not sent',
  },
];

export function readOpenApiArtifact(): OpenApiArtifact {
  return JSON.parse(readFileSync(PUBLIC_OPENAPI_PATH, 'utf8')) as OpenApiArtifact;
}

export function readOpenApiHashPin(): string {
  return readFileSync(OPENAPI_HASH_PIN_PATH, 'utf8').trim();
}

export function sha256Bytes(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function sha256File(filePath: string): string {
  return sha256Bytes(readFileSync(filePath));
}

export function canonicalLfBytes(filePath: string): Buffer {
  return readFileSync(filePath).toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function hashOpenApiArtifactLf(filePath: string = PUBLIC_OPENAPI_PATH): string {
  return sha256Bytes(Buffer.from(canonicalLfBytes(filePath), 'utf8'));
}

export function hashOpenApiArtifactAccepted(filePath: string = PUBLIC_OPENAPI_PATH): string {
  const canonical = canonicalLfBytes(filePath);
  return sha256Bytes(Buffer.from(canonical.replace(/\n/g, '\r\n'), 'utf8'));
}

export function readJsonFixture<T>(directory: string, file: string): T {
  const filePath = path.join(directory, file);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

export function readTextFixture(directory: string, file: string): string {
  return readFileSync(path.join(directory, file), 'utf8');
}

export function resolveComponent(artifact: OpenApiArtifact, name: string): ResolvedComponent {
  const schema = artifact.components.schemas[name];
  if (!schema) {
    throw new Error(`OpenAPI component not found: ${name}`);
  }

  const properties = new Set<string>();
  const required = new Set<string>();
  const parts = schema.allOf ?? [schema];

  for (const part of parts) {
    let resolved = part;
    if (part.$ref) {
      const refName = part.$ref.split('/').pop();
      if (!refName) {
        throw new Error(`Invalid $ref in component ${name}`);
      }
      resolved = artifact.components.schemas[refName] ?? part;
    }
    Object.keys(resolved.properties ?? {}).forEach((key) => properties.add(key));
    (resolved.required ?? []).forEach((key) => required.add(key));
  }

  return { properties, required };
}

export function validateComponent(
  artifact: OpenApiArtifact,
  name: string,
  payload: Record<string, unknown>,
  options: { itemComponent?: string } = {},
): void {
  const component = resolveComponent(artifact, name);
  const payloadKeys = new Set(Object.keys(payload));
  const unexpected = [...payloadKeys].filter((key) => !component.properties.has(key));
  if (unexpected.length > 0) {
    throw new Error(`${name}: unexpected fields ${unexpected.join(', ')}`);
  }

  const missing = [...component.required].filter((key) => !payloadKeys.has(key));
  if (missing.length > 0) {
    throw new Error(`${name}: missing required fields ${missing.join(', ')}`);
  }

  if (options.itemComponent) {
    const item = resolveComponent(artifact, options.itemComponent);
    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const entry of items) {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`${name}: list item is not an object`);
      }
      const entryKeys = new Set(Object.keys(entry as Record<string, unknown>));
      const itemUnexpected = [...entryKeys].filter((key) => !item.properties.has(key));
      if (itemUnexpected.length > 0) {
        throw new Error(
          `${options.itemComponent}: unexpected fields ${itemUnexpected.join(', ')}`,
        );
      }
      const itemMissing = [...item.required].filter((key) => !entryKeys.has(key));
      if (itemMissing.length > 0) {
        throw new Error(
          `${options.itemComponent}: missing required fields ${itemMissing.join(', ')}`,
        );
      }
    }
  }
}

export function assertProfileDetailShape(payload: Record<string, unknown>): void {
  const payloadKeys = new Set(Object.keys(payload));
  if (payloadKeys.size !== PROFILE_DETAIL_FIELDS.size) {
    const unexpected = [...payloadKeys].filter((key) => !PROFILE_DETAIL_FIELDS.has(key));
    const missing = [...PROFILE_DETAIL_FIELDS].filter((key) => !payloadKeys.has(key));
    throw new Error(
      `profile detail shape drift (unexpected: ${unexpected.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'})`,
    );
  }
}

export function assertMatchesBackendFixture(
  consumerDirectory: string,
  backendDirectory: string,
  file: string,
): void {
  const consumerPath = path.join(consumerDirectory, file);
  const backendPath = path.join(backendDirectory, file);
  if (!existsSync(consumerPath)) {
    throw new Error(`Missing consumer fixture: ${consumerPath}`);
  }
  if (!existsSync(backendPath)) {
    throw new Error(`Missing backend authoritative fixture: ${backendPath}`);
  }

  const consumer = readFileSync(consumerPath);
  const backend = readFileSync(backendPath);
  if (!consumer.equals(backend)) {
    throw new Error(
      `Consumer fixture drift from backend authoritative copy: ${file} (consumer ${sha256File(consumerPath)}, backend ${sha256File(backendPath)})`,
    );
  }
}

export function validateErrorFixture(spec: PublicErrorFixtureSpec): void {
  if (spec.kind === 'html') {
    const text = readTextFixture(CONSUMER_ERRORS_DIR, spec.file);
    if (!text.includes(spec.marker)) {
      throw new Error(`${spec.file}: expected HTML marker "${spec.marker}"`);
    }
    return;
  }

  const payload = readJsonFixture<Record<string, unknown>>(CONSUMER_ERRORS_DIR, spec.file);
  switch (spec.matrix) {
    case 'profile-not-found':
      if (typeof payload.detail !== 'string' || payload.detail.length === 0) {
        throw new Error(`${spec.file}: expected non-empty detail string for profile not found`);
      }
      break;
    case 'contact-json-failure':
      if (payload.ok !== false || typeof payload.error !== 'string' || payload.error.length === 0) {
        throw new Error(`${spec.file}: expected { ok: false, error: string } contact failure shape`);
      }
      break;
    default: {
      const neverSpec: never = spec;
      throw new Error(`Unhandled error fixture matrix: ${String(neverSpec)}`);
    }
  }
}
