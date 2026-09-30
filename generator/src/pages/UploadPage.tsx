import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ingestFile, ingestUrl, IngestError } from "../parser/ingest.js";
import { detectResources } from "../parser/resources.js";
import { useWizard } from "../store/wizard.js";

export function UploadPage() {
  const nav = useNavigate();
  const setDoc = useWizard((s) => s.setDoc);
  const setError = useWizard((s) => s.setIngestError);
  const err = useWizard((s) => s.ingestError);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const doc = await ingestFile(file);
      const { resources, unmapped, relatedByParent } = detectResources(doc);
      setDoc(doc, resources, unmapped, relatedByParent);
      nav("/wizard");
    } catch (e) {
      setError(e instanceof IngestError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUrl = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const doc = await ingestUrl(url);
      const { resources, unmapped, relatedByParent } = detectResources(doc);
      setDoc(doc, resources, unmapped, relatedByParent);
      nav("/wizard");
    } catch (e) {
      setError(e instanceof IngestError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-6 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-primary-700">Admin Studio</h1>
        <p className="mt-2 text-gray-600">
          Upload an OpenAPI 3.x document. Studio walks you through a 5-step
          wizard and produces a working admin panel that talks to your API.
        </p>
      </header>

      <section className="border border-dashed border-beige-300 rounded-lg p-8 bg-white space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            OpenAPI file (.json or .yaml)
          </span>
          <input
            type="file"
            accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
            className="mt-2 block w-full text-sm"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        <div className="text-center text-xs text-gray-400">— or —</div>

        <div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Fetch from URL
            </span>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                placeholder="https://api.example.com/openapi.json"
                className="flex-1 border border-beige-300 rounded px-3 py-2"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleUrl}
                disabled={loading || !url}
                className="px-4 py-2 rounded bg-primary-600 text-white disabled:opacity-50"
              >
                {loading ? "Fetching…" : "Fetch"}
              </button>
            </div>
          </label>
        </div>
      </section>

      {err && (
        <div className="border border-red-200 bg-red-50 rounded p-4">
          <p className="font-medium text-red-900">Ingest failed</p>
          <p className="mt-1 text-sm text-red-800 whitespace-pre-wrap">{err}</p>
        </div>
      )}
    </div>
  );
}
