import type { HttpMethod } from "@studio/admin-schema";
import YAML from "yaml";
import type {
  NormalizedDocument,
  OpenApiOperation,
  OpenApiSchema,
} from "./types.js";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export class IngestError extends Error {
  constructor(
    public code:
      | "not-openapi-3"
      | "swagger-2"
      | "parse-error"
      | "structural-error",
    message: string,
  ) {
    super(message);
  }
}

async function readFileText(file: File): Promise<string> {
  return await file.text();
}

async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: "application/json, application/yaml" } });
  if (!res.ok) throw new IngestError("parse-error", `Fetch failed: HTTP ${res.status}`);
  return await res.text();
}

function parseDocText(text: string): unknown {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new IngestError(
        "parse-error",
        `JSON parse error: ${(e as Error).message}`,
      );
    }
  }
  try {
    return YAML.parse(text);
  } catch (e) {
    throw new IngestError(
      "parse-error",
      `YAML parse error: ${(e as Error).message}`,
    );
  }
}

function assertOpenApi3(doc: unknown): asserts doc is { openapi: string } {
  if (typeof doc !== "object" || doc === null) {
    throw new IngestError("structural-error", "Document is not an object");
  }
  const anyDoc = doc as Record<string, unknown>;
  if (typeof anyDoc.swagger === "string" && anyDoc.swagger.startsWith("2.")) {
    throw new IngestError(
      "swagger-2",
      "Swagger 2.0 is not supported — convert to OpenAPI 3 at converter.swagger.io",
    );
  }
  if (typeof anyDoc.openapi !== "string" || !anyDoc.openapi.startsWith("3.")) {
    throw new IngestError(
      "not-openapi-3",
      "Document is missing an `openapi: 3.x` root field",
    );
  }
  if (typeof anyDoc.info !== "object" || anyDoc.info === null) {
    throw new IngestError(
      "structural-error",
      "Document is missing the required `info` object",
    );
  }
  if (typeof anyDoc.paths !== "object" || anyDoc.paths === null) {
    throw new IngestError(
      "structural-error",
      "Document is missing the required `paths` object",
    );
  }
}

function flattenOperations(
  paths: Record<string, Record<string, unknown>>,
): OpenApiOperation[] {
  const ops: OpenApiOperation[] = [];
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of HTTP_METHODS) {
      const key = method.toLowerCase();
      const op = (pathItem as Record<string, unknown>)[key];
      if (!op || typeof op !== "object") continue;
      const anyOp = op as Record<string, unknown>;
      ops.push({
        method,
        path,
        operationId: anyOp.operationId as string | undefined,
        summary: anyOp.summary as string | undefined,
        security: anyOp.security as unknown[] | undefined,
        parameters: anyOp.parameters as OpenApiOperation["parameters"],
        requestBody: anyOp.requestBody as OpenApiOperation["requestBody"],
        responses: anyOp.responses as OpenApiOperation["responses"],
      });
    }
  }
  return ops;
}

export async function ingestFile(file: File): Promise<NormalizedDocument> {
  return await ingestText(await readFileText(file));
}

export async function ingestUrl(url: string): Promise<NormalizedDocument> {
  return await ingestText(await fetchUrlText(url));
}

export async function ingestText(text: string): Promise<NormalizedDocument> {
  const raw = parseDocText(text);
  assertOpenApi3(raw);

  // NOTE: `SwaggerParser.validate` was previously called here to run schema
  // validation + $ref dereferencing. It pulled in a Node-only Buffer polyfill
  // that broke browser builds. Our own `assertOpenApi3` above enforces the
  // version marker; `resolveRef` in ./fields.ts resolves $refs on demand.
  // Deep JSON-schema validation is deferred to a downstream lighter check.

  const anyRaw = raw as Record<string, unknown>;
  const servers = Array.isArray(anyRaw.servers)
    ? (anyRaw.servers as Array<Record<string, unknown>>)
        .map((s) => (typeof s.url === "string" ? s.url : null))
        .filter((s): s is string => Boolean(s))
    : [];

  const paths = (anyRaw.paths ?? {}) as Record<string, Record<string, unknown>>;
  const operations = flattenOperations(paths);

  const components = anyRaw.components as { schemas?: Record<string, OpenApiSchema> } | undefined;
  const schemas = components?.schemas ?? {};

  return { raw, servers, operations, schemas };
}
