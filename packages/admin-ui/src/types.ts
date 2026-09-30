/**
 * Type contracts consumed by the primitives in this package. These were
 * previously re-exported from `@studio/admin-schema` (a Zod-validated
 * ConfigBundle contract used by the generator + backoffice runtime); the
 * generator toolchain has moved out of BookiT, and admin-ui now owns the
 * types directly. Consumers (currently `admin/`) build resource configs
 * against these interfaces without any runtime schema layer.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RendererId =
  | "email-link"
  | "url-link"
  | "date"
  | "datetime"
  | "badge"
  | "text"
  | "number"
  | "checkbox"
  | "json-preview"
  | "count-link";

export type BadgeColor = "green" | "amber" | "red" | "gray" | "blue";

export type BadgeColorName = BadgeColor;

export interface Branding {
  productName: string;
  primaryColor: string;
  logoUrl?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  renderer: RendererId;
  visibleInList: boolean;
  visibleInDetail: boolean;
  editable: boolean;
  enumValues?: string[];
  badgeColorMap?: Record<string, BadgeColor>;
}

export interface QueryParamDef {
  name: string;
  in: "query";
  required?: boolean;
  schemaType?: "string" | "integer" | "number" | "boolean" | "array";
}

export interface Operation {
  method: HttpMethod;
  path: string;
}

export interface ListOperation extends Operation {
  queryParams: QueryParamDef[];
}

export interface CreateUpdateOperation extends Operation {
  requestSchemaRef?: string;
}

export interface Pagination {
  style: "page" | "offset" | "cursor" | "none";
  pageParamName?: string;
  pageSizeParamName?: string;
  offsetParamName?: string;
  limitParamName?: string;
  cursorParamName?: string;
  pageSizeOptions?: number[];
}

export interface Search {
  enabled: boolean;
  paramName?: string;
  fields?: string[];
}

export interface Sort {
  enabled: boolean;
  paramName?: string;
  defaultField?: string;
  defaultDir?: "asc" | "desc";
}

export interface CustomAction {
  id: string;
  label: string;
  endpoint: Operation;
  scope: "row" | "collection";
  confirm: boolean;
  requestBodyTemplate?: Record<string, unknown>;
}

export interface ResourceDef {
  name: string;
  label: string;
  displayLabelField: string;
  operations: {
    list?: ListOperation;
    get?: Operation;
    create?: CreateUpdateOperation;
    update?: CreateUpdateOperation;
    delete?: Operation;
  };
  fields: FieldDef[];
  listColumns: string[];
  search: Search;
  sort: Sort;
  pagination: Pagination;
  customActions: CustomAction[];
}
