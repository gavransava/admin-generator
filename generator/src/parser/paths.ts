export interface ParsedPath {
  segments: string[];
  paramSegments: boolean[]; // true if segment is {param}
  resourceName: string | null;
  endsWithParam: boolean;
  isTopLevelCollection: boolean; // /{resource}
  isTopLevelItem: boolean; // /{resource}/{id}
}

const RESOURCE_NAME_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function parsePath(path: string): ParsedPath {
  const raw = path.startsWith("/") ? path.slice(1) : path;
  const segments = raw === "" ? [] : raw.split("/");
  const paramSegments = segments.map((s) => s.startsWith("{") && s.endsWith("}"));

  let resourceName: string | null = null;
  let resourceDepth = 0; // how many leading segments the resource occupies
  if (segments.length > 0 && !paramSegments[0] && RESOURCE_NAME_RE.test(segments[0])) {
    // Admin sub-tree: `/admin/<resource>[/...]` collapses to a single resource
    // named `admin-<resource>` so backoffice groups admin CRUD tables under
    // their own row instead of nesting under a fictional `admin` resource.
    if (
      segments[0] === "admin" &&
      segments.length >= 2 &&
      !paramSegments[1] &&
      RESOURCE_NAME_RE.test(segments[1])
    ) {
      resourceName = `admin-${segments[1]}`;
      resourceDepth = 2;
    } else {
      resourceName = segments[0];
      resourceDepth = 1;
    }
  }

  const endsWithParam =
    segments.length > 0 && paramSegments[segments.length - 1];

  const isTopLevelCollection =
    resourceDepth > 0 && segments.length === resourceDepth;
  const isTopLevelItem =
    resourceDepth > 0 &&
    segments.length === resourceDepth + 1 &&
    paramSegments[resourceDepth];

  return {
    segments,
    paramSegments,
    resourceName,
    endsWithParam,
    isTopLevelCollection,
    isTopLevelItem,
  };
}
