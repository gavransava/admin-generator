import type { ConfigBundle, ResourceDef } from "@studio/admin-schema";
import { AutoForm } from "@studio/admin-ui";
import type { AutoFormFieldSpec } from "@studio/admin-ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest, ApiError } from "../api/client.js";

interface Props {
  bundle: ConfigBundle;
  resource: ResourceDef;
  mode: "create" | "edit";
}

export function ResourceForm({ bundle, resource, mode }: Props) {
  const { id = "" } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const op =
    mode === "create" ? resource.operations.create : resource.operations.update;
  const getOp = resource.operations.get;

  const existingQuery = useQuery({
    queryKey: [resource.name, "get", id, "for-edit"],
    queryFn: () =>
      apiRequest(
        { apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth },
        { method: getOp!.method, path: getOp!.path },
        id,
      ),
    enabled: mode === "edit" && Boolean(getOp && id),
  });

  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!op) throw new Error("Operation not configured");
      // strip fields the schema marks as not editable
      const filtered: Record<string, unknown> = {};
      for (const f of resource.fields) {
        if (mode === "edit" && !f.editable) continue;
        if (values[f.name] !== undefined) filtered[f.name] = values[f.name];
      }
      return await apiRequest(
        { apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth },
        { method: op.method, path: op.path, body: filtered },
        mode === "edit" ? id : undefined,
      );
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [resource.name] });
      const nextId =
        data && typeof data === "object" && "id" in (data as any)
          ? String((data as any).id)
          : id;
      nav(`/${resource.name}/${nextId}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.body && typeof err.body === "object") {
        const body = err.body as Record<string, unknown>;
        if (body.errors && typeof body.errors === "object") {
          const flat: Record<string, string> = {};
          for (const [k, v] of Object.entries(body.errors as Record<string, unknown>)) {
            flat[k] = Array.isArray(v) ? String(v[0]) : String(v);
          }
          setServerErrors(flat);
          return;
        }
      }
      setServerErrors({ _: err instanceof Error ? err.message : "Request failed" });
    },
  });

  if (!op) {
    return (
      <div className="border border-beige-200 rounded p-4 text-sm">
        No {mode} operation configured for {resource.label}.
      </div>
    );
  }

  if (mode === "edit" && existingQuery.isLoading) {
    return <p className="text-gray-500 italic">Loading…</p>;
  }

  const specs: AutoFormFieldSpec[] = resource.fields
    .filter((f) => f.editable && f.visibleInDetail)
    .map((f) => ({
      field: f,
      enumValues: f.enumValues,
      required: false, // Constraints from openapi requestBody would be plumbed here in a follow-up
    }));

  const initial = mode === "edit" ? (existingQuery.data as Record<string, unknown>) : {};

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {mode === "create" ? `New ${resource.label}` : `Edit ${resource.label}`}
      </h2>
      {serverErrors._ && (
        <div className="border border-red-200 bg-red-50 rounded p-3 text-sm text-red-900">
          {serverErrors._}
        </div>
      )}
      <div className="bg-white border border-beige-200 rounded p-6">
        <AutoForm
          fields={specs}
          initial={initial}
          serverErrors={Object.fromEntries(
            Object.entries(serverErrors).filter(([k]) => k !== "_"),
          )}
          onSubmit={async (v) => {
            await submit.mutateAsync(v);
          }}
          onCancel={() =>
            nav(mode === "edit" ? `/${resource.name}/${id}` : `/${resource.name}`)
          }
        />
      </div>
    </div>
  );
}
