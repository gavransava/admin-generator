import type { ConfigBundle, ResourceDef } from "@studio/admin-schema";
import { DetailView } from "@studio/admin-ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest, ApiError } from "../api/client.js";

interface Props {
  bundle: ConfigBundle;
  resource: ResourceDef;
}

export function ResourceDetail({ bundle, resource }: Props) {
  const { id = "" } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const getOp = resource.operations.get;
  const updateOp = resource.operations.update;
  const deleteOp = resource.operations.delete;

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: [resource.name, "get", id],
    queryFn: () =>
      apiRequest(
        { apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth },
        { method: getOp!.method, path: getOp!.path },
        id,
      ),
    enabled: Boolean(getOp && id),
  });

  if (!getOp) {
    return (
      <div className="border border-beige-200 rounded p-4 text-sm">
        No get operation configured for {resource.label}.
      </div>
    );
  }

  if (error && error instanceof ApiError && error.status === 404) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded p-4 text-sm">
        Not found.
        <button
          type="button"
          onClick={() => nav(`/${resource.name}`)}
          className="ml-3 text-primary-700 hover:underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <p className="text-gray-500 italic">Loading…</p>;
  }

  const record = data as Record<string, unknown>;

  const title = record[resource.displayLabelField] as string | undefined;

  const doDelete = async () => {
    if (!deleteOp) return;
    if (!window.confirm(`Delete this ${resource.label}?`)) return;
    setDeleting(true);
    try {
      await apiRequest(
        { apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth },
        { method: deleteOp.method, path: deleteOp.path },
        id,
      );
      qc.invalidateQueries({ queryKey: [resource.name] });
      nav(`/${resource.name}`);
    } finally {
      setDeleting(false);
    }
  };

  const runAction = async (action: (typeof resource.customActions)[number]) => {
    if (action.confirm && !window.confirm(`Run "${action.label}"?`)) return;
    await apiRequest(
      { apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth },
      { method: action.endpoint.method, path: action.endpoint.path, body: action.requestBodyTemplate },
      id,
    );
    await refetch();
  };

  return (
    <DetailView
      title={title || `${resource.label} ${id}`}
      fields={resource.fields}
      record={record}
      actions={
        <>
          {resource.customActions
            .filter((a) => a.scope === "row")
            .map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => runAction(a)}
                className="px-3 py-1.5 rounded border border-beige-300 text-sm"
              >
                {a.label}
              </button>
            ))}
          {updateOp && (
            <Link
              to={`/${resource.name}/${id}/edit`}
              className="px-3 py-1.5 rounded bg-primary-600 text-white text-sm"
            >
              Edit
            </Link>
          )}
          {deleteOp && (
            <button
              type="button"
              onClick={doDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </>
      }
    />
  );
}
