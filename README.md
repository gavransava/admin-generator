# Admin Generator Studio

Two React apps that let you point at any OpenAPI 3 document and get a working admin panel back, no per-project code:

- `generator/` — five-step wizard (upload spec → auth → resources → custom actions → publish) that emits a `ConfigBundle`
- `backoffice/` — runtime that consumes a `ConfigBundle` and renders `@studio/admin-ui` primitives against the target API
- `packages/admin-schema/` — Zod contracts + deterministic renderer inference for the bundle
- `packages/admin-ui/` — shared React primitives (DataTable, DetailView, AutoForm, Sidebar, renderers)

## Layout

```
generator/       Vite React app, wizard UI
backoffice/      Vite React app, runtime for the wizard output
packages/
  admin-schema/  Zod bundle contracts + renderer inference
  admin-ui/      Shared React primitives
scripts/
  build-admin.mjs  Bundles both apps into a single admin-dist/ tree
                    (backoffice at root, generator under /studio/)
docs/
  ADMIN_GENERATOR.md
```

## Getting started

```bash
npm install
npm run build:admin
```

Serves the combined admin-dist/ (backoffice at `/`, generator at `/studio/`).

Or for local dev:

```bash
npm run dev -w generator     # http://localhost:5174/
npm run dev -w backoffice    # http://localhost:5175/
```

## Rename plan

Packages are prefixed `@studio/*` as a placeholder. Rename to your product/org scope when ready:

```bash
grep -rl "@studio/" . | xargs sed -i '' 's|@studio/|@yourbrand/|g'
```

## Deployment

`scripts/build-admin.mjs` produces a static `admin-dist/` tree ready for Cloudflare Pages, Netlify, S3, or any static host. The generator writes its output bundle to `localStorage`; the backoffice reads it on load.
