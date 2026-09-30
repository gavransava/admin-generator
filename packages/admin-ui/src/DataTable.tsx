import type { FieldDef } from "./types.js";
import type { ReactNode } from "react";
import { renderField } from "./RendererRegistry.js";

export type SortDir = "asc" | "desc" | undefined;

export interface DataTableProps {
  columns: FieldDef[];
  rows: Array<Record<string, unknown>>;
  idField: string;
  emptyLabel?: string;
  loading?: boolean;
  error?: { message: string; body?: unknown } | null;
  sortField?: string;
  sortDir?: SortDir;
  onSortChange?: (field: string, dir: SortDir) => void;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function DataTable({
  columns,
  rows,
  idField,
  emptyLabel = "No records",
  loading,
  error,
  sortField,
  sortDir,
  onSortChange,
  onRowClick,
}: DataTableProps): ReactNode {
  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded p-4">
        <p className="font-medium text-red-900">Request failed</p>
        <p className="text-sm text-red-800 mt-1">{error.message}</p>
        {error.body != null && (
          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
            {typeof error.body === "string"
              ? error.body
              : JSON.stringify(error.body, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  const handleHeaderClick = (name: string) => {
    if (!onSortChange) return;
    const next: SortDir =
      sortField !== name ? "asc" : sortDir === "asc" ? "desc" : undefined;
    onSortChange(name, next);
  };

  return (
    <div className="overflow-x-auto border border-beige-200 rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead className="bg-beige-50 border-b border-beige-200">
          <tr>
            {columns.map((col) => {
              const active = sortField === col.name;
              const arrow = active ? (sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "") : "";
              return (
                <th
                  key={col.name}
                  className={`text-left font-medium text-gray-700 px-4 py-2 ${
                    onSortChange ? "cursor-pointer select-none" : ""
                  }`}
                  onClick={onSortChange ? () => handleHeaderClick(col.name) : undefined}
                  aria-sort={
                    !active
                      ? "none"
                      : sortDir === "asc"
                        ? "ascending"
                        : sortDir === "desc"
                          ? "descending"
                          : "none"
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {arrow && <span className="text-xs text-gray-400">{arrow}</span>}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td className="px-4 py-6 text-gray-500 italic" colSpan={columns.length}>
                Loading…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-gray-500" colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr
                key={String(row[idField] ?? Math.random())}
                className={`border-t border-beige-100 ${
                  onRowClick ? "cursor-pointer hover:bg-beige-50" : ""
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.name} className="px-4 py-2 align-top">
                    {renderField(col, row[col.name])}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
