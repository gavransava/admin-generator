import { z } from "zod";

export const CONFIG_BUNDLE_VERSION = 1;

const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const AuthConfigSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("bearer"), token: z.string().min(1) }),
  z.object({
    kind: z.literal("header"),
    name: z.string().min(1),
    value: z.string().min(1),
  }),
]);
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export const BrandingSchema = z.object({
  productName: z.string().min(1),
  primaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color"),
  logoUrl: z.string().url().or(z.string().startsWith("data:")).optional(),
});
export type Branding = z.infer<typeof BrandingSchema>;

const RendererIdSchema = z.enum([
  "email-link",
  "url-link",
  "date",
  "datetime",
  "badge",
  "text",
  "number",
  "checkbox",
  "json-preview",
  "count-link",
]);
export type RendererId = z.infer<typeof RendererIdSchema>;

const BadgeColorSchema = z.enum(["green", "amber", "red", "gray", "blue"]);
export type BadgeColor = z.infer<typeof BadgeColorSchema>;

export const FieldDefSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  renderer: RendererIdSchema,
  visibleInList: z.boolean(),
  visibleInDetail: z.boolean(),
  editable: z.boolean(),
  enumValues: z.array(z.string()).optional(),
  badgeColorMap: z.record(BadgeColorSchema).optional(),
});
export type FieldDef = z.infer<typeof FieldDefSchema>;

const QueryParamDefSchema = z.object({
  name: z.string().min(1),
  in: z.literal("query"),
  required: z.boolean().optional(),
  schemaType: z
    .enum(["string", "integer", "number", "boolean", "array"])
    .optional(),
});
export type QueryParamDef = z.infer<typeof QueryParamDefSchema>;

const OperationSchema = z.object({
  method: HttpMethodSchema,
  path: z.string().min(1),
});

const ListOperationSchema = OperationSchema.extend({
  queryParams: z.array(QueryParamDefSchema).default([]),
});

const CreateUpdateOperationSchema = OperationSchema.extend({
  requestSchemaRef: z.string().optional(),
});

const PaginationSchema = z.object({
  style: z.enum(["page", "offset", "cursor", "none"]),
  pageParamName: z.string().optional(),
  pageSizeParamName: z.string().optional(),
  offsetParamName: z.string().optional(),
  limitParamName: z.string().optional(),
  cursorParamName: z.string().optional(),
  pageSizeOptions: z.array(z.number().int().positive()).optional(),
});

const SearchSchema = z.object({
  enabled: z.boolean(),
  paramName: z.string().optional(),
  fields: z.array(z.string()).optional(),
});

const SortSchema = z.object({
  enabled: z.boolean(),
  paramName: z.string().optional(),
  defaultField: z.string().optional(),
  defaultDir: z.enum(["asc", "desc"]).optional(),
});

export const CustomActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  endpoint: z.object({
    method: HttpMethodSchema,
    path: z.string().min(1),
  }),
  scope: z.enum(["row", "collection"]),
  confirm: z.boolean(),
  requestBodyTemplate: z.record(z.unknown()).optional(),
});
export type CustomAction = z.infer<typeof CustomActionSchema>;

export const ResourceDefSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  displayLabelField: z.string().min(1),
  operations: z.object({
    list: ListOperationSchema.optional(),
    get: OperationSchema.optional(),
    create: CreateUpdateOperationSchema.optional(),
    update: CreateUpdateOperationSchema.optional(),
    delete: OperationSchema.optional(),
  }),
  fields: z.array(FieldDefSchema),
  listColumns: z.array(z.string()),
  search: SearchSchema,
  sort: SortSchema,
  pagination: PaginationSchema,
  customActions: z.array(CustomActionSchema).default([]),
});
export type ResourceDef = z.infer<typeof ResourceDefSchema>;

export const ConfigBundleSchema = z.object({
  version: z.literal(CONFIG_BUNDLE_VERSION),
  apiBaseUrl: z.string().url(),
  auth: AuthConfigSchema,
  branding: BrandingSchema,
  resources: z.array(ResourceDefSchema),
});
export type ConfigBundle = z.infer<typeof ConfigBundleSchema>;

export const LOCAL_STORAGE_KEY = "admin-config:v1";
