import type {
  AuthConfig,
  Branding,
  ConfigBundle,
  ResourceDef,
} from "@studio/admin-schema";
import { CONFIG_BUNDLE_VERSION, LOCAL_STORAGE_KEY } from "@studio/admin-schema";
import { create } from "zustand";
import type { NormalizedDocument, UnmappedOperation } from "../parser/types.js";

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface WizardState {
  doc: NormalizedDocument | null;
  ingestError: string | null;
  resources: ResourceDef[];
  unmapped: UnmappedOperation[];
  relatedByParent: Map<string, string[]>;
  step: WizardStep;
  auth: AuthConfig;
  apiBaseUrl: string;
  branding: Branding;
  setDoc(
    doc: NormalizedDocument | null,
    resources: ResourceDef[],
    unmapped: UnmappedOperation[],
    related: Map<string, string[]>,
  ): void;
  setIngestError(msg: string | null): void;
  setStep(step: WizardStep): void;
  setAuth(auth: AuthConfig): void;
  setApiBaseUrl(url: string): void;
  updateResource(name: string, patch: Partial<ResourceDef>): void;
  setBranding(patch: Partial<Branding>): void;
  reset(): void;
  buildBundle(): ConfigBundle;
  publish(): { ok: true } | { ok: false; error: string };
  publishToServer(): Promise<
    | { ok: true; updatedAt: string }
    | { ok: false; error: string }
  >;
}

const initialBranding: Branding = {
  productName: "Admin",
  primaryColor: "#586c31",
};

/**
 * Resource names dropped from the wizard before Step 2 renders them.
 * Two categories:
 * - internal plumbing served over CRUD-shaped URLs (`admin-config`,
 *   `health`) whose bodies aren't collections
 * - tenant-scoped endpoints that a cross-tenant super-admin panel
 *   can't sensibly interact with; the `admin-*` variants replace them.
 */
const HIDDEN_RESOURCE_NAMES = new Set<string>([
  "admin-config",
  "health",
  "slots",
  "bookings",
  "companies",
  "patterns",
]);

export const useWizard = create<WizardState>((set, get) => ({
  doc: null,
  ingestError: null,
  resources: [],
  unmapped: [],
  relatedByParent: new Map(),
  step: 0,
  auth: { kind: "none" },
  apiBaseUrl: "",
  branding: initialBranding,
  setDoc(doc, resources, unmapped, related) {
    const server = doc?.servers[0] ?? "";
    set({
      doc,
      resources: resources.filter((r) => !HIDDEN_RESOURCE_NAMES.has(r.name)),
      unmapped,
      relatedByParent: related,
      ingestError: null,
      step: doc ? 1 : 0,
      apiBaseUrl: server,
    });
  },
  setIngestError(msg) {
    set({ ingestError: msg });
  },
  setStep(step) {
    set({ step });
  },
  setAuth(auth) {
    set({ auth });
  },
  setApiBaseUrl(url) {
    set({ apiBaseUrl: url.trim() });
  },
  updateResource(name, patch) {
    set({
      resources: get().resources.map((r) =>
        r.name === name ? { ...r, ...patch } : r,
      ),
    });
  },
  setBranding(patch) {
    set({ branding: { ...get().branding, ...patch } });
  },
  reset() {
    set({
      doc: null,
      ingestError: null,
      resources: [],
      unmapped: [],
      relatedByParent: new Map(),
      step: 0,
      auth: { kind: "none" },
      apiBaseUrl: "",
      branding: initialBranding,
    });
  },
  buildBundle() {
    const { apiBaseUrl, auth, branding, resources } = get();
    return {
      version: CONFIG_BUNDLE_VERSION,
      apiBaseUrl,
      auth,
      branding,
      resources,
    };
  },
  publish() {
    const bundle = get().buildBundle();
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bundle));
      return { ok: true };
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        return {
          ok: false,
          error:
            "Config too large for browser storage — remove logo data URI or reduce resources",
        };
      }
      return { ok: false, error: (e as Error).message };
    }
  },
  async publishToServer() {
    const { apiBaseUrl, auth } = get();
    if (auth.kind !== "bearer") {
      return {
        ok: false as const,
        error: "Server publish requires Bearer auth in Step 1 (admin JWT).",
      };
    }
    const bundle = get().buildBundle();
    const base = apiBaseUrl.replace(/\/+$/, "");

    const put = async (token: string) =>
      fetch(`${base}/admin/config`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bundle }),
      });

    try {
      let res = await put(auth.token);

      // If the pasted Step-1 token has expired since the user walked the
      // wizard, try one silent refresh via the httpOnly cookie set at
      // that user's earlier /auth/login. Only works when they signed in
      // through the same origin; falls through otherwise.
      if (res.status === 401) {
        const refreshRes = await fetch(`${base}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (refreshRes.ok) {
          const body = (await refreshRes.json()) as {
            data?: { tokens?: { accessToken?: string } };
          };
          const fresh = body?.data?.tokens?.accessToken;
          if (fresh) {
            set({ auth: { kind: "bearer", token: fresh } });
            res = await put(fresh);
          }
        }
      }

      if (!res.ok) {
        const text = await res.text();
        return {
          ok: false as const,
          error: `Server publish failed: HTTP ${res.status} ${text.slice(0, 200)}`,
        };
      }
      const body = (await res.json()) as {
        data?: { updatedAt?: string };
      };
      return {
        ok: true as const,
        updatedAt: body?.data?.updatedAt ?? new Date().toISOString(),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  },
}));

export const PROD_HOSTS = ["https://api.zakazisam.rs"];
export function isProdTarget(url: string): boolean {
  return PROD_HOSTS.some((h) => url.startsWith(h));
}
