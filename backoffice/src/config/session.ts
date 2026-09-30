import { getAccessToken, setAccessToken, type Bootstrap } from "./bootstrap.js";

/**
 * Session lifecycle helpers backing the admin panel:
 *
 * - `login`  — POST /auth/login (sets refresh cookie on API origin)
 * - `refresh` — POST /auth/refresh (uses cookie; returns new accessToken)
 * - `logout` — POST /auth/logout (revokes refresh cookie)
 * - `authFetch` — like `fetch` but attaches Bearer + auto-retries once
 *   after a silent refresh when a 401 comes back.
 */

export interface LoginRequest {
  apiBaseUrl: string;
  email: string;
  password: string;
}

export interface LoginResult {
  ok: boolean;
  message?: string;
}

export async function login(req: LoginRequest): Promise<LoginResult> {
  const base = req.apiBaseUrl.replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: req.email, password: req.password }),
    });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) msg = body.message;
    } catch {
      // ignore
    }
    return { ok: false, message: msg };
  }
  const body = (await res.json()) as { data?: { tokens?: { accessToken?: string } } };
  const token = body?.data?.tokens?.accessToken;
  if (!token) return { ok: false, message: "Login response missing accessToken" };
  setAccessToken(token);
  return { ok: true };
}

export async function refresh(b: Bootstrap): Promise<boolean> {
  const base = b.apiBaseUrl.replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const body = (await res.json()) as { data?: { tokens?: { accessToken?: string } } };
  const token = body?.data?.tokens?.accessToken;
  if (!token) return false;
  setAccessToken(token);
  return true;
}

export async function logout(b: Bootstrap): Promise<void> {
  const base = b.apiBaseUrl.replace(/\/+$/, "");
  try {
    await fetch(`${base}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // swallow — even if the network call fails, we clear local state
  }
  setAccessToken(null);
}

/**
 * `fetch` wrapper that attaches Bearer + auto-refreshes once on 401.
 * Requires a bootstrap identity to know where /auth/refresh lives.
 */
export async function authFetch(
  input: string,
  init: RequestInit,
  bootstrap: Bootstrap,
): Promise<Response> {
  const attempt = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, {
      ...init,
      credentials: "include",
      headers,
    });
  };

  const res = await attempt(getAccessToken());
  if (res.status !== 401) return res;

  const refreshed = await refresh(bootstrap);
  if (!refreshed) return res;
  return attempt(getAccessToken());
}
