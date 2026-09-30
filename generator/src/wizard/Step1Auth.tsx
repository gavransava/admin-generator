import { isProdTarget, useWizard } from "../store/wizard.js";

export function Step1Auth() {
  const apiBaseUrl = useWizard((s) => s.apiBaseUrl);
  const auth = useWizard((s) => s.auth);
  const setApiBaseUrl = useWizard((s) => s.setApiBaseUrl);
  const setAuth = useWizard((s) => s.setAuth);
  const setStep = useWizard((s) => s.setStep);

  const urlValid = /^https?:\/\/.+/i.test(apiBaseUrl);
  let authValid = false;
  if (auth.kind === "none") authValid = true;
  if (auth.kind === "bearer") authValid = auth.token.length > 0;
  if (auth.kind === "header") authValid = auth.name.length > 0 && auth.value.length > 0;

  const canNext = urlValid && authValid;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API base URL
        </label>
        <input
          type="url"
          className="w-full border border-beige-300 rounded px-3 py-2"
          placeholder="https://api.example.com"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value.trim())}
        />
      </div>

      {isProdTarget(apiBaseUrl) && (
        <div className="border border-red-300 bg-red-50 text-red-900 rounded p-3 text-sm">
          <strong>PROD</strong> — every action will mutate real data.
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">
          Auth scheme
        </legend>
        {(["none", "bearer", "header"] as const).map((kind) => (
          <label key={kind} className="flex items-center gap-2">
            <input
              type="radio"
              name="auth"
              checked={auth.kind === kind}
              onChange={() => {
                if (kind === "none") setAuth({ kind: "none" });
                if (kind === "bearer") setAuth({ kind: "bearer", token: "" });
                if (kind === "header")
                  setAuth({ kind: "header", name: "", value: "" });
              }}
            />
            <span className="text-sm capitalize">{kind}</span>
          </label>
        ))}

        {auth.kind === "bearer" && (
          <input
            type="text"
            className="mt-2 w-full border border-beige-300 rounded px-3 py-2 font-mono text-sm"
            placeholder="Bearer token"
            value={auth.token}
            onChange={(e) => setAuth({ kind: "bearer", token: e.target.value })}
          />
        )}
        {auth.kind === "header" && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              className="flex-1 border border-beige-300 rounded px-3 py-2 font-mono text-sm"
              placeholder="Header name (e.g. X-API-Key)"
              value={auth.name}
              onChange={(e) =>
                setAuth({ kind: "header", name: e.target.value, value: auth.value })
              }
            />
            <input
              type="text"
              className="flex-1 border border-beige-300 rounded px-3 py-2 font-mono text-sm"
              placeholder="Header value"
              value={auth.value}
              onChange={(e) =>
                setAuth({ kind: "header", name: auth.name, value: e.target.value })
              }
            />
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Token stored in your browser localStorage. Use only against APIs you
          own or explicitly demo credentials.
        </p>
      </fieldset>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setStep(2)}
          className="px-4 py-2 rounded bg-primary-600 text-white disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
