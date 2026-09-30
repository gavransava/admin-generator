import type { AuthConfig } from "@studio/admin-schema";
import { getAccessToken, loadBootstrap } from "../config/bootstrap.js";
import { authFetch } from "../config/session.js";

export interface ApiRequest {
  method: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
  }
}

function buildUrl(baseUrl: string, path: string, query?: ApiRequest["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function substituteId(path: string, id: string | number): string {
  return path.replace(/\{[^}]+\}/g, encodeURIComponent(String(id)));
}

function authHeaders(auth: AuthConfig): Record<string, string> {
  if (auth.kind === "bearer") {
    // Prefer the live in-memory session token (refreshed automatically)
    // over the wizard-baked one — the baked token expires within an hour
    // and is only used as a fallback for tests or preview mode.
    const sessionToken = getAccessToken();
    return { Authorization: `Bearer ${sessionToken ?? auth.token}` };
  }
  if (auth.kind === "header") return { [auth.name]: auth.value };
  return {};
}

// Unwraps common `{ success, data, pagination? }` response envelopes so the
// caller gets `data` directly. Falls through when the shape doesn't look
// like an envelope (raw arrays, non-object bodies, etc).
function unwrapEnvelope(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const obj = json as Record<string, unknown>;
  const keys = new Set(Object.keys(obj));
  if (!keys.has("data")) return json;
  // Any of these are recognised envelope shapes:
  //   { data }
  //   { data, meta }         (legacy)
  //   { data, pagination }
  //   { success, data }
  //   { success, data, pagination }
  //   { success, data, message }
  const allowed = new Set([
    "data",
    "success",
    "pagination",
    "meta",
    "message",
  ]);
  for (const k of keys) if (!allowed.has(k)) return json;
  return obj.data;
}

export interface RequestContext {
  apiBaseUrl: string;
  auth: AuthConfig;
}

export async function apiRequest(
  ctx: RequestContext,
  req: ApiRequest,
  idSubstitution?: string | number,
): Promise<unknown> {
  const path = idSubstitution != null ? substituteId(req.path, idSubstitution) : req.path;
  const url = buildUrl(ctx.apiBaseUrl, path, req.query);
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(ctx.auth),
  };
  if (req.body != null) headers["Content-Type"] = "application/json";

  const boot = loadBootstrap();
  const doFetch =
    boot && ctx.auth.kind === "bearer"
      ? (u: string, init: RequestInit) => authFetch(u, init, boot)
      : (u: string, init: RequestInit) => fetch(u, init);

  const res = await doFetch(url, {
    method: req.method,
    headers,
    body: req.body != null ? JSON.stringify(req.body) : undefined,
  });

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as Record<string, unknown>).message)
        : `HTTP ${res.status}`) as string;
    throw new ApiError(res.status, message, payload);
  }

  return unwrapEnvelope(payload);
}
