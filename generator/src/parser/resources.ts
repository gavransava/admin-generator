import type { ResourceDef } from "@studio/admin-schema";
import { extractFieldsFromListOperation } from "./fields.js";
import { detectPagination } from "./pagination.js";
import { parsePath } from "./paths.js";
import { detectSearch, detectSort } from "./search-sort.js";
import type {
  NormalizedDocument,
  OpenApiOperation,
  UnmappedOperation,
  UnmappedReason,
} from "./types.js";

export interface DetectResourcesResult {
  resources: ResourceDef[];
  unmapped: UnmappedOperation[];
  relatedByParent: Map<string, string[]>;
}

function pickDisplayLabelField(fields: string[]): string {
  const preferred = ["name", "title", "label", "email", "slug", "id"];
  for (const p of preferred) if (fields.includes(p)) return p;
  return fields[0] ?? "id";
}

function detectQueryParams(op: OpenApiOperation) {
  return (op.parameters ?? [])
    .filter((p) => p.in === "query")
    .map((p) => ({
      name: p.name,
      in: "query" as const,
      required: p.required,
      schemaType: p.schema?.type as
        | "string"
        | "integer"
        | "number"
        | "boolean"
        | "array"
        | undefined,
    }));
}

function unmap(
  op: OpenApiOperation,
  resourceName: string | null,
  reason: UnmappedReason,
  reasonText: string,
): UnmappedOperation {
  return { operation: op, resourceName, reason, reasonText };
}

export function detectResources(doc: NormalizedDocument): DetectResourcesResult {
  const buckets = new Map<string, { list?: OpenApiOperation; get?: OpenApiOperation; create?: OpenApiOperation; put?: OpenApiOperation; patch?: OpenApiOperation; delete?: OpenApiOperation }>();
  const related = new Map<string, string[]>();
  const unmapped: UnmappedOperation[] = [];

  for (const op of doc.operations) {
    const parsed = parsePath(op.path);
    if (!parsed.resourceName) {
      unmapped.push(
        unmap(
          op,
          null,
          "not-a-resource-path",
          "Path does not start with a resource-name segment",
        ),
      );
      continue;
    }

    const name = parsed.resourceName;
    const b = buckets.get(name) ?? {};

    // Top-level collection: /users
    if (parsed.isTopLevelCollection) {
      if (op.method === "GET") b.list = op;
      else if (op.method === "POST") b.create = op;
      else
        unmapped.push(
          unmap(
            op,
            name,
            "non-crud-method",
            `${op.method} ${op.path} on collection is not a standard CRUD verb`,
          ),
        );
      buckets.set(name, b);
      continue;
    }

    // Top-level item: /users/{id}
    if (parsed.isTopLevelItem) {
      if (op.method === "GET") b.get = op;
      else if (op.method === "PUT") b.put = op;
      else if (op.method === "PATCH") b.patch = op;
      else if (op.method === "DELETE") b.delete = op;
      else
        unmapped.push(
          unmap(
            op,
            name,
            "non-crud-method",
            `${op.method} ${op.path} on item is not a standard CRUD verb`,
          ),
        );
      buckets.set(name, b);
      continue;
    }

    // Nested collection (related resource): /users/{id}/roles
    if (
      parsed.segments.length === 3 &&
      !parsed.paramSegments[0] &&
      parsed.paramSegments[1] &&
      !parsed.paramSegments[2] &&
      op.method === "GET"
    ) {
      const childName = parsed.segments[2];
      const list = related.get(name) ?? [];
      if (!list.includes(childName)) list.push(childName);
      related.set(name, list);
      continue;
    }

    unmapped.push(
      unmap(
        op,
        name,
        "not-a-resource-path",
        `${op.method} ${op.path} does not match /{resource} or /{resource}/{id}`,
      ),
    );
  }

  const resources: ResourceDef[] = [];
  for (const [name, b] of buckets) {
    const list = b.list;
    const updateOp = b.patch ?? b.put; // PATCH wins per D3
    const fields = list ? extractFieldsFromListOperation(list, doc) : [];
    const fieldNames = fields.map((f) => f.name);
    const search = list ? detectSearch(list) : { enabled: false };
    const sort = list ? detectSort(list) : { enabled: false };
    const pagination = list ? detectPagination(list) : { style: "none" as const };

    resources.push({
      name,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      displayLabelField: pickDisplayLabelField(fieldNames),
      operations: {
        list: list
          ? { method: list.method, path: list.path, queryParams: detectQueryParams(list) }
          : undefined,
        get: b.get ? { method: b.get.method, path: b.get.path } : undefined,
        create: b.create
          ? {
              method: b.create.method,
              path: b.create.path,
            }
          : undefined,
        update: updateOp
          ? { method: updateOp.method, path: updateOp.path }
          : undefined,
        delete: b.delete
          ? { method: b.delete.method, path: b.delete.path }
          : undefined,
      },
      fields,
      listColumns: fieldNames.slice(0, 5),
      search,
      sort: {
        enabled: sort.enabled,
        paramName: sort.paramName,
      },
      pagination: {
        style: pagination.style,
        pageParamName: pagination.pageParamName,
        pageSizeParamName: pagination.pageSizeParamName,
        offsetParamName: pagination.offsetParamName,
        limitParamName: pagination.limitParamName,
        cursorParamName: pagination.cursorParamName,
        pageSizeOptions:
          pagination.style === "none" ? undefined : [10, 25, 50, 100],
      },
      customActions: [],
    });
  }

  // If a resource is only referenced by nested paths (like 'roles' as child
  // of 'users' with no top-level /roles), it will not have a top-level
  // bucket and won't appear in `resources`. That matches spec — nested
  // collections show as related on the parent.

  return { resources, unmapped, relatedByParent: related };
}
