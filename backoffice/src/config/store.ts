import type { ConfigBundle } from "@studio/admin-schema";
import { ConfigBundleSchema, LOCAL_STORAGE_KEY } from "@studio/admin-schema";
import { useCallback, useEffect, useState } from "react";
import { loadBundle } from "./load.js";
import {
  getAccessToken,
  loadBootstrap,
  type Bootstrap,
} from "./bootstrap.js";
import { fetchServerConfig } from "./serverConfig.js";
import { refresh } from "./session.js";

export type ConfigState =
  | { kind: "loading" }
  | { kind: "need-bootstrap"; savedEmail?: string }
  | { kind: "ok"; bundle: ConfigBundle; source: "server" | "local" | "preview" }
  | { kind: "missing" }
  | { kind: "invalid"; message: string };

interface UseConfigBundle {
  state: ConfigState;
  refresh: () => void;
}

function readLocal(): ConfigBundle | null {
  const r = loadBundle();
  if (r.kind === "ok") return r.bundle;
  return null;
}

export function useConfigBundle(): UseConfigBundle {
  const [state, setState] = useState<ConfigState>({ kind: "loading" });

  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  const [previewBundle, setPreviewBundle] = useState<ConfigBundle | null>(null);

  const load = useCallback(async () => {
    if (isPreview) {
      setState({ kind: "loading" });
      return;
    }
    const local = readLocal();
    if (local) setState({ kind: "ok", bundle: local, source: "local" });

    const boot = loadBootstrap();
    if (!boot) {
      if (!local) setState({ kind: "need-bootstrap" });
      return;
    }

    // If we have a bootstrap but no live access token yet, try silently
    // refreshing via the httpOnly cookie set at last login. First page
    // load after a browser restart falls through this branch.
    if (!getAccessToken()) {
      const refreshed = await refresh(boot);
      if (!refreshed) {
        // Cookie missing/expired — force re-login.
        if (!local) setState({ kind: "need-bootstrap", savedEmail: boot.email });
        else setState({ kind: "ok", bundle: local, source: "local" });
        return;
      }
    }

    const server = await fetchServerConfig(boot);
    if (server.kind === "ok") {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(server.bundle));
      } catch {
        // ignore quota
      }
      setState({ kind: "ok", bundle: server.bundle, source: "server" });
      return;
    }
    if (server.kind === "missing") {
      if (!local) setState({ kind: "missing" });
      return;
    }
    if (server.kind === "unauthorized") {
      if (!local) setState({ kind: "need-bootstrap", savedEmail: boot.email });
      return;
    }
    if (server.kind === "invalid") {
      setState({ kind: "invalid", message: server.message });
      return;
    }
    if (!local) setState({ kind: "missing" });
  }, [isPreview]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isPreview) {
      const onMsg = (e: MessageEvent) => {
        const data = e.data as unknown as { type?: string; bundle?: ConfigBundle };
        if (data?.type === "config-preview" && data.bundle) {
          const parsed = ConfigBundleSchema.safeParse(data.bundle);
          if (parsed.success) setPreviewBundle(parsed.data);
        }
      };
      window.addEventListener("message", onMsg);
      return () => window.removeEventListener("message", onMsg);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) void load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isPreview, load]);

  if (isPreview) {
    if (previewBundle) {
      return {
        state: { kind: "ok", bundle: previewBundle, source: "preview" },
        refresh: () => void load(),
      };
    }
    return { state: { kind: "loading" }, refresh: () => void load() };
  }

  return { state, refresh: () => void load() };
}

export type { Bootstrap };
