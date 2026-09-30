import { describe, expect, it } from "vitest";
import { ingestText, IngestError } from "./ingest.js";
import { detectPagination } from "./pagination.js";
import { parsePath } from "./paths.js";
import { detectResources } from "./resources.js";
import { detectSearch, detectSort } from "./search-sort.js";
import type { OpenApiOperation } from "./types.js";

const minimalDoc = (paths: Record<string, unknown>, schemas?: Record<string, unknown>) => ({
  openapi: "3.0.3",
  info: { title: "Test", version: "1.0.0" },
  servers: [{ url: "https://api.example.com" }],
  paths,
  components: schemas ? { schemas } : undefined,
});

describe("ingestText", () => {
  it("parses valid OpenAPI 3.0 JSON", async () => {
    const doc = await ingestText(
      JSON.stringify(
        minimalDoc({
          "/users": {
            get: { responses: { "200": { description: "ok" } } },
          },
        }),
      ),
    );
    expect(doc.servers[0]).toBe("https://api.example.com");
    expect(doc.operations).toHaveLength(1);
    expect(doc.operations[0].method).toBe("GET");
  });

  it("parses OpenAPI 3.1 YAML", async () => {
    const yaml = `openapi: 3.1.0
info:
  title: Test
  version: 1.0.0
paths:
  /users:
    get:
      responses:
        '200':
          description: ok`;
    const doc = await ingestText(yaml);
    expect(doc.operations).toHaveLength(1);
  });

  it("rejects Swagger 2.0", async () => {
    await expect(
      ingestText(
        JSON.stringify({ swagger: "2.0", info: { title: "x", version: "1" }, paths: {} }),
      ),
    ).rejects.toBeInstanceOf(IngestError);
  });

  it("rejects malformed JSON", async () => {
    await expect(ingestText("{ not json")).rejects.toBeInstanceOf(IngestError);
  });

  it("rejects structurally invalid docs", async () => {
    await expect(
      ingestText(JSON.stringify({ openapi: "3.0.0" /* missing info + paths */ })),
    ).rejects.toBeInstanceOf(IngestError);
  });
});

describe("parsePath", () => {
  it("top-level collection", () => {
    const p = parsePath("/users");
    expect(p.resourceName).toBe("users");
    expect(p.isTopLevelCollection).toBe(true);
    expect(p.isTopLevelItem).toBe(false);
  });

  it("top-level item", () => {
    const p = parsePath("/users/{id}");
    expect(p.resourceName).toBe("users");
    expect(p.isTopLevelItem).toBe(true);
    expect(p.endsWithParam).toBe(true);
  });

  it("nested collection", () => {
    const p = parsePath("/users/{id}/roles");
    expect(p.resourceName).toBe("users");
    expect(p.isTopLevelItem).toBe(false);
    expect(p.segments).toEqual(["users", "{id}", "roles"]);
  });

  it("maps /admin/<resource> to admin-<resource>", () => {
    const p = parsePath("/admin/companies");
    expect(p.resourceName).toBe("admin-companies");
    expect(p.isTopLevelCollection).toBe(true);
    expect(p.isTopLevelItem).toBe(false);
  });

  it("maps /admin/<resource>/{id} to admin-<resource> item", () => {
    const p = parsePath("/admin/companies/{id}");
    expect(p.resourceName).toBe("admin-companies");
    expect(p.isTopLevelCollection).toBe(false);
    expect(p.isTopLevelItem).toBe(true);
  });

  it("bare /admin is not a resource path", () => {
    const p = parsePath("/admin");
    expect(p.resourceName).toBe("admin");
    // Falls through to normal single-segment resource behavior — no admin
    // sub-tree grouping when there's nothing after `/admin`.
    expect(p.isTopLevelCollection).toBe(true);
  });
});

describe("detectResources — admin sub-tree", () => {
  it("groups /companies and /admin/companies as distinct resources", async () => {
    const doc = await ingestText(
      JSON.stringify(
        minimalDoc({
          "/companies/{id}": { get: { responses: { "200": { description: "ok" } } } },
          "/admin/companies": { get: { responses: { "200": { description: "ok" } } } },
          "/admin/companies/{id}": {
            get: { responses: { "200": { description: "ok" } } },
            patch: { responses: { "200": { description: "ok" } } },
            delete: { responses: { "200": { description: "ok" } } },
          },
        }),
      ),
    );

    const { resources } = detectResources(doc);
    const names = resources.map((r) => r.name).sort();
    expect(names).toEqual(["admin-companies", "companies"]);

    const admin = resources.find((r) => r.name === "admin-companies")!;
    expect(admin.operations.list?.method).toBe("GET");
    expect(admin.operations.get?.method).toBe("GET");
    expect(admin.operations.update?.method).toBe("PATCH");
    expect(admin.operations.delete?.method).toBe("DELETE");
  });
});

