import { getPublicEnv } from "../env";
import type { paths } from "../../generated/public-api";

export type PublicApiPaths = paths;

export interface PublishedRecord {
  published_at?: string | null;
}

export class PublicApiError extends Error {
  readonly kind: "network" | "http" | "validation" | "unavailable";
  readonly status?: number;

  constructor(
    message: string,
    kind: PublicApiError["kind"],
    status?: number,
  ) {
    super(message);
    this.name = "PublicApiError";
    this.kind = kind;
    this.status = status;
  }
}

export interface PublicApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function createPublicApiClient(options: PublicApiClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async request<Path extends keyof paths>(
      path: Path,
      init: RequestInit = {},
    ): Promise<Response> {
      const url = `${baseUrl}${String(path)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...init.headers,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new PublicApiError("Request timed out", "network");
        }
        throw new PublicApiError("Network request failed", "network");
      } finally {
        clearTimeout(timer);
      }
    },

    async get<Path extends keyof paths>(
      path: Path,
      init?: RequestInit,
    ): Promise<Response> {
      return this.request(path, { ...init, method: "GET" });
    },

    async getJson<Path extends keyof paths, T>(
      path: Path,
      init?: RequestInit,
    ): Promise<T> {
      const response = await this.get(path, init);
      return parseJsonResponse<T>(response);
    },
  };
}

/** Parse JSON and map HTTP failures to PublicApiError (PUBLIC-100). */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const status = response.status;
    if (status === 404) {
      throw new PublicApiError("Resource not found", "unavailable", status);
    }
    throw new PublicApiError(
      `Request failed with status ${status}`,
      "http",
      status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new PublicApiError("Invalid JSON response", "validation");
  }
}

/** Defense-in-depth published-only gate for detail records (PUBLIC-100). */
export function assertPublishedOnly<T extends PublishedRecord>(record: T): T {
  if (record.published_at == null) {
    throw new PublicApiError("Record is not published", "unavailable", 404);
  }
  return record;
}

/** Drop list items that are not published (PUBLIC-100). */
export function filterPublishedOnly<T extends PublishedRecord>(records: T[]): T[] {
  return records.filter((record) => record.published_at != null);
}

export function getPublicApiBaseUrl(): string {
  return getPublicEnv().apiBaseUrl;
}

export function createDefaultPublicApiClient() {
  return createPublicApiClient({ baseUrl: getPublicApiBaseUrl() });
}
