import type { ApiResponse } from "@/types/api";

const DEFAULT_API_URL = "http://127.0.0.1:5001";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  cache?: RequestCache;
  signal?: AbortSignal;
};

async function parseEnvelope<T>(response: Response): Promise<T> {
  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("Invalid JSON response from API", response.status);
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(
      payload.message || payload.error || "Request failed",
      response.status,
      payload.error,
    );
  }

  return payload.data;
}

/**
 * Typed fetch wrapper for the Trade Journal Flask API.
 * Never puts business logic here — only transport + envelope parsing.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: options.cache ?? "no-store",
    signal: options.signal,
  });

  return parseEnvelope<T>(response);
}

/** Multipart request helper (e.g. backtest image upload). */
export async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  options: { method?: "POST" | "PUT" | "PATCH"; signal?: AbortSignal } = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: {
      Accept: "application/json",
    },
    body: formData,
    cache: "no-store",
    signal: options.signal,
  });

  return parseEnvelope<T>(response);
}

export function resolveApiAssetUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
