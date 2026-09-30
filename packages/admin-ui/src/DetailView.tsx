import type { FieldDef } from "./types.js";
import type { ReactNode } from "react";
import { renderField } from "./RendererRegistry.js";

export interface DetailViewProps {
  fields: FieldDef[];
  record: Record<string, unknown>;
  title?: string;
  actions?: ReactNode;
  related?: ReactNode;
}

export function DetailView({
  fields,
  record,
  title,
  actions,
  related,
}: DetailViewProps): ReactNode {
  const visible = fields.filter((f) => f.visibleInDetail);
  return (
    <div className="space-y-6">
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="border border-beige-200 rounded-lg bg-white p-6 grid grid-cols-2 gap-x-8 gap-y-4">
        {visible.map((f) => (
          <div key={f.name} className="text-sm">
            <div className="text-gray-500 font-medium">{f.label}</div>
            <div className="mt-1 text-gray-900">
              {renderField(f, record[f.name])}
            </div>
          </div>
        ))}
      </div>
      {related}
    </div>
  );
}
