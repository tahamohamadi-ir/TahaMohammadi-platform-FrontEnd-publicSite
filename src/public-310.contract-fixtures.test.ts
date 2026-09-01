import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import openapiHash from './generated/openapi-hash.json';
import {
  assertMatchesBackendFixture,
  assertProfileDetailShape,
  BACKEND_ERROR_FIXTURES_DIR,
  BACKEND_PUBLIC_FIXTURES_DIR,
  CANONICAL_PUBLIC_OPENAPI_LF_SHA256,
  CONSUMER_ERRORS_DIR,
  CONSUMER_RESPONSES_DIR,
  hashOpenApiArtifactAccepted,
  hashOpenApiArtifactLf,
  PUBLIC_ERROR_FIXTURES,
  PUBLIC_OPENAPI_PATH,
  PUBLIC_RESPONSE_FIXTURES,
  readJsonFixture,
  readOpenApiArtifact,
  readOpenApiHashPin,
  validateComponent,
  validateErrorFixture,
} from './test-harness/contract-fixtures';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checklistPath = path.join(repositoryRoot, 'docs', 'quality', 'PUBLIC-310-CONTRACT-FIXTURES.md');
const harnessPath = path.join(repositoryRoot, 'src', 'test-harness', 'contract-fixtures.ts');

describe('PUBLIC-310 contract fixture tests', () => {
  it('pins the accepted public OpenAPI hash before validating fixtures', () => {
    const pin = readOpenApiHashPin();
    expect(pin).toBe(openapiHash.sha256);
    expect(existsSync(PUBLIC_OPENAPI_PATH)).toBe(true);
    expect(hashOpenApiArtifactLf()).toBe(CANONICAL_PUBLIC_OPENAPI_LF_SHA256);
    expect(hashOpenApiArtifactAccepted()).toBe(pin);
  });

  it('keeps consumer response fixtures byte-aligned with backend authoritative copies', () => {
    for (const spec of PUBLIC_RESPONSE_FIXTURES) {
      assertMatchesBackendFixture(
        CONSUMER_RESPONSES_DIR,
        BACKEND_PUBLIC_FIXTURES_DIR,
        spec.file,
      );
    }
  });

  it('validates consumer response fixtures against accepted OpenAPI components', () => {
    const artifact = readOpenApiArtifact();

    for (const spec of PUBLIC_RESPONSE_FIXTURES) {
      const payload = readJsonFixture<Record<string, unknown>>(
        CONSUMER_RESPONSES_DIR,
        spec.file,
      );

      if (spec.profileFieldsOnly) {
        assertProfileDetailShape(payload);
        continue;
      }

      if (!spec.component) {
        throw new Error(`Missing OpenAPI component mapping for ${spec.file}`);
      }

      validateComponent(artifact, spec.component, payload, {
        itemComponent: spec.itemComponent,
      });
    }
  });

  it('keeps public error fixtures byte-aligned with backend matrix rows', () => {
    for (const spec of PUBLIC_ERROR_FIXTURES) {
      assertMatchesBackendFixture(
        CONSUMER_ERRORS_DIR,
        BACKEND_ERROR_FIXTURES_DIR,
        spec.file,
      );
      validateErrorFixture(spec);
    }
  });

  it('ships checklist and harness wiring for CI contract validation', () => {
    expect(existsSync(harnessPath)).toBe(true);
    expect(existsSync(checklistPath)).toBe(true);
    expect(existsSync(CONSUMER_RESPONSES_DIR)).toBe(true);
    expect(existsSync(CONSUMER_ERRORS_DIR)).toBe(true);

    const checklist = readFileSync(checklistPath, 'utf8');
    expect(checklist).toContain('PUBLIC-310');
    expect(checklist).toContain('tests/fixtures/contracts/responses');
    expect(checklist).toContain('tests/fixtures/contracts/errors');
    expect(checklist).toContain('ERROR-COMPATIBILITY-MATRIX.md');
    expect(checklist).toContain('does **not** close `PUBLIC-190`');
  });
});
