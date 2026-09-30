import type { CustomAction } from "@studio/admin-schema";
import { useWizard } from "../store/wizard.js";
import { parsePath } from "../parser/paths.js";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function Step4CustomActions() {
  const resources = useWizard((s) => s.resources);
  const unmapped = useWizard((s) => s.unmapped);
  const updateResource = useWizard((s) => s.updateResource);
  const setStep = useWizard((s) => s.setStep);

  const promote = (
    resourceName: string,
    op: (typeof unmapped)[number]["operation"],
  ) => {
    const r = resources.find((res) => res.name === resourceName);
    if (!r) return;
    const parsed = parsePath(op.path);
    const scope: CustomAction["scope"] = parsed.endsWithParam ? "row" : "collection";
    const action: CustomAction = {
      id: newId(),
      label: op.operationId ?? `${op.method} ${op.path}`,
      endpoint: { method: op.method, path: op.path },
      scope,
      confirm: true,
    };
    updateResource(resourceName, {
      customActions: [...r.customActions, action],
    });
  };

  const updateAction = (
    resourceName: string,
    id: string,
    patch: Partial<CustomAction>,
  ) => {
    const r = resources.find((res) => res.name === resourceName);
    if (!r) return;
    updateResource(resourceName, {
      customActions: r.customActions.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    });
  };

  const removeAction = (resourceName: string, id: string) => {
    const r = resources.find((res) => res.name === resourceName);
    if (!r) return;
    updateResource(resourceName, {
      customActions: r.customActions.filter((a) => a.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Custom actions</h3>
        <p className="text-sm text-gray-600">
          Non-CRUD endpoints appear here. Promote each to a labeled button on
          the row or list header.
        </p>
      </div>

      {unmapped.length > 0 && (
        <section className="border border-amber-200 bg-amber-50 rounded p-3">
          <h4 className="text-sm font-medium text-amber-900 mb-2">
            Unpromoted endpoints
          </h4>
          <ul className="space-y-1">
            {unmapped.map((u, i) => {
              const parsed = parsePath(u.operation.path);
              const target = parsed.resourceName;
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs font-mono"
                >
                  <span className="flex-1">
                    {u.operation.method} {u.operation.path}
                  </span>
                  {target && resources.some((r) => r.name === target) ? (
                    <button
                      type="button"
                      onClick={() => promote(target, u.operation)}
                      className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300"
                    >
                      + Add to {target}
                    </button>
                  ) : (
                    <span className="text-amber-800">no parent</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {resources.map((r) => (
        <div
          key={r.name}
          className="border border-beige-200 rounded bg-white p-4 space-y-2"
        >
          <h4 className="font-medium">{r.label} — actions</h4>
          {r.customActions.length === 0 && (
            <p className="text-xs text-gray-500">
              No custom actions on this resource.
            </p>
          )}
          <ul className="space-y-2">
            {r.customActions.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center text-sm"
              >
                <input
                  className="border border-beige-300 rounded px-2 py-1"
                  value={a.label}
                  onChange={(e) =>
                    updateAction(r.name, a.id, { label: e.target.value })
                  }
                />
                <select
                  value={a.scope}
                  onChange={(e) =>
                    updateAction(r.name, a.id, {
                      scope: e.target.value as "row" | "collection",
                    })
                  }
                  className="border border-beige-300 rounded px-2 py-1"
                >
                  <option value="row">row</option>
                  <option value="collection">collection</option>
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={a.confirm}
                    onChange={(e) =>
                      updateAction(r.name, a.id, { confirm: e.target.checked })
                    }
                  />
                  confirm
                </label>
                <button
                  type="button"
                  onClick={() => removeAction(r.name, a.id)}
                  className="text-xs text-red-700 hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="px-4 py-2 rounded border border-beige-300"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(5)}
          className="px-4 py-2 rounded bg-primary-600 text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
