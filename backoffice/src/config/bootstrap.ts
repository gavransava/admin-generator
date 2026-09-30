/**
 * Bootstrap credentials: the minimum info needed to reach the admin
 * API. We persist only the identity (api base URL + email) so the
 * boot page can pre-fill on next visit. The access token lives in
 * memory only; the refresh cookie is httpOnly and stays on the API
 * origin.
 */
const BOOTSTRAP_KEY = "admin-bootstrap:v2";

export interface Bootstrap {
  apiBaseUrl: string;
  email: string;
}

export function loadBootstrap(): Bootstrap | null {
  const raw =
    typeof localStorage !== "undefined" ? localStorage.getItem(BOOTSTRAP_KEY) : null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Bootstrap;
    if (
      typeof parsed?.apiBaseUrl === "string" &&
      typeof parsed?.email === "string" &&
      parsed.apiBaseUrl.length > 0 &&
      parsed.email.length > 0
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

export function saveBootstrap(b: Bootstrap): void {
  localStorage.setItem(
    BOOTSTRAP_KEY,
    JSON.stringify({
      apiBaseUrl: b.apiBaseUrl.trim().replace(/\/+$/, ""),
      email: b.email.trim(),
    }),
  );
}

export function clearBootstrap(): void {
  localStorage.removeItem(BOOTSTRAP_KEY);
  // Also nuke the previous v1 shape if it lingers.
  localStorage.removeItem("admin-bootstrap:v1");
}

export function guessApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "admin.zakazisam.rs") return "https://api.zakazisam.rs/api";
  if (host === "admin-qa.zakazisam.rs") return "https://api-qa.zakazisam.rs/api";
  return "";
}

// ─── In-memory access token ──────────────────────────────────────────────

let accessToken: string | null = null;
type Listener = (t: string | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(t: string | null): void {
  accessToken = t;
  for (const l of listeners) l(t);
}

export function subscribeAccessToken(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
