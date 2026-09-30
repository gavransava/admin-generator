import { useState } from "react";
import { guessApiBaseUrl, saveBootstrap } from "../config/bootstrap.js";
import { login } from "../config/session.js";

interface Props {
  onSaved: () => void;
  initialEmail?: string;
}

export function BootstrapLogin({ onSaved, initialEmail }: Props) {
  const [apiBaseUrl, setApiBaseUrl] = useState(guessApiBaseUrl());
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    /^https?:\/\/.+/i.test(apiBaseUrl) && email.includes("@") && password.length > 0;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await login({ apiBaseUrl, email, password });
      if (!r.ok) {
        setError(r.message ?? "Login failed");
        return;
      }
      saveBootstrap({ apiBaseUrl, email });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-beige-100">
      <div className="max-w-md w-full space-y-4 p-6 bg-white rounded-lg border border-beige-200 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Admin sign in</h1>
        <p className="text-sm text-gray-600">
          Sign in once per browser. The session refreshes automatically; no need
          to paste tokens.
        </p>
        <label className="block text-sm">
          <span className="font-medium text-gray-800">API base URL</span>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value.trim())}
            placeholder="https://api-qa.zakazisam.rs/api"
            className="mt-1 w-full px-3 py-2 rounded border border-beige-300 font-mono text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-800">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            autoComplete="username"
            className="mt-1 w-full px-3 py-2 rounded border border-beige-300 text-sm"
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-800">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full px-3 py-2 rounded border border-beige-300 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit && !busy) void submit();
            }}
          />
        </label>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit || busy}
          className="px-4 py-2 rounded bg-primary-600 text-white text-sm disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-gray-500 border-t border-beige-200 pt-3">
          No server bundle yet?{" "}
          <a href="/studio" className="text-primary-700 hover:underline">
            Open the Studio
          </a>
          .
        </p>
      </div>
    </div>
  );
}
