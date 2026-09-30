import { describe, expect, it } from "vitest";
import { getDefaultBadgeColor, getDefaultRenderer } from "./renderers.js";

describe("getDefaultRenderer", () => {
  it("email format → email-link", () => {
    expect(getDefaultRenderer({ type: "string", format: "email" })).toBe(
      "email-link",
    );
  });

  it("uri format → url-link", () => {
    expect(getDefaultRenderer({ type: "string", format: "uri" })).toBe(
      "url-link",
    );
    expect(getDefaultRenderer({ type: "string", format: "url" })).toBe(
      "url-link",
    );
  });

  it("date format → date", () => {
    expect(getDefaultRenderer({ type: "string", format: "date" })).toBe("date");
  });

  it("date-time format → datetime", () => {
    expect(getDefaultRenderer({ type: "string", format: "date-time" })).toBe(
      "datetime",
    );
  });

  it("enum wins over format for badge", () => {
    expect(
      getDefaultRenderer({
        type: "string",
        format: "email",
        enum: ["a", "b"],
      }),
    ).toBe("badge");
  });

  it("plain string → text", () => {
    expect(getDefaultRenderer({ type: "string" })).toBe("text");
  });

  it("integer → number, number → number", () => {
    expect(getDefaultRenderer({ type: "integer" })).toBe("number");
    expect(getDefaultRenderer({ type: "number" })).toBe("number");
  });

  it("boolean → checkbox", () => {
    expect(getDefaultRenderer({ type: "boolean" })).toBe("checkbox");
  });

  it("array → count-link", () => {
    expect(
      getDefaultRenderer({ type: "array", items: { type: "string" } }),
    ).toBe("count-link");
  });

  it("object with no $ref → json-preview", () => {
    expect(getDefaultRenderer({ type: "object" })).toBe("json-preview");
  });

  it("$ref → json-preview", () => {
    expect(getDefaultRenderer({ $ref: "#/components/schemas/User" })).toBe(
      "json-preview",
    );
  });

  it("undefined schema → text", () => {
    expect(getDefaultRenderer(undefined)).toBe("text");
  });

  it("url pattern hint upgrades to url-link", () => {
    expect(
      getDefaultRenderer({ type: "string", pattern: "^https?://" }),
    ).toBe("url-link");
  });
});

describe("getDefaultBadgeColor", () => {
  it("is deterministic across calls", () => {
    const c1 = getDefaultBadgeColor("active");
    const c2 = getDefaultBadgeColor("active");
    expect(c1).toBe(c2);
  });

  it("picks from the fixed palette", () => {
    const palette = ["green", "amber", "red", "gray", "blue"];
    for (const v of ["active", "suspended", "banned", "pending", "archived"]) {
      expect(palette).toContain(getDefaultBadgeColor(v));
    }
  });
});
