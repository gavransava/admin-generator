import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BadgeRenderer,
  CountLinkRenderer,
  DateRenderer,
  DateTimeRenderer,
  EmailLinkRenderer,
  JsonPreviewRenderer,
  UrlLinkRenderer,
} from "./index.js";

describe("renderers", () => {
  it("BadgeRenderer picks color from map deterministically across renders", () => {
    const map = { active: "green" as const, banned: "red" as const };
    const { rerender } = render(<BadgeRenderer value="active" colorMap={map} />);
    const first = screen.getByText("active").className;
    rerender(<BadgeRenderer value="active" colorMap={map} />);
    const second = screen.getByText("active").className;
    expect(first).toBe(second);
    expect(first).toMatch(/emerald/);
  });

  it("BadgeRenderer defaults to gray when map missing key", () => {
    render(<BadgeRenderer value="mystery" />);
    expect(screen.getByText("mystery").className).toMatch(/gray/);
  });

  it("EmailLinkRenderer produces mailto anchor", () => {
    render(<EmailLinkRenderer value="a@b.co" />);
    const a = screen.getByText("a@b.co") as HTMLAnchorElement;
    expect(a.tagName).toBe("A");
    expect(a.getAttribute("href")).toBe("mailto:a@b.co");
  });

  it("UrlLinkRenderer opens in new tab", () => {
    render(<UrlLinkRenderer value="https://example.com" />);
    const a = screen.getByText("https://example.com") as HTMLAnchorElement;
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
  });

  it("DateRenderer produces yyyy-mm-dd", () => {
    render(<DateRenderer value="2026-09-06T12:00:00Z" />);
    expect(screen.getByText("2026-09-06")).toBeInTheDocument();
  });

  it("DateTimeRenderer produces yyyy-mm-dd HH:MM", () => {
    render(<DateTimeRenderer value="2026-09-06T12:34:00Z" />);
    expect(screen.getByText("2026-09-06 12:34")).toBeInTheDocument();
  });

  it("CountLinkRenderer pluralizes correctly", () => {
    const { rerender } = render(<CountLinkRenderer value={[1]} />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
    rerender(<CountLinkRenderer value={[1, 2]} />);
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("JsonPreviewRenderer truncates long arrays", () => {
    // Arrays skip the small-object dl branch — falls through to the
    // truncating code fence.
    const big = Array.from({ length: 30 }, (_, i) => ({ i }));
    render(<JsonPreviewRenderer value={big} />);
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it("JsonPreviewRenderer humanizes objects with a name field", () => {
    render(<JsonPreviewRenderer value={{ name: "Acme", slug: "acme" }} />);
    expect(screen.getByText(/Acme.*acme/)).toBeInTheDocument();
  });
});
