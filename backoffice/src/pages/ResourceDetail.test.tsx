import type { ConfigBundle, ResourceDef } from "@studio/admin-schema";
import { CONFIG_BUNDLE_VERSION } from "@studio/admin-schema";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResourceDetail } from "./ResourceDetail.js";

const bundle: ConfigBundle = {
  version: CONFIG_BUNDLE_VERSION,
  apiBaseUrl: "https://api.example.com",
  auth: { kind: "none" },
  branding: { productName: "Demo", primaryColor: "#586c31" },
  resources: [],
};

const resource: ResourceDef = {
  name: "users",
  label: "User",
  displayLabelField: "email",
  operations: {
    get: { method: "GET", path: "/users/{id}" },
    delete: { method: "DELETE", path: "/users/{id}" },
  },
  fields: [
    {
      name: "email",
      label: "Email",
      renderer: "email-link",
      visibleInList: true,
      visibleInDetail: true,
      editable: true,
    },
  ],
  listColumns: ["email"],
  search: { enabled: false },
  sort: { enabled: false },
  pagination: { style: "none" },
  customActions: [],
};

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/users/abc"]}>
        <Routes>
          <Route
            path="/users/:id"
            element={<ResourceDetail bundle={bundle} resource={resource} />}
          />
          <Route path="/users" element={<div>list-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ data: { id: "abc", email: "a@b.co" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ResourceDetail delete confirmation", () => {
  it("aborts the DELETE request when the user cancels the confirm dialog", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument(),
    );
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/Delete this User/));
    // No DELETE call fired
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("issues the DELETE request when the user confirms", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderDetail();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument(),
    );
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/users/abc");
      expect(init.method).toBe("DELETE");
    });
  });
});
