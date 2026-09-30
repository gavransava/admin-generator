import type { ConfigBundle } from "@studio/admin-schema";
import { CONFIG_BUNDLE_VERSION, LOCAL_STORAGE_KEY } from "@studio/admin-schema";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConfigBundle } from "./store.js";

const bundleA: ConfigBundle = {
  version: CONFIG_BUNDLE_VERSION,
  apiBaseUrl: "https://api-a.example.com",
  auth: { kind: "none" },
  branding: { productName: "A", primaryColor: "#586c31" },
  resources: [],
};

const bundleB: ConfigBundle = {
  ...bundleA,
  apiBaseUrl: "https://api-b.example.com",
  branding: { productName: "B", primaryColor: "#586c31" },
};

beforeEach(() => {
  // No bootstrap saved by default — hook falls back to localStorage flow.
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 404 })),
  );
});

afterEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

describe("useConfigBundle hot-reload", () => {
  it("re-renders with the new bundle when a storage event fires for LOCAL_STORAGE_KEY", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bundleA));

    const { result } = renderHook(() => useConfigBundle());
    await waitFor(() => expect(result.current.state.kind).toBe("ok"));
    if (result.current.state.kind === "ok") {
      expect(result.current.state.bundle.apiBaseUrl).toBe("https://api-a.example.com");
    }

    act(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bundleB));
      window.dispatchEvent(new StorageEvent("storage", { key: LOCAL_STORAGE_KEY }));
    });

    await waitFor(() => {
      if (result.current.state.kind !== "ok") throw new Error("not ok");
      expect(result.current.state.bundle.apiBaseUrl).toBe("https://api-b.example.com");
    });
  });

  it("ignores storage events for other keys", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bundleA));
    const { result } = renderHook(() => useConfigBundle());
    await waitFor(() => expect(result.current.state.kind).toBe("ok"));

    act(() => {
      localStorage.setItem("some-other-key", "junk");
      window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key" }));
    });

    if (result.current.state.kind === "ok") {
      expect(result.current.state.bundle.apiBaseUrl).toBe("https://api-a.example.com");
    }
  });
});
