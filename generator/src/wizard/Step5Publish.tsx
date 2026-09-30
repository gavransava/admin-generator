import { ConfigBundleSchema } from "@studio/admin-schema";
import { useMemo, useState } from "react";
import { useWizard } from "../store/wizard.js";

export function Step5Publish() {
  const branding = useWizard((s) => s.branding);
  const setBranding = useWizard((s) => s.setBranding);
  const buildBundle = useWizard((s) => s.buildBundle);
  const publish = useWizard((s) => s.publish);
  const publishToServer = useWizard((s) => s.publishToServer);
  const auth = useWizard((s) => s.auth);
  const setStep = useWizard((s) => s.setStep);

  const bundle = useMemo(buildBundle, [buildBundle, branding]);
  const validation = useMemo(() => {
    const r = ConfigBundleSchema.safeParse(bundle);
    if (r.success) return { ok: true as const };
    const first = r.error.errors[0];
    return {
      ok: false as const,
      path: first.path.join("."),
      msg: first.message,
    };
  }, [bundle]);

  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [serverSavedAt, setServerSavedAt] = useState<string | null>(null);
  const [publishingServer, setPublishingServer] = useState(false);

  const doPublish = () => {
    setPublishError(null);
    const r = publish();
    if (r.ok) {
      setPublished(true);
      window.open("/", "_blank", "noopener");
    } else {
      setPublishError(r.error);
    }
  };

  const doPublishToServer = async () => {
    setPublishError(null);
    setPublishingServer(true);
    try {
      const r = await publishToServer();
      if (r.ok) {
        setServerSavedAt(r.updatedAt);
      } else {
        setServerSavedAt(null);
        setPublishError(r.error);
      }
    } finally {
      setPublishingServer(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Branding + Launch</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Product name
          </span>
          <input
            className="mt-1 w-full border border-beige-300 rounded px-2 py-1"
            value={branding.productName}
            onChange={(e) => setBranding({ productName: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Primary color
          </span>
          <input
            type="color"
            className="mt-1 w-full h-9 border border-beige-300 rounded"
            value={branding.primaryColor}
            onChange={(e) => setBranding({ primaryColor: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Logo URL (optional)
          </span>
          <input
            type="url"
            className="mt-1 w-full border border-beige-300 rounded px-2 py-1"
            value={branding.logoUrl ?? ""}
            onChange={(e) => setBranding({ logoUrl: e.target.value || undefined })}
          />
        </label>
      </div>

      <div className="border border-beige-200 rounded p-4 bg-white">
        <h4 className="text-sm font-semibold mb-2">Bundle preview</h4>
        <pre className="bg-beige-50 p-3 rounded text-xs overflow-auto max-h-64">
{JSON.stringify(bundle, null, 2)}
        </pre>
      </div>

      {!validation.ok && (
        <div className="border border-red-200 bg-red-50 rounded p-3 text-sm text-red-900">
          Invalid: <code>{validation.path}</code> — {validation.msg}
        </div>
      )}

      {publishError && (
        <div className="border border-red-200 bg-red-50 rounded p-3 text-sm text-red-900">
          {publishError}
        </div>
      )}

      {published && (
        <div className="border border-emerald-200 bg-emerald-50 rounded p-3 text-sm text-emerald-900">
          Launched locally. Backoffice opened in a new tab. Storage event
          will hot-reload any open Backoffice tab.
        </div>
      )}

      {serverSavedAt && (
        <div className="border border-emerald-200 bg-emerald-50 rounded p-3 text-sm text-emerald-900">
          <div className="font-medium">Saved to server ✓</div>
          <div className="text-xs text-emerald-800">
            Server updatedAt: {new Date(serverSavedAt).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-800 mt-1">
            Other admins on any device (after they sign in) will pick up this
            config on next load.
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => setStep(4)}
          className="px-4 py-2 rounded border border-beige-300"
        >
          Back
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!validation.ok || auth.kind !== "bearer" || publishingServer}
            onClick={doPublishToServer}
            className={`px-4 py-2 rounded border disabled:opacity-50 ${
              serverSavedAt
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-primary-600 text-primary-700"
            }`}
            title={
              auth.kind !== "bearer"
                ? "Server publish requires Bearer auth in Step 1"
                : "PUT bundle to /api/admin/config"
            }
          >
            {publishingServer
              ? "Saving…"
              : serverSavedAt
                ? "Saved ✓ — save again"
                : "Save to server"}
          </button>
          <button
            type="button"
            disabled={!validation.ok}
            onClick={doPublish}
            className="px-4 py-2 rounded bg-primary-600 text-white disabled:opacity-50"
          >
            Launch (local)
          </button>
        </div>
      </div>
    </div>
  );
}
