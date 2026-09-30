import type { FieldDef, RendererId } from "@studio/admin-schema";
import { useWizard } from "../store/wizard.js";

const RENDERER_OPTIONS: RendererId[] = [
  "text",
  "number",
  "checkbox",
  "email-link",
  "url-link",
  "date",
  "datetime",
  "badge",
  "json-preview",
  "count-link",
];

export function Step3Fields() {
  const resources = useWizard((s) => s.resources);
  const updateResource = useWizard((s) => s.updateResource);
  const setStep = useWizard((s) => s.setStep);

  const updateField = (
    resourceName: string,
    fieldName: string,
    patch: Partial<FieldDef>,
  ) => {
    const r = resources.find((res) => res.name === resourceName);
    if (!r) return;
    updateResource(resourceName, {
      fields: r.fields.map((f) => (f.name === fieldName ? { ...f, ...patch } : f)),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Field renderers</h3>
        <p className="text-sm text-gray-600">
          Renderer defaults come from OpenAPI type + format. Override where the
          schema is more permissive than reality.
        </p>
      </div>

      {resources.map((r) => (
        <details
          key={r.name}
          open={resources.length === 1}
          className="border border-beige-200 rounded bg-white"
        >
          <summary className="cursor-pointer px-4 py-2 font-medium">
            {r.label} ({r.fields.length} fields)
          </summary>
          <div className="p-4 space-y-2">
            {r.fields.map((f) => (
              <div
                key={f.name}
                className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 items-center text-sm border-t border-beige-100 pt-2"
              >
                <div>
                  <span className="font-mono text-xs text-gray-500 block">
                    {f.name}
                  </span>
                  <input
                    className="w-full border border-beige-300 rounded px-2 py-0.5 text-xs"
                    value={f.label}
                    onChange={(e) =>
                      updateField(r.name, f.name, { label: e.target.value })
                    }
                  />
                </div>

                <select
                  value={f.renderer}
                  onChange={(e) =>
                    updateField(r.name, f.name, {
                      renderer: e.target.value as RendererId,
                    })
                  }
                  className="border border-beige-300 rounded px-2 py-1 text-xs"
                >
                  {RENDERER_OPTIONS.map((r2) => (
                    <option key={r2} value={r2}>
                      {r2}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={f.visibleInList}
                    onChange={(e) =>
                      updateField(r.name, f.name, {
                        visibleInList: e.target.checked,
                      })
                    }
                  />
                  list
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={f.visibleInDetail}
                    onChange={(e) =>
                      updateField(r.name, f.name, {
                        visibleInDetail: e.target.checked,
                      })
                    }
                  />
                  detail
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={f.editable}
                    onChange={(e) =>
                      updateField(r.name, f.name, {
                        editable: e.target.checked,
                      })
                    }
                  />
                  edit
                </label>
              </div>
            ))}
          </div>
        </details>
      ))}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="px-4 py-2 rounded border border-beige-300"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(4)}
          className="px-4 py-2 rounded bg-primary-600 text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
