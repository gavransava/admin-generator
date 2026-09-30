import type { FieldDef } from "./types.js";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AutoForm } from "./AutoForm.js";

const nameField: FieldDef = {
  name: "name",
  label: "Name",
  renderer: "text",
  visibleInList: true,
  visibleInDetail: true,
  editable: true,
};
const emailField: FieldDef = {
  name: "email",
  label: "Email",
  renderer: "email-link",
  visibleInList: true,
  visibleInDetail: true,
  editable: true,
};

describe("AutoForm", () => {
  it("disables submit when a required field is empty", () => {
    const onSubmit = vi.fn();
    render(
      <AutoForm
        fields={[{ field: nameField, required: true }]}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("button", { name: /Save/ })).toBeDisabled();
  });

  it("enables submit when required is filled", () => {
    const onSubmit = vi.fn();
    render(
      <AutoForm
        fields={[{ field: nameField, required: true }]}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Alice" } });
    expect(screen.getByRole("button", { name: /Save/ })).toBeEnabled();
  });

  it("passes only entered values to onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AutoForm
        fields={[
          { field: nameField, required: true },
          { field: emailField },
        ]}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "a@b.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledWith({ name: "Alice", email: "a@b.co" });
  });

  it("renders server-side field errors", () => {
    render(
      <AutoForm
        fields={[{ field: emailField, required: true }]}
        initial={{ email: "" }}
        onSubmit={vi.fn()}
        serverErrors={{ email: "Email already taken" }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "taken@x.co" },
    });
    fireEvent.blur(screen.getByLabelText(/Email/));
    expect(screen.getByText(/Email already taken/)).toBeInTheDocument();
  });
});
