import { describe, expect, it } from "vitest";
import { ConfigBundleSchema, CONFIG_BUNDLE_VERSION } from "./config.js";

function minimalBundle() {
  return {
    version: CONFIG_BUNDLE_VERSION,
    apiBaseUrl: "https://api.example.com",
    auth: { kind: "none" as const },
    branding: {
      productName: "Demo Admin",
      primaryColor: "#586c31",
    },
    resources: [],
  };
}

describe("ConfigBundleSchema", () => {
  it("accepts a minimal valid bundle", () => {
    expect(() => ConfigBundleSchema.parse(minimalBundle())).not.toThrow();
  });

  it("accepts each auth kind", () => {
    for (const auth of [
      { kind: "none" as const },
      { kind: "bearer" as const, token: "tok" },
      { kind: "header" as const, name: "X-Api-Key", value: "abc" },
    ]) {
      const b = { ...minimalBundle(), auth };
      expect(() => ConfigBundleSchema.parse(b)).not.toThrow();
    }
  });

  it("rejects wrong version", () => {
    const b = { ...minimalBundle(), version: 2 };
    expect(() => ConfigBundleSchema.parse(b)).toThrow();
  });

  it("rejects unknown auth kind", () => {
    const b = { ...minimalBundle(), auth: { kind: "oauth", token: "x" } };
    expect(() => ConfigBundleSchema.parse(b)).toThrow();
  });

  it("rejects invalid apiBaseUrl", () => {
    const b = { ...minimalBundle(), apiBaseUrl: "not-a-url" };
    expect(() => ConfigBundleSchema.parse(b)).toThrow();
  });

  it("rejects invalid primaryColor", () => {
    const b = {
      ...minimalBundle(),
      branding: { productName: "x", primaryColor: "red" },
    };
    expect(() => ConfigBundleSchema.parse(b)).toThrow();
  });

  it("allows empty resources array", () => {
    expect(() =>
      ConfigBundleSchema.parse({ ...minimalBundle(), resources: [] }),
    ).not.toThrow();
  });

  it("rejects bearer auth with empty token", () => {
    const b = { ...minimalBundle(), auth: { kind: "bearer", token: "" } };
    expect(() => ConfigBundleSchema.parse(b)).toThrow();
  });
});
