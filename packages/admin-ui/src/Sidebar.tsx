import type { Branding, ResourceDef } from "./types.js";
import type { ReactNode } from "react";

export interface SidebarProps {
  branding: Branding;
  resources: ResourceDef[];
  activeResourceName?: string;
  onSelect: (resource: ResourceDef) => void;
  footer?: ReactNode;
}

export function Sidebar({
  branding,
  resources,
  activeResourceName,
  onSelect,
  footer,
}: SidebarProps): ReactNode {
  return (
    <aside className="sticky top-0 w-64 shrink-0 h-screen flex flex-col bg-white border-r border-beige-200 shadow-sm">
      <div
        className="h-14 px-4 flex items-center gap-3 text-white"
        style={{ backgroundColor: branding.primaryColor }}
      >
        {branding.logoUrl && (
          <img
            src={branding.logoUrl}
            alt=""
            className="h-8 w-8 rounded object-cover ring-1 ring-white/40"
          />
        )}
        <span className="font-semibold tracking-tight truncate">
          {branding.productName}
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {resources.length === 0 && (
          <p className="text-sm text-gray-500 p-3">No resources configured.</p>
        )}
        <ul className="space-y-0.5">
          {resources.map((r) => {
            const active = r.name === activeResourceName;
            return (
              <li key={r.name}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-primary-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-beige-100"
                  }`}
                >
                  {r.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {footer && (
        <div className="p-3 border-t border-beige-200 bg-beige-50">{footer}</div>
      )}
    </aside>
  );
}
