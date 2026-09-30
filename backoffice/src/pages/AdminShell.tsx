import type { ConfigBundle, ResourceDef } from "@studio/admin-schema";
import { LOCAL_STORAGE_KEY } from "@studio/admin-schema";
import { Sidebar } from "@studio/admin-ui";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { clearBootstrap, loadBootstrap } from "../config/bootstrap.js";
import { deleteServerConfig } from "../config/serverConfig.js";
import { ResourceDetail } from "./ResourceDetail.js";
import { ResourceForm } from "./ResourceForm.js";
import { ResourceList } from "./ResourceList.js";

/**
 * Resource names dropped at render time. Keeps existing server-side
 * bundles clean even when they were saved before the wizard-side
 * filter shipped: tenant-scoped `companies/bookings/slots/patterns`,
 * plus internal plumbing (`admin-config`, `health`).
 */
const HIDDEN_RESOURCE_NAMES = new Set<string>([
  "admin-config",
  "health",
  "slots",
  "bookings",
  "companies",
  "patterns",
]);

function useVisibleResources(bundle: ConfigBundle): ResourceDef[] {
  return useMemo(
    () => bundle.resources.filter((r) => !HIDDEN_RESOURCE_NAMES.has(r.name)),
    [bundle],
  );
}

function ResourceRoute({
  bundle,
  view,
}: {
  bundle: ConfigBundle;
  view: "list" | "detail" | "create" | "edit";
}) {
  const { resource: name } = useParams<{ resource: string }>();
  const resource =
    name && !HIDDEN_RESOURCE_NAMES.has(name)
      ? bundle.resources.find((r) => r.name === name)
      : undefined;
  if (!resource) return <Navigate to="/" replace />;
  if (view === "list") return <ResourceList bundle={bundle} resource={resource} />;
  if (view === "detail") return <ResourceDetail bundle={bundle} resource={resource} />;
  if (view === "create")
    return <ResourceForm bundle={bundle} resource={resource} mode="create" />;
  return <ResourceForm bundle={bundle} resource={resource} mode="edit" />;
}

interface AdminShellProps {
  bundle: ConfigBundle;
  configSource?: "server" | "local" | "preview";
  onReset?: () => void;
}

async function resetAll(deleteServerBundle: boolean, onReset?: () => void) {
  const boot = loadBootstrap();
  if (deleteServerBundle && boot) {
    try {
      await deleteServerConfig(boot);
    } catch {
      // best-effort — even if server call fails, wipe local state below
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  clearBootstrap();
  onReset?.();
}

export function AdminShell({ bundle, configSource, onReset }: AdminShellProps) {
  const nav = useNavigate();
  const visibleResources = useVisibleResources(bundle);
  const first = visibleResources[0];
  const activeName = window.location.pathname.split("/")[1] ?? "";

  const onResetClick = () => {
    const deleteServer = window.confirm(
      "Reset admin panel? Local browser config will be cleared. Also delete the server-stored bundle? OK = yes, Cancel = local-only reset.",
    );
    void resetAll(deleteServer, onReset);
  };

  return (
    <div className="flex min-h-screen bg-beige-100 text-gray-900">
      <Sidebar
        branding={bundle.branding}
        resources={visibleResources}
        activeResourceName={activeName}
        onSelect={(r) => nav(`/${r.name}`)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-14 flex items-center justify-between gap-4 border-b border-beige-200 bg-white/80 backdrop-blur px-6">
          <div className="text-xs text-gray-500">
            Config source: <span className="font-mono">{configSource ?? "unknown"}</span>
          </div>
          <button
            type="button"
            onClick={onResetClick}
            className="text-sm text-red-700 hover:text-red-800 hover:underline"
          >
            Reset admin panel
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
            <Routes>
              <Route
                path="/"
                element={first ? <Navigate to={`/${first.name}`} replace /> : <EmptyPane />}
              />
              <Route
                path=":resource"
                element={<ResourceRoute bundle={bundle} view="list" />}
              />
              <Route
                path=":resource/new"
                element={<ResourceRoute bundle={bundle} view="create" />}
              />
              <Route
                path=":resource/:id"
                element={<ResourceRoute bundle={bundle} view="detail" />}
              />
              <Route
                path=":resource/:id/edit"
                element={<ResourceRoute bundle={bundle} view="edit" />}
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyPane() {
  return (
    <div className="text-gray-600 text-sm">
      This admin has no resources configured. Regenerate in the Studio.
    </div>
  );
}
