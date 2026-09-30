import type { BadgeColorName } from "../types.js";
import type { ReactNode } from "react";

const BADGE_COLOR_CLASSES: Record<BadgeColorName, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
};

function fallback(value: unknown, node: ReactNode): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400">—</span>;
  }
  return node;
}

export function TextRenderer({ value }: { value: unknown }): ReactNode {
  return fallback(
    value,
    <span className="truncate max-w-xs inline-block align-middle">
      {String(value)}
    </span>,
  );
}

export function NumberRenderer({ value }: { value: unknown }): ReactNode {
  return fallback(value, <span className="tabular-nums">{String(value)}</span>);
}

export function CheckboxRenderer({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }
  const on = Boolean(value);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        on
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {on ? "Yes" : "No"}
    </span>
  );
}

export function EmailLinkRenderer({ value }: { value: unknown }): ReactNode {
  const str = typeof value === "string" ? value : "";
  return fallback(
    str,
    <a
      className="text-primary-700 hover:underline"
      href={`mailto:${str}`}
      onClick={(e) => e.stopPropagation()}
    >
      {str}
    </a>,
  );
}

export function UrlLinkRenderer({ value }: { value: unknown }): ReactNode {
  const str = typeof value === "string" ? value : "";
  return fallback(
    str,
    <a
      className="text-primary-700 hover:underline"
      href={str}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {str}
    </a>,
  );
}

export function DateRenderer({ value }: { value: unknown }): ReactNode {
  if (!value) return fallback(value, null);
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return <TextRenderer value={value} />;
  return <span>{d.toISOString().slice(0, 10)}</span>;
}

export function DateTimeRenderer({ value }: { value: unknown }): ReactNode {
  if (!value) return fallback(value, null);
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return <TextRenderer value={value} />;
  return <span>{d.toISOString().replace("T", " ").slice(0, 16)}</span>;
}

export function BadgeRenderer({
  value,
  colorMap,
}: {
  value: unknown;
  colorMap?: Record<string, BadgeColorName>;
}): ReactNode {
  const str = value == null ? "" : String(value);
  const color = colorMap?.[str] ?? "gray";
  return fallback(
    str,
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BADGE_COLOR_CLASSES[color]}`}
    >
      {str}
    </span>,
  );
}

function humanizeObject(obj: Record<string, unknown>): string | null {
  const name =
    (obj.name as string | undefined) ??
    (obj.title as string | undefined) ??
    (obj.label as string | undefined) ??
    ([obj.firstName, obj.lastName].filter(Boolean).join(" ") || null);
  const identifier =
    (obj.slug as string | undefined) ??
    (obj.email as string | undefined) ??
    (obj.id as string | undefined);
  if (name && identifier && name !== identifier) return `${name} · ${identifier}`;
  if (name) return name;
  if (identifier) return identifier;
  return null;
}

export function JsonPreviewRenderer({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined) return fallback(value, null);

  // Nested relation objects: prefer a human name over a JSON blob.
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const summary = humanizeObject(value as Record<string, unknown>);
    if (summary) {
      return (
        <span className="text-gray-900" title={JSON.stringify(value)}>
          {summary}
        </span>
      );
    }

    // Small objects — render as a key: value list, one per line.
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length <= 4) {
      return (
        <dl className="text-xs space-y-0.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-gray-500">{k}</dt>
              <dd className="text-gray-900">{String(v)}</dd>
            </div>
          ))}
        </dl>
      );
    }
  }

  const preview = JSON.stringify(value);
  const truncated = preview.length > 60 ? `${preview.slice(0, 57)}...` : preview;
  return (
    <code
      className="text-xs bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200"
      title={preview}
    >
      {truncated}
    </code>
  );
}

export function CountLinkRenderer({ value }: { value: unknown }): ReactNode {
  if (!Array.isArray(value)) return fallback(value, null);
  return (
    <span className="text-primary-700">
      {value.length} item{value.length === 1 ? "" : "s"}
    </span>
  );
}
