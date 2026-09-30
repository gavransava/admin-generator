import type { OpenApiOperation } from "./types.js";

export interface DetectedSearch {
  enabled: boolean;
  paramName?: string;
}

export interface DetectedSort {
  enabled: boolean;
  paramName?: string;
}

function firstQueryParam(op: OpenApiOperation, names: string[]): string | null {
  const query = (op.parameters ?? []).filter((p) => p.in === "query");
  for (const n of names) {
    if (query.some((p) => p.name === n)) return n;
  }
  const filterBracket = query.find((p) => /^filter\[[^\]]+\]$/.test(p.name));
  if (filterBracket && names.includes("filter[*]")) return filterBracket.name;
  return null;
}

export function detectSearch(op: OpenApiOperation): DetectedSearch {
  const found = firstQueryParam(op, ["q", "search", "filter", "filter[*]"]);
  if (found) return { enabled: true, paramName: found };
  return { enabled: false };
}

export function detectSort(op: OpenApiOperation): DetectedSort {
  const found = firstQueryParam(op, ["sort", "orderBy", "order_by"]);
  if (found) return { enabled: true, paramName: found };
  return { enabled: false };
}
