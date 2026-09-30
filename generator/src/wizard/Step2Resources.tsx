import { useWizard } from "../store/wizard.js";

export function Step2Resources() {
  const resources = useWizard((s) => s.resources);
  const unmapped = useWizard((s) => s.unmapped);
  const updateResource = useWizard((s) => s.updateResource);
  const setStep = useWizard((s) => s.setStep);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">
          Resources ({resources.length})
        </h3>
        <p className="text-sm text-gray-600">
          Adjust display label, columns, and search fields per resource. Every
          value is inferred deterministically from the swagger; overrides are
          optional.
        </p>
      </div>

      <ul className="space-y-4">
        {resources.map((r) => {
          const fieldNames = r.fields.map((f) => f.name);
          return (
            <li
              key={r.name}
              className="border border-beige-200 rounded bg-white p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-beige-100 px-2 py-0.5 rounded">
                  /{r.name}
                </span>
                <input
                  type="text"
                  value={r.label}
                  onChange={(e) =>
                    updateResource(r.name, { label: e.target.value })
                  }
                  className="flex-1 border border-beige-300 rounded px-2 py-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="block">
                  <span className="text-gray-600">Row label field</span>
                  <select
                    className="mt-1 w-full border border-beige-300 rounded px-2 py-1"
                    value={r.displayLabelField}
                    onChange={(e) =>
                      updateResource(r.name, {
                        displayLabelField: e.target.value,
                      })
                    }
                  >
                    {fieldNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-gray-600">Pagination</span>
                  <span className="mt-1 block bg-beige-50 px-2 py-1 rounded text-gray-700">
                    {r.pagination.style}
                  </span>
                </label>
              </div>

              <div className="text-sm">
                <span className="text-gray-600 block mb-1">
                  List columns (order + visibility)
                </span>
                <div className="flex flex-wrap gap-2">
                  {fieldNames.map((n) => {
                    const on = r.listColumns.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          updateResource(r.name, {
                            listColumns: on
                              ? r.listColumns.filter((c) => c !== n)
                              : [...r.listColumns, n],
                          })
                        }
                        className={`px-2 py-1 rounded border text-xs ${
                          on
                            ? "bg-primary-600 text-white border-primary-700"
                            : "bg-white text-gray-700 border-beige-300"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                <div>
                  Search:{" "}
                  <strong className={r.search.enabled ? "text-primary-700" : ""}>
                    {r.search.enabled ? r.search.paramName : "off"}
                  </strong>
                </div>
                <div>
                  Sort:{" "}
                  <strong className={r.sort.enabled ? "text-primary-700" : ""}>
                    {r.sort.enabled ? r.sort.paramName : "off"}
                  </strong>
                </div>
                <div>
                  Ops:{" "}
                  <span className="font-mono">
                    {[
                      r.operations.list && "L",
                      r.operations.get && "G",
                      r.operations.create && "C",
                      r.operations.update && "U",
                      r.operations.delete && "D",
                    ]
                      .filter(Boolean)
                      .join("")}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {unmapped.length > 0 && (
        <details className="border border-amber-300 bg-amber-50 rounded p-3 text-sm">
          <summary className="cursor-pointer font-medium text-amber-900">
            {unmapped.length} unmapped operation(s)
          </summary>
          <ul className="mt-2 space-y-1">
            {unmapped.map((u, i) => (
              <li key={i} className="font-mono text-xs">
                {u.operation.method} {u.operation.path} — {u.reasonText}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800">
            You can promote any of these to a Custom Action in step 4.
          </p>
        </details>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => useWizard.getState().setStep(1)}
          className="px-4 py-2 rounded border border-beige-300 text-gray-700"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="px-4 py-2 rounded bg-primary-600 text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
