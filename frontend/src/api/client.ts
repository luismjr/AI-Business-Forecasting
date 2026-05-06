import type {
  ForecastResponse,
  MetricsResponse,
  Store,
  WhatIfOptions,
  WhatIfRequest,
  WhatIfResponse,
} from "./types";

/**
 * Base URL for API calls. In dev, leave empty to use the Vite proxy. For production,
 * set VITE_API_BASE to the full API origin (e.g. https://api.example.com).
 */
const base = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

function url(path: string): string {
  if (!path.startsWith("/")) {
    return `${base}/${path}`;
  }
  return `${base}${path}`;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(url(path), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      res.status === 404
        ? "Not found — check the store or API is running."
        : `Request failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ??
        `Request failed (${res.status}): ${res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

export function fetchStores(): Promise<Store[]> {
  return getJson<Store[]>("/api/stores");
}

export function fetchLastSevenDayMetrics(
  storeId: string,
): Promise<MetricsResponse> {
  return getJson<MetricsResponse>(
    `/api/stores/${encodeURIComponent(storeId)}/metrics/daily`,
  );
}

export function fetchRevenueForecast(
  storeId: string,
  horizon: string = "1d",
): Promise<ForecastResponse> {
  const q = new URLSearchParams({ horizon });
  return getJson<ForecastResponse>(
    `/api/stores/${encodeURIComponent(storeId)}/forecasts/revenue?${q}`,
  );
}

export function fetchWhatIfOptions(): Promise<WhatIfOptions> {
  return getJson<WhatIfOptions>("/api/what-if/options");
}

export function runWhatIf(body: WhatIfRequest): Promise<WhatIfResponse> {
  return postJson<WhatIfResponse>("/api/what-if", body);
}
