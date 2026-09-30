import type { AuthConfig, ConfigBundle, ResourceDef } from "@studio/admin-schema";
import { CONFIG_BUNDLE_VERSION } from "@studio/admin-schema";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client.js";

const API_BASE = "https://api.example.com";
const TOKEN = "test-token-123";

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
}

const initialCompanies: CompanyRow[] = [
  { id: "co-1", name: "Acme", slug: "acme" },
  { id: "co-2", name: "Widgets Inc", slug: "widgets" },
];

const state = {
  companies: [...initialCompanies],
  seen: [] as Array<{ method: string; url: string; auth: string | null; body: unknown }>,
};

async function record(request: Request) {
  let body: unknown = null;
  const text = await request.clone().text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  state.seen.push({
    method: request.method,
    url: request.url,
    auth: request.headers.get("Authorization"),
    body,
  });
}

const server = setupServer(
  http.get(`${API_BASE}/companies`, async ({ request }) => {
    await record(request);
    return HttpResponse.json({ data: state.companies });
  }),
  http.get(`${API_BASE}/companies/:id`, async ({ request, params }) => {
    await record(request);
    const co = state.companies.find((c) => c.id === params.id);
    if (!co) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ data: co });
  }),
  http.post(`${API_BASE}/companies`, async ({ request }) => {
    await record(request);
    const body = (await request.clone().json()) as Partial<CompanyRow>;
    const created: CompanyRow = {
      id: `co-${state.companies.length + 1}`,
      name: body.name ?? "",
      slug: body.slug ?? "",
    };
    state.companies.push(created);
    return HttpResponse.json({ data: created }, { status: 201 });
  }),
  http.patch(`${API_BASE}/companies/:id`, async ({ request, params }) => {
    await record(request);
    const body = (await request.clone().json()) as Partial<CompanyRow>;
    const co = state.companies.find((c) => c.id === params.id);
    if (!co) return new HttpResponse(null, { status: 404 });
    Object.assign(co, body);
    return HttpResponse.json({ data: co });
  }),
  http.delete(`${API_BASE}/companies/:id`, async ({ request, params }) => {
    await record(request);
    const before = state.companies.length;
    state.companies = state.companies.filter((c) => c.id !== params.id);
    if (state.companies.length === before) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),
);

const companiesResource: ResourceDef = {
  name: "companies",
  label: "Company",
  displayLabelField: "name",
  operations: {
    list: { method: "GET", path: "/companies", queryParams: [] },
    get: { method: "GET", path: "/companies/{id}" },
    create: { method: "POST", path: "/companies" },
    update: { method: "PATCH", path: "/companies/{id}" },
    delete: { method: "DELETE", path: "/companies/{id}" },
  },
  fields: [
    {
      name: "name",
      label: "Name",
      renderer: "text",
      visibleInList: true,
      visibleInDetail: true,
      editable: true,
    },
  ],
  listColumns: ["name"],
  search: { enabled: false },
  sort: { enabled: false },
  pagination: { style: "none" },
  customActions: [],
};

const auth: AuthConfig = { kind: "bearer", token: TOKEN };
const bundle: ConfigBundle = {
  version: CONFIG_BUNDLE_VERSION,
  apiBaseUrl: API_BASE,
  auth,
  branding: { productName: "Demo", primaryColor: "#586c31" },
  resources: [companiesResource],
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  state.companies = [...initialCompanies];
  state.seen = [];
});
afterAll(() => server.close());

const ctx = () => ({ apiBaseUrl: bundle.apiBaseUrl, auth: bundle.auth });

describe("backoffice API client full CRUD against a mocked target API", () => {
  it("LIST hits GET /companies with bearer auth and unwraps envelope", async () => {
    const rows = await apiRequest(ctx(), companiesResource.operations.list!);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(2);
    const call = state.seen[0];
    expect(call.method).toBe("GET");
    expect(call.url).toBe(`${API_BASE}/companies`);
    expect(call.auth).toBe(`Bearer ${TOKEN}`);
  });

  it("GET one substitutes {id} in path", async () => {
    const row = (await apiRequest(
      ctx(),
      companiesResource.operations.get!,
      "co-1",
    )) as CompanyRow;
    expect(row).toEqual({ id: "co-1", name: "Acme", slug: "acme" });
    expect(state.seen[0].url).toBe(`${API_BASE}/companies/co-1`);
  });

  it("CREATE posts JSON body and returns created record", async () => {
    const created = (await apiRequest(
      ctx(),
      { ...companiesResource.operations.create!, body: { name: "New", slug: "new" } },
    )) as CompanyRow;
    expect(created.name).toBe("New");
    expect(state.companies).toHaveLength(3);
    const call = state.seen[0];
    expect(call.method).toBe("POST");
    expect(call.auth).toBe(`Bearer ${TOKEN}`);
    expect(call.body).toEqual({ name: "New", slug: "new" });
  });

  it("UPDATE patches an existing record", async () => {
    const updated = (await apiRequest(
      ctx(),
      { ...companiesResource.operations.update!, body: { name: "Acme Corp" } },
      "co-1",
    )) as CompanyRow;
    expect(updated.name).toBe("Acme Corp");
    const call = state.seen[0];
    expect(call.method).toBe("PATCH");
    expect(call.url).toBe(`${API_BASE}/companies/co-1`);
    expect(call.body).toEqual({ name: "Acme Corp" });
  });

  it("DELETE removes the record and returns null on 204", async () => {
    await apiRequest(ctx(), companiesResource.operations.delete!, "co-2");
    expect(state.companies.map((c) => c.id)).toEqual(["co-1"]);
    expect(state.seen[0].method).toBe("DELETE");
  });

  it("full CRUD round-trip: create → list → update → get → delete → list", async () => {
    await apiRequest(ctx(), {
      ...companiesResource.operations.create!,
      body: { name: "Beta", slug: "beta" },
    });
    let rows = (await apiRequest(ctx(), companiesResource.operations.list!)) as CompanyRow[];
    expect(rows).toHaveLength(3);
    const beta = rows.find((r) => r.slug === "beta")!;

    await apiRequest(
      ctx(),
      { ...companiesResource.operations.update!, body: { name: "Beta Renamed" } },
      beta.id,
    );
    const fetched = (await apiRequest(
      ctx(),
      companiesResource.operations.get!,
      beta.id,
    )) as CompanyRow;
    expect(fetched.name).toBe("Beta Renamed");

    await apiRequest(ctx(), companiesResource.operations.delete!, beta.id);
    rows = (await apiRequest(ctx(), companiesResource.operations.list!)) as CompanyRow[];
    expect(rows.map((r) => r.slug)).toEqual(["acme", "widgets"]);
  });

  it("uses `header` auth when configured instead of bearer", async () => {
    const headerCtx = {
      apiBaseUrl: API_BASE,
      auth: { kind: "header" as const, name: "X-Admin-Token", value: "secret-42" },
    };
    await apiRequest(headerCtx, companiesResource.operations.list!);
    // No Authorization header sent; custom header carried
    const call = state.seen[0];
    expect(call.auth).toBeNull();
    // Grab from raw fetch headers instead — msw doesn't expose them via .auth
    // so re-issue and inspect Headers directly via a spy
    const originalFetch = globalThis.fetch;
    const spy = vi.spyOn(globalThis, "fetch");
    await apiRequest(headerCtx, companiesResource.operations.list!);
    const initArg = spy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(initArg.headers);
    expect(headers.get("X-Admin-Token")).toBe("secret-42");
    spy.mockRestore();
    globalThis.fetch = originalFetch;
  });
});
