import type { HttpMethod } from "@studio/admin-schema";

export interface OpenApiParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: { type?: string };
}

export interface OpenApiOperation {
  method: HttpMethod;
  path: string;
  operationId?: string;
  summary?: string;
  security?: unknown[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<
      string,
      {
        schema?: OpenApiSchema;
      }
    >;
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: Record<
        string,
        {
          schema?: OpenApiSchema;
        }
      >;
    }
  >;
}

export interface OpenApiSchema {
  type?: string;
  format?: string;
  enum?: string[];
  pattern?: string;
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  $ref?: string;
  allOf?: OpenApiSchema[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  readOnly?: boolean;
  description?: string;
}

export interface NormalizedDocument {
  raw: unknown;
  servers: string[];
  operations: OpenApiOperation[];
  schemas: Record<string, OpenApiSchema>;
}

export type UnmappedReason =
  | "not-a-resource-path"
  | "non-crud-method"
  | "requires-id-suffix"
  | "collection-with-id";

export interface UnmappedOperation {
  operation: OpenApiOperation;
  resourceName: string | null;
  reason: UnmappedReason;
  reasonText: string;
}
