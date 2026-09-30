import type { OpenApiOperation } from "./types.js";

export type PaginationStyle = "page" | "offset" | "cursor" | "none";

export interface DetectedPagination {
  style: PaginationStyle;
  pageParamName?: string;
  pageSizeParamName?: string;
  offsetParamName?: string;
  limitParamName?: string;
  cursorParamName?: string;
}

function hasParam(op: OpenApiOperation, ...names: string[]): string | null {
  const query = (op.parameters ?? []).filter((p) => p.in === "query");
  for (const n of names) {
    const found = query.find((p) => p.name === n);
    if (found) return found.name;
  }
  return null;
}

export function detectPagination(op: OpenApiOperation): DetectedPagination {
  // Cursor-based (highest specificity)
  const cursor = hasParam(op, "cursor", "next_cursor", "page_token");
  const limit = hasParam(op, "limit");
  if (cursor && limit) {
    return {
      style: "cursor",
      cursorParamName: cursor,
      limitParamName: limit,
    };
  }

  // Page-based
  const page = hasParam(op, "page");
  const pageSize = hasParam(op, "pageSize", "per_page", "page_size");
  if (page && pageSize) {
    return {
      style: "page",
      pageParamName: page,
      pageSizeParamName: pageSize,
    };
  }

  // Offset-based
  const offset = hasParam(op, "offset");
  if (offset && limit) {
    return {
      style: "offset",
      offsetParamName: offset,
      limitParamName: limit,
    };
  }

  return { style: "none" };
}
