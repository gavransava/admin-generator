import type { FieldDef } from "./types.js";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable.js";

const fields: FieldDef[] = [
  {
    name: "email",
    label: "Email",
    renderer: "email-link",
    visibleInList: true,
    visibleInDetail: true,
    editable: true,
  },
  {
    name: "status",
    label: "Status",
    renderer: "badge",
    visibleInList: true,
    visibleInDetail: true,
    editable: true,
    enumValues: ["active", "banned"],
    badgeColorMap: { active: "green", banned: "red" },
  },
];

describe("DataTable", () => {
  it("renders headers in column order", () => {
    render(<DataTable columns={fields} rows={[]} idField="id" />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers[0]).toContain("Email");
    expect(headers[1]).toContain("Status");
  });

  it("renders empty state when no rows", () => {
    render(<DataTable columns={fields} rows={[]} idField="id" emptyLabel="No users" />);
    expect(screen.getByText("No users")).toBeInTheDocument();
  });

  it("renders row cells via renderers", () => {
    render(
      <DataTable
        columns={fields}
        rows={[{ id: "1", email: "a@b.co", status: "active" }]}
        idField="id"
      />,
    );
    expect(screen.getByText("a@b.co").tagName).toBe("A");
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders error state and skips rows", () => {
    render(
      <DataTable
        columns={fields}
        rows={[{ id: "1", email: "x" }]}
        idField="id"
        error={{ message: "500 Server Error" }}
      />,
    );
    expect(screen.getByText("500 Server Error")).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /x/ })).not.toBeInTheDocument();
  });

  it("cycles sort direction asc → desc → undefined on header click", () => {
    const onSortChange = vi.fn();
    const { rerender } = render(
      <DataTable
        columns={fields}
        rows={[]}
        idField="id"
        onSortChange={onSortChange}
      />,
    );
    const emailHeader = screen.getByText("Email");
    fireEvent.click(emailHeader);
    expect(onSortChange).toHaveBeenLastCalledWith("email", "asc");

    rerender(
      <DataTable
        columns={fields}
        rows={[]}
        idField="id"
        onSortChange={onSortChange}
        sortField="email"
        sortDir="asc"
      />,
    );
    fireEvent.click(screen.getByText("Email"));
    expect(onSortChange).toHaveBeenLastCalledWith("email", "desc");

    rerender(
      <DataTable
        columns={fields}
        rows={[]}
        idField="id"
        onSortChange={onSortChange}
        sortField="email"
        sortDir="desc"
      />,
    );
    fireEvent.click(screen.getByText("Email"));
    expect(onSortChange).toHaveBeenLastCalledWith("email", undefined);
  });

  it("fires onRowClick with the row data", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={fields}
        rows={[{ id: "1", email: "a@b.co", status: "active" }]}
        idField="id"
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByRole("row", { name: /a@b\.co/ }));
    expect(onRowClick).toHaveBeenCalledWith({
      id: "1",
      email: "a@b.co",
      status: "active",
    });
  });
});
