import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CONFIG_BUNDLE_VERSION,
  ConfigBundleSchema,
  LOCAL_STORAGE_KEY,
} from "@studio/admin-schema";
import { ingestText } from "./parser/ingest.js";
import { detectResources } from "./parser/resources.js";
import { useWizard } from "./store/wizard.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, "__fixtures__/bookit-openapi.json");
const fixtureText = readFileSync(FIXTURE_PATH, "utf8");

describe("full wizard flow with BookiT swagger fixture", () => {
  beforeEach(() => {
    useWizard.getState().reset();
    localStorage.clear();
  });

  it("ingests, detects, populates, and publishes a valid ConfigBundle", async () => {
    // Step 0 — Upload: ingest raw swagger text
    const doc = await ingestText(fixtureText);
    expect(doc.operations.length).toBeGreaterThan(0);

    const { resources, unmapped, relatedByParent } = detectResources(doc);
    expect(resources.length).toBeGreaterThan(0);

    useWizard.getState().setDoc(doc, resources, unmapped, relatedByParent);

    // Auto-advance moved store to step 1, apiBaseUrl seeded from first server
    let state = useWizard.getState();
    expect(state.step).toBe(1);
    expect(state.apiBaseUrl).toBe("https://api.zakazisam.rs/api");

    // Step 1 — Auth
    useWizard
      .getState()
      .setAuth({ kind: "bearer", token: "test-access-token" });
    useWizard.getState().setStep(2);

    // Step 2 — Resources: verify BookiT-specific resources were detected
    state = useWizard.getState();
    const names = state.resources.map((r) => r.name);
    // Only super-admin resources should reach Step 2 — tenant CRUD
    // endpoints (`companies`, `bookings`, `slots`, `patterns`) are
    // filtered by `setDoc` because a cross-tenant admin panel talks
    // to the `admin-*` variants instead.
    for (const expected of [
      "admin-companies",
      "admin-users",
      "admin-bookings",
      "admin-slots",
    ]) {
      expect(names, `missing resource: ${expected}`).toContain(expected);
    }
    for (const filtered of ["companies", "bookings", "slots", "patterns"]) {
      expect(names, `resource should be hidden: ${filtered}`).not.toContain(filtered);
    }
    useWizard.getState().setStep(3);

    // Step 3 — Fields: resources with a list operation infer fields from its
    // response schema. Resources with only /me + /:id (e.g. companies) have no
    // list op, so fields are empty — that is expected today.
    for (const r of useWizard.getState().resources) {
      expect(r.displayLabelField).toBeTruthy();
      if (r.operations.list) {
        expect(r.fields.length, `${r.name} has no fields`).toBeGreaterThan(0);
        expect(r.listColumns.length).toBeGreaterThan(0);
      }
    }
    useWizard.getState().setStep(4);

    // Step 4 — Custom actions: none for the demo pass; skip
    useWizard.getState().setStep(5);

    // Step 5 — Publish: branding + launch
    useWizard.getState().setBranding({
      productName: "BookiT Admin",
      primaryColor: "#586c31",
    });

    const bundle = useWizard.getState().buildBundle();

    // Assert bundle shape against the Zod schema (source of truth)
    const parsed = ConfigBundleSchema.parse(bundle);
    expect(parsed.version).toBe(CONFIG_BUNDLE_VERSION);
    expect(parsed.apiBaseUrl).toBe("https://api.zakazisam.rs/api");
    expect(parsed.auth).toEqual({ kind: "bearer", token: "test-access-token" });
    expect(parsed.branding.productName).toBe("BookiT Admin");
    expect(parsed.resources.map((r) => r.name).sort()).toEqual(
      expect.arrayContaining([
        "admin-bookings",
        "admin-companies",
        "admin-slots",
        "admin-users",
      ]),
    );

    // Publish writes to localStorage under the shared key
    const publishResult = useWizard.getState().publish();
    expect(publishResult).toEqual({ ok: true });
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const rehydrated = ConfigBundleSchema.parse(JSON.parse(stored!));
    expect(rehydrated).toEqual(parsed);
  });

  it("detected resources expose the CRUD operations the BookiT server ships", async () => {
    const doc = await ingestText(fixtureText);
    const { resources } = detectResources(doc);
    const byName = Object.fromEntries(resources.map((r) => [r.name, r]));

    // Companies: server exposes GET /companies/{id}, PUT /companies/{id}
    expect(byName.companies?.operations.get?.method).toBe("GET");
    expect(byName.companies?.operations.update?.method).toBe("PUT");

    // Slots: full collection CRUD (list + create + patch + delete)
    expect(byName.slots?.operations.list?.method).toBe("GET");
    expect(byName.slots?.operations.create?.method).toBe("POST");
    expect(byName.slots?.operations.update?.method).toBe("PATCH");
    expect(byName.slots?.operations.delete?.method).toBe("DELETE");

    // Patterns: collection CRUD
    expect(byName.patterns?.operations.list?.method).toBe("GET");
    expect(byName.patterns?.operations.create?.method).toBe("POST");
    expect(byName.patterns?.operations.update?.method).toBe("PATCH");
    expect(byName.patterns?.operations.delete?.method).toBe("DELETE");
  });
});
