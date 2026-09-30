import { CONFIG_BUNDLE_VERSION } from "@studio/admin-schema";
import { useConfigBundle } from "./config/store.js";
import { AdminShell } from "./pages/AdminShell.js";
import { BootstrapLogin } from "./pages/BootstrapLogin.js";
import { BundleError } from "./pages/BundleError.js";
import { EmptyState } from "./pages/EmptyState.js";

export function App() {
  const { state, refresh } = useConfigBundle();

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 italic">
        Loading admin config…
      </div>
    );
  }

  if (state.kind === "need-bootstrap") {
    return <BootstrapLogin onSaved={refresh} initialEmail={state.savedEmail} />;
  }

  if (state.kind === "missing") return <EmptyState />;
  if (state.kind === "invalid") return <BundleError message={state.message} />;

  if (state.bundle.version !== CONFIG_BUNDLE_VERSION) {
    return (
      <BundleError
        message={`Config version ${state.bundle.version} not supported by this runtime (expected version ${CONFIG_BUNDLE_VERSION}). Regenerate in the Studio.`}
      />
    );
  }

  return <AdminShell bundle={state.bundle} configSource={state.source} onReset={refresh} />;
}