describe("detectResources — mapping rules", () => {
  const opsFrom = (paths: Record<string, Record<string, unknown>>): OpenApiOperation[] => {
    const doc: any = minimalDoc(paths);
    // shortcut: skip ingest.validate for pure mapping tests
    const ops: OpenApiOperation[] = [];
    for (const [path, item] of Object.entries(paths)) {
      for (const method of ["get", "post", "put", "patch", "delete"]) {
        if ((item as any)[method]) {
          ops.push({ method: method.toUpperCase() as any, path, ...(item as any)[method] });
        }
      }
    }
    return ops;
  };

  const buildDoc = (paths: Record<string, Record<string, unknown>>, schemas: any = {}) => ({
    raw: minimalDoc(paths, schemas),
    servers: ["https://x"],
    operations: opsFrom(paths),
    schemas,
  });

  it("full CRUD group", () => {
    const doc = buildDoc({
      "/users": { get: { responses: { "200": { description: "ok" } } }, post: {} },
      "/users/{id}": { get: {}, patch: {}, put: {}, delete: {} },
    });
    const { resources, unmapped } = detectResources(doc);
    expect(unmapped).toHaveLength(0);
    expect(resources).toHaveLength(1);
    const r = resources[0];
    expect(r.name).toBe("users");
    expect(r.operations.list?.method).toBe("GET");
    expect(r.operations.get?.method).toBe("GET");
    expect(r.operations.create?.method).toBe("POST");
    expect(r.operations.update?.method).toBe("PATCH"); // PATCH wins over PUT
    expect(r.operations.delete?.method).toBe("DELETE");
  });

  it("PUT-only maps to update when PATCH absent", () => {
    const doc = buildDoc({ "/users/{id}": { put: {} } });
    const { resources } = detectResources(doc);
    expect(resources[0].operations.update?.method).toBe("PUT");
  });

  it("non-CRUD action exposed as unmapped", () => {
    const doc = buildDoc({
      "/users": { get: { responses: { "200": { description: "ok" } } } },
      "/users/{id}/suspend": { post: {} },
    });
    const { unmapped } = detectResources(doc);
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].operation.path).toBe("/users/{id}/suspend");
  });

  it("nested collection becomes related, not top-level resource", () => {
    const doc = buildDoc({
      "/users": { get: { responses: { "200": { description: "ok" } } } },
      "/users/{id}/roles": { get: {} },
    });
    const { resources, relatedByParent } = detectResources(doc);
    expect(resources).toHaveLength(1);
    expect(resources[0].name).toBe("users");
    expect(relatedByParent.get("users")).toEqual(["roles"]);
  });
});

describe("detectPagination", () => {
  const makeOp = (paramNames: string[]): OpenApiOperation => ({
    method: "GET",
    path: "/x",
    parameters: paramNames.map((n) => ({ name: n, in: "query" })),
  });

  it("detects page+pageSize", () => {
    const d = detectPagination(makeOp(["page", "pageSize"]));
    expect(d.style).toBe("page");
    expect(d.pageParamName).toBe("page");
    expect(d.pageSizeParamName).toBe("pageSize");
  });

  it("detects page+per_page", () => {
    const d = detectPagination(makeOp(["page", "per_page"]));
    expect(d.style).toBe("page");
    expect(d.pageSizeParamName).toBe("per_page");
  });

  it("detects offset+limit", () => {
    const d = detectPagination(makeOp(["offset", "limit"]));
    expect(d.style).toBe("offset");
  });

  it("detects cursor+limit", () => {
    const d = detectPagination(makeOp(["cursor", "limit"]));
    expect(d.style).toBe("cursor");
  });

  it("returns none if no matching pair", () => {
    expect(detectPagination(makeOp([])).style).toBe("none");
    expect(detectPagination(makeOp(["page"])).style).toBe("none");
    expect(detectPagination(makeOp(["limit"])).style).toBe("none");
  });
});

describe("detectSearch / detectSort", () => {
  const opWith = (params: string[]): OpenApiOperation => ({
    method: "GET",
    path: "/x",
    parameters: params.map((n) => ({ name: n, in: "query" })),
  });

  it("search q param", () => {
    expect(detectSearch(opWith(["q"])).enabled).toBe(true);
  });
  it("search filter[email] param", () => {
    const d = detectSearch(opWith(["filter[email]"]));
    expect(d.enabled).toBe(true);
    expect(d.paramName).toBe("filter[email]");
  });
  it("search disabled when absent", () => {
    expect(detectSearch(opWith(["irrelevant"])).enabled).toBe(false);
  });

  it("sort by orderBy", () => {
    const d = detectSort(opWith(["orderBy"]));
    expect(d.enabled).toBe(true);
    expect(d.paramName).toBe("orderBy");
  });
  it("sort disabled when absent", () => {
    expect(detectSort(opWith([])).enabled).toBe(false);
  });
});
