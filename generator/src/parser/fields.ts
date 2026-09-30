import type { FieldDef } from "@studio/admin-schema";
import { getDefaultBadgeColorMap, getDefaultRenderer } from "@studio/admin-schema";
import type { OpenApiSchema, OpenApiOperation, NormalizedDocument } from "./types.js";

function resolveRef(
  ref: string,
  schemas: Record<string, OpenApiSchema>,
): OpenApiSchema | undefined {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  if (!match) return undefined;
  return schemas[match[1]];
}

function resolveSchema(
  schema: OpenApiSchema | undefined,
  schemas: Record<string, OpenApiSchema>,
  seen: Set<string> = new Set(),
): OpenApiSchema | undefined {
  if (!schema) return undefined;
  if (schema.$ref) {
    if (seen.has(schema.$ref)) return undefined;
    seen.add(schema.$ref);
    return resolveSchema(resolveRef(schema.$ref, schemas), schemas, seen);
  }
  if (Array.isArray(schema.allOf)) {
    const merged: OpenApiSchema = { type: "object", properties: {}, required: [] };
    for (const sub of schema.allOf) {
      const resolved = resolveSchema(sub, schemas, seen);
      if (!resolved) continue;
      if (resolved.properties) {
        merged.properties = { ...merged.properties, ...resolved.properties };
      }
      if (resolved.required) {
        merged.required = [...(merged.required ?? []), ...resolved.required];
      }
    }
    return merged;
  }
  return schema;
}

function pickListItemSchema(
  op: OpenApiOperation,
  schemas: Record<string, OpenApiSchema>,
): OpenApiSchema | undefined {
  const twoXx = op.responses
    ? Object.entries(op.responses).find(([code]) => code.startsWith("2"))
    : undefined;
  if (!twoXx) return undefined;
  const content = twoXx[1].content;
  const json = content?.["application/json"]?.schema;
  const resolved = resolveSchema(json, schemas);
  if (!resolved) return undefined;
  if (resolved.type === "array") return resolveSchema(resolved.items, schemas);
  // envelope: { data: [...] } or { items: [...] }
  const wrapper = resolved.properties;
  if (wrapper) {
    for (const key of ["data", "items", "results"]) {
      const inner = wrapper[key];
      const resolvedInner = resolveSchema(inner, schemas);
      if (resolvedInner?.type === "array") {
        return resolveSchema(resolvedInner.items, schemas);
      }
    }
  }
  return resolved;
}

function humanLabel(key: string): string {
  const spaced = key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function extractFieldsFromListOperation(
  op: OpenApiOperation,
  doc: NormalizedDocument,
): FieldDef[] {
  const itemSchema = pickListItemSchema(op, doc.schemas);
  if (!itemSchema?.properties) return [];

  return Object.entries(itemSchema.properties).map(([name, prop]) => {
    const resolved = resolveSchema(prop, doc.schemas);
    const renderer = getDefaultRenderer(resolved);
    const field: FieldDef = {
      name,
      label: humanLabel(name),
      renderer,
      visibleInList: true,
      visibleInDetail: true,
      editable: !resolved?.readOnly,
    };
    if (renderer === "badge" && resolved?.enum) {
      field.enumValues = resolved.enum;
      field.badgeColorMap = getDefaultBadgeColorMap(resolved.enum);
    }
    return field;
  });
}

export function extractRequestBodyFields(
  op: OpenApiOperation | undefined,
  doc: NormalizedDocument,
): { fields: FieldDef[]; required: Set<string> } {
  if (!op?.requestBody?.content) return { fields: [], required: new Set() };
  const json = op.requestBody.content["application/json"]?.schema;
  const resolved = resolveSchema(json, doc.schemas);
  if (!resolved?.properties) return { fields: [], required: new Set() };
  const required = new Set(resolved.required ?? []);
  const fields = Object.entries(resolved.properties).map(([name, prop]) => {
    const r = resolveSchema(prop, doc.schemas);
    const renderer = getDefaultRenderer(r);
    const field: FieldDef = {
      name,
      label: humanLabel(name),
      renderer,
      visibleInList: false,
      visibleInDetail: true,
      editable: !r?.readOnly,
    };
    if (renderer === "badge" && r?.enum) {
      field.enumValues = r.enum;
      field.badgeColorMap = getDefaultBadgeColorMap(r.enum);
    }
    return field;
  });
  return { fields, required };
}

export function getFieldConstraints(
  fieldName: string,
  op: OpenApiOperation | undefined,
  doc: NormalizedDocument,
) {
  if (!op?.requestBody?.content) return {};
  const json = op.requestBody.content["application/json"]?.schema;
  const resolved = resolveSchema(json, doc.schemas);
  const prop = resolveSchema(resolved?.properties?.[fieldName], doc.schemas);
  if (!prop) return {};
  return {
    minLength: prop.minLength,
    maxLength: prop.maxLength,
    min: prop.minimum,
    max: prop.maximum,
    pattern: prop.pattern,
    enumValues: prop.enum,
  };
}
