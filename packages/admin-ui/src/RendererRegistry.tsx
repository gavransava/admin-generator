import type { FieldDef, RendererId } from "./types.js";
import type { ReactNode } from "react";
import {
  BadgeRenderer,
  CheckboxRenderer,
  CountLinkRenderer,
  DateRenderer,
  DateTimeRenderer,
  EmailLinkRenderer,
  JsonPreviewRenderer,
  NumberRenderer,
  TextRenderer,
  UrlLinkRenderer,
} from "./renderers/index.js";

export type RendererComponent = (props: {
  value: unknown;
  field: FieldDef;
}) => ReactNode;

export const RENDERER_REGISTRY: Record<RendererId, RendererComponent> = {
  text: ({ value }) => <TextRenderer value={value} />,
  number: ({ value }) => <NumberRenderer value={value} />,
  checkbox: ({ value }) => <CheckboxRenderer value={value} />,
  "email-link": ({ value }) => <EmailLinkRenderer value={value} />,
  "url-link": ({ value }) => <UrlLinkRenderer value={value} />,
  date: ({ value }) => <DateRenderer value={value} />,
  datetime: ({ value }) => <DateTimeRenderer value={value} />,
  badge: ({ value, field }) => (
    <BadgeRenderer value={value} colorMap={field.badgeColorMap} />
  ),
  "json-preview": ({ value }) => <JsonPreviewRenderer value={value} />,
  "count-link": ({ value }) => <CountLinkRenderer value={value} />,
};

export function renderField(field: FieldDef, value: unknown): ReactNode {
  const Comp = RENDERER_REGISTRY[field.renderer] ?? RENDERER_REGISTRY.text;
  return <Comp value={value} field={field} />;
}
