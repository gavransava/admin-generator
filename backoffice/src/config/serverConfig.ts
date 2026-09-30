import type { ConfigBundle } from "@studio/admin-schema";
import { ConfigBundleSchema } from "@studio/admin-schema";
import type { Bootstrap } from "./bootstrap.js";
import { authFetch } from "./session.js";

export type ServerConfigResult =
  | { kind: "ok"; bundle: ConfigBundle }
  | { kind: "missing" }
  | { kind: "unauthorized" }
  | { kind: "invalid"; message: string }
  | { kind: "network-error"; message: string };

export async function fetchServerConfig(b: Bootstrap): Promise<ServerConfigResult> {
  let res: Response;
  try {
    res = await authFetch(
      `${b.apiBaseUrl.replace(/\/+$/, "")}/admin/config`,
      { method: "GET", headers: { Accept: "application/json" } },
      b,
    );
  } catch (err) {
    return { kind: "network-error", message: (err as Error).message };
  }

  if (res.status === 401 || res.status === 403) return { kind: "unauthorized" };
  if (res.status === 404) return { kind: "missing" };
  if (!res.ok) {
    return { kind: "network-error", message: `HTTP ${res.status}` };
  }
  const body = (await res.json()) as { data?: { bundle?: unknown } };
  const parsed = ConfigBundleSchema.safeParse(body?.data?.bundle);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      kind: "invalid",
      message: `${first.path.join(".") || "(root)"} — ${first.message}`,
    };
  }
  return { kind: "ok", bundle: parsed.data };
}

export async function deleteServerConfig(b: Bootstrap): Promise<void> {
  await authFetch(
    `${b.apiBaseUrl.replace(/\/+$/, "")}/admin/config`,
    { method: "DELETE" },
    b,
  );
}
