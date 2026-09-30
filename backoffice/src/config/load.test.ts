import { CONFIG_BUNDLE_VERSION, LOCAL_STORAGE_KEY } from "@studio/admin-schema";
import { afterEach, describe, expect, it } from "vitest";
import { loadBundle } from "./load.js";

const validBundle = () => ({
  version: CONFIG_BUNDLE_VERSION,
  apiBaseUrl: "https://api.example.com",
  auth: { kind: "none" },
  branding: { productName: "Demo", primaryColor: "#586c31" },
  resources: [],
});

afterEach(() => {
  localStorage.clear();
});

describe("loadBundle", () => {
  it("returns missing when nothing in storage", () => {
    const r = loadBundle();
    expect(r.kind).toBe("missing");
  });

  it("returns ok for a valid bundle", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validBundle()));
    const r = loadBundle();
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.bundle.apiBaseUrl).toBe("https://api.example.com");
  });

  it("returns invalid for malformed JSON", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "{{not json");
    const r = loadBundle();
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") expect(r.message).toMatch(/JSON/);
  });

  it("returns invalid for wrong version", () => {
    const bad = { ...validBundle(), version: 2 };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bad));
    const r = loadBundle();
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") expect(r.message).toMatch(/version/);
  });

  it("returns invalid for wrong shape", () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ version: 1, apiBaseUrl: "not-a-url", auth: { kind: "none" } }),
    );
    const r = loadBundle();
    expect(r.kind).toBe("invalid");
  });
});
