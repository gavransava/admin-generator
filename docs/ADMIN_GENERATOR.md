# Admin Generator (Studio + Backoffice)

White-label admin-panel generator scoped to the BookiT monorepo. Two React apps + two shared packages that together turn any OpenAPI 3.x document into a working admin UI with live CRUD against the target API.

- **Studio** — `admin.zakazisam.rs/studio` — upload a swagger, walk a 5-step dropdown wizard, publish a config bundle.
- **Backoffice** — `admin.zakazisam.rs/` — reads the config from `localStorage` and renders the admin.

Companion docs:
- `openspec/changes/archive/*add-admin-generator-mvp/` — full proposal + design + specs + tasks (once archived)
- `DEPLOYMENT_PLAN.md` — infra runbook
- `docs/ENVIRONMENT.md` — env-var matrix

---

## What the tool does

1. You upload an OpenAPI 3.0/3.1 document (JSON or YAML) or paste a URL.
2. Studio parses it deterministically — no AI, no heuristics — and detects CRUD-shaped resources.
3. You walk 5 dropdown-driven steps (auth, resources, fields, actions, branding).
4. You click **Launch**. Studio writes a `ConfigBundle` to `localStorage` and opens the Backoffice in a new tab.
5. Backoffice renders sidebar + resource pages + real CRUD calls to the target API.

The runtime is one deployed React app: same origin, one bundle, one deploy pipeline. Different configs → different admins, without regenerating source.

---

## Deterministic Swagger → CRUD mapping

Every operation in the swagger is classified against this fixed table. Anything that doesn't match is exposed as a **Custom Action** you promote manually in Step 4.

| HTTP method | Path shape                    | Mapping    |
|-------------|-------------------------------|------------|
| `GET`       | `/{resource}`                 | list       |
| `GET`       | `/{resource}/{id}`            | get        |
| `POST`      | `/{resource}`                 | create     |
| `PUT`       | `/{resource}/{id}`            | update     |
| `PATCH`     | `/{resource}/{id}`            | update ← wins if both PUT and PATCH exist |
| `DELETE`    | `/{resource}/{id}`            | delete     |
| any other   | anything else                 | Custom Action candidate |

**Nested collections** (`/users/{id}/roles`) are attached as related resources of the parent's detail view, not their own top-level resource.

**Search/sort/pagination** enabled only when the list operation declares the matching query parameters:
- Search: `q`, `search`, `filter`, or `filter[X]`.
- Sort: `sort`, `orderBy`, `order_by`.
- Pagination: exactly one of `{page, pageSize}`, `{page, per_page}`, `{offset, limit}`, `{cursor, limit}`. None = no pagination.

Missing params = the corresponding UI affordance is hidden. The runtime never invents a parameter the API didn't advertise.

---

## Field renderer table (deterministic)

Chosen from OpenAPI schema `type` + `format` in this order, first match wins:

| Schema property                       | List renderer  | Form renderer |
|---------------------------------------|----------------|---------------|
| `type: string, format: email`         | email link     | email input   |
| `type: string, format: uri` or `url`  | link           | url input     |
| `type: string, format: date`          | date           | date picker   |
| `type: string, format: date-time`     | datetime       | datetime picker |
| `type: string, enum: [...]`           | badge (auto-colored) | select |
| `type: string`                        | text           | text input    |
| `type: integer` / `type: number`      | number         | number input  |
| `type: boolean`                       | checkbox       | toggle        |
| `type: array, items: {$ref}`          | count + view   | (hidden)      |
| `type: object` / `$ref`               | JSON preview   | (hidden)      |

Every choice can be overridden per field in Step 3.

---

## ConfigBundle contract (v1)

Emitted by Studio, consumed by Backoffice. Both apps validate via the same Zod schema in `packages/admin-schema/src/config.ts`.

```
ConfigBundle = {
  version: 1,
  apiBaseUrl: string,
  auth: { kind: 'none' } | { kind: 'bearer', token } | { kind: 'header', name, value },
  branding: { productName, primaryColor, logoUrl? },
  resources: ResourceDef[],
}
```

Full type surface lives in `packages/admin-schema` — see the exported `ConfigBundleSchema`, `ResourceDefSchema`, `FieldDefSchema`, `CustomActionSchema`.

`version` is a hard gate. The Backoffice refuses to render any bundle whose `version !== 1`.

---

## The 5 wizard steps

**Step 1 — Auth.** Pick `none | bearer | header`. Enter `apiBaseUrl`. Red PROD banner appears if URL matches `https://api.zakazisam.rs`.

**Step 2 — Resources.** For each detected resource: label, display-label field, list columns, unmapped-operations panel. Pagination / search / sort are shown read-only (detected from swagger).

**Step 3 — Field renderers.** Per field: renderer override dropdown, visibility toggles (list / detail / edit), label rename.

**Step 4 — Custom actions.** Promote unmapped endpoints to labeled row/collection buttons. Optional confirmation dialog per action.

**Step 5 — Publish.** Branding (name, primary color, logo URL). Bundle preview (JSON). Final Zod validation. **Launch** persists to `localStorage['admin-config:v1']` and opens the Backoffice.

---

## Demo scenarios

**Scenario A — BookiT (flagship).**

1. `https://admin.zakazisam.rs/studio`
2. Paste URL: `https://api-qa.zakazisam.rs/openapi.json` (QA target)
3. Auth: `bearer` — paste a QA JWT
4. Walk steps
5. Launch → live admin against BookiT QA. Real Neon writes.

**Scenario B — Petstore (works with anything).**

1. `https://admin.zakazisam.rs/studio`
2. Paste URL: `https://petstore3.swagger.io/api/v3/openapi.json`
3. Auth: `none`
4. Walk steps
5. Launch → admin for pets/orders/users of the Petstore sandbox.

---

## Local dev

```bash
# Terminal 1 — Studio
npm run dev -w @studio/generator     # → http://localhost:5174/studio

# Terminal 2 — Backoffice
npm run dev -w @studio/backoffice    # → http://localhost:5175

# Terminal 3 — server (for BookiT scenario A)
npm run dev -w @studio/server        # → http://localhost:4000/openapi.json
```

Studio's `localStorage` write is visible to Backoffice only when both tabs share the same origin. In dev they run on different ports — for local hot-reload testing, either serve both via `admin-dist/` behind a single origin (via `npx serve admin-dist -p 5176` after `npm run build:admin`) or manually copy the localStorage bundle across tabs.

---

## Build + deploy

```bash
npm run build:admin      # produces admin-dist/ containing everything
```

Layout:
```
admin-dist/
├── index.html          # Backoffice
├── assets/             # Backoffice bundle
├── _headers            # CF Pages headers (long-cache assets, no-cache index)
├── _redirects          # SPA fallback per surface
└── studio/
    ├── index.html      # Studio
    └── assets/         # Studio bundle
```

Cloudflare Pages project `zakazisam-admin`:
- Production branch `main` → `admin.zakazisam.rs`
- Preview branch `qa` → `admin-qa.zakazisam.rs`
- Build command: `npm install && npm run build:admin`
- Build output directory: `admin-dist`

Both subdomains sit behind Cloudflare Access — staff-only login via Google OAuth, allow-listed emails.
