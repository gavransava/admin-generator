import type { ConfigBundle, ResourceDef } from "@studio/admin-schema";
import { DataTable } from "@studio/admin-ui";
import type { SortDir } from "@studio/admin-ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../api/client.js";

interface Props {
  bundle: ConfigBundle;
  resource: ResourceDef;
}

export function ResourceList({ bundle, resource }: Props) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(
    resource.sort.defaultField,
  );
  const [sortDir, setSortDir] = useState<SortDir>(resource.sort.defaultDir);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(resource.pagination.pageSizeOptions?.[0] ?? 25);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const list = resource.operations.list;

  const query: Record<string, string | number | undefined> = {};
  if (resource.search.enabled && resource.search.paramName && q) {
    query[resource.search.paramName] = q;
  }
  if (resource.sort.enabled && resource.sort.paramName && sortField) {
    query[resource.sort.paramName] = sortDir === "desc" ? `-${sortField}` : sortField;
  }
  if (resource.pagination.style === "page") {
    if (resource.pagination.pageParamName) query[resource.pagination.pageParamName] = page;
    if (resource.pagination.pageSizeParamName)
      query[resource.pagination.pageSizeParamName] = pageSize;
  } else if (resource.pagination.style === "offset") {
    if (resource.pagination.offsetParamName)
      query[resource.pagination.offsetParamName] = (page - 1) * pageSize;
    if (resource.pagination.limitParamName)
      query[resource.pagination.limitParamName] = pageSize;
  } else if (resource.pagination.style === "cursor") {
    if (cursor && resource.pagination.cursorParamName)
      query[resource.pagination.cursorParamName] = cursor;
    if (resource.pagination.limitParamName)
      query[resource.pagination.limitParamName] = pageSize;
  }

  const { data, error, isLoading } = useQuery({
    queryKey: [resource.name, "list", query],
    queryFn: () =>
      apiRequest(
        { apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth },
        { method: list!.method, path: list!.path, query },
      ),
    enabled: Boolean(list),
  });

  if (!list) {
    return (
      <div className="border border-beige-200 bg-beige-50 rounded p-4 text-sm text-gray-700">
        This resource has no list operation.
      </div>
    );
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const columns = resource.listColumns
    .map((n) => resource.fields.find((f) => f.name === n))
    .filter((f): f is (typeof resource.fields)[number] => Boolean(f && f.visibleInList));

  const idField = resource.fields.find((f) => f.name === "id")?.name ?? "id";
  const displayName = resource.label;

  const nextPage = () => {
    if (resource.pagination.style === "page" || resource.pagination.style === "offset") {
      setPage((p) => p + 1);
    }
  };
  const prevPage = () => {
    if (resource.pagination.style === "page" || resource.pagination.style === "offset") {
      setPage((p) => Math.max(1, p - 1));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{displayName}</h2>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{resource.name}</p>
        </div>
        <div className="flex gap-2">
          {resource.customActions
            .filter((a) => a.scope === "collection")
            .map((a) => (
              <button
                key={a.id}
                type="button"
                className="px-3 py-1.5 rounded border border-beige-300 text-sm hover:bg-beige-50"
                onClick={async () => {
                  if (a.confirm && !window.confirm(`Run "${a.label}"?`)) return;
                  await apiRequest(
                    { apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth },
                    { method: a.endpoint.method, path: a.endpoint.path, body: a.requestBodyTemplate },
                  );
                }}
              >
                {a.label}
              </button>
            ))}
          {resource.operations.create && (
            <Link
              to={`/${resource.name}/new`}
              className="px-3 py-1.5 rounded bg-primary-600 text-white text-sm"
            >
              + Add
            </Link>
          )}
        </div>
      </div>

      {resource.search.enabled && (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${displayName}…`}
          className="w-full max-w-sm border border-beige-300 rounded px-3 py-2 text-sm"
        />
      )}

      <DataTable
        columns={columns}
        rows={rows}
        idField={idField}
        loading={isLoading}
        error={
          error && error instanceof ApiError
            ? { message: error.message, body: error.body }
            : error
              ? { message: (error as Error).message }
              : null
        }
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={
          resource.sort.enabled
            ? (f, d) => {
                setSortField(d ? f : undefined);
                setSortDir(d);
              }
            : undefined
        }
        onRowClick={
          resource.operations.get
            ? (row) => nav(`/${resource.name}/${row[idField]}`)
            : undefined
        }
      />

      {(resource.pagination.style === "page" || resource.pagination.style === "offset") && (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={prevPage}
            disabled={page === 1}
            className="px-3 py-1 border border-beige-300 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            onClick={nextPage}
            disabled={rows.length < pageSize}
            className="px-3 py-1 border border-beige-300 rounded disabled:opacity-50"
          >
            Next
          </button>
          {resource.pagination.pageSizeOptions && (
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-beige-300 rounded px-2 py-1"
            >
              {resource.pagination.pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {resource.pagination.style === "cursor" && (
        <button
          type="button"
          onClick={() => {
            const next =
              data && typeof data === "object" && "next_cursor" in (data as any)
                ? (data as any).next_cursor
                : null;
            if (next) setCursor(next);
          }}
          className="px-3 py-1.5 border border-beige-300 rounded text-sm"
        >
          Load more
        </button>
      )}
    </div>
  );
}
