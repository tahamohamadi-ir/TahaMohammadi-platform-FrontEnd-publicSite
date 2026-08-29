import type { paths } from "../../generated/public-api";

export type PublicApiPaths = paths;

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
  };
}

/** Defense-in-depth published-only gate for detail records (PUBLIC-100). */
export function assertPublishedOnly<T extends { published_at?: string | null }>(
  record: T,
): T {
  if (record.published_at == null) {
    throw new PublicApiError("Record is not published", "unavailable", 404);
  }
  return record;
}

export function getPublicApiBaseUrl(): string {
  const fromEnv = import.meta.env.PUBLIC_API_BASE_URL;
  if (!fromEnv) {
    throw new Error("PUBLIC_API_BASE_URL is not configured");
  }
  return normalizeBaseUrl(fromEnv);
}
