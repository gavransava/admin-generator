import type { ConfigBundle } from "@studio/admin-schema";
import { ConfigBundleSchema, LOCAL_STORAGE_KEY } from "@studio/admin-schema";

export type LoadResult =
  | { kind: "ok"; bundle: ConfigBundle }
  | { kind: "missing" }
  | { kind: "invalid"; message: string };

export function loadBundle(): LoadResult {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
  if (!raw) return { kind: "missing" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "invalid", message: "Stored config is not valid JSON" };
  }
  const result = ConfigBundleSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.errors[0];
    const path = first.path.join(".");
    return {
      kind: "invalid",
      message: `${path || "(root)"} — ${first.message}`,
    };
  }
  return { kind: "ok", bundle: result.data };
}
