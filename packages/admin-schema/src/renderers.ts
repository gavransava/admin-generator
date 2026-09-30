import type { RendererId } from "./config.js";

export interface OpenApiSchemaFragment {
  type?: string;
  format?: string;
  enum?: string[];
  pattern?: string;
  items?: OpenApiSchemaFragment;
  $ref?: string;
}

function looksLikeUrlPattern(pattern: string): boolean {
  const p = pattern.toLowerCase();
  return p.includes("http") || p.includes("://");
}

export function getDefaultRenderer(
  schema: OpenApiSchemaFragment | undefined,
): RendererId {
  if (!schema) return "text";

  if (schema.$ref || schema.type === "object") return "json-preview";

  if (schema.type === "array") return "count-link";

  if (schema.type === "boolean") return "checkbox";

  if (schema.type === "integer" || schema.type === "number") return "number";

  if (schema.type === "string") {
    if (Array.isArray(schema.enum) && schema.enum.length > 0) return "badge";
    if (schema.format === "email") return "email-link";
    if (schema.format === "uri" || schema.format === "url") return "url-link";
    if (schema.format === "date") return "date";
    if (schema.format === "date-time" || schema.format === "datetime") {
      return "datetime";
    }
    if (schema.pattern && looksLikeUrlPattern(schema.pattern)) {
      return "url-link";
    }
    return "text";
  }

  return "text";
}

const BADGE_PALETTE = ["green", "amber", "red", "gray", "blue"] as const;
export type BadgeColorName = (typeof BADGE_PALETTE)[number];

function stableHash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getDefaultBadgeColor(enumValue: string): BadgeColorName {
  return BADGE_PALETTE[stableHash(enumValue) % BADGE_PALETTE.length];
}

export function getDefaultBadgeColorMap(
  enumValues: string[],
): Record<string, BadgeColorName> {
  const map: Record<string, BadgeColorName> = {};
  for (const v of enumValues) map[v] = getDefaultBadgeColor(v);
  return map;
}
