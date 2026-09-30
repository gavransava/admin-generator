import type { FieldDef } from "./types.js";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface AutoFormFieldSpec {
  field: FieldDef;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  enumValues?: string[];
}

export interface AutoFormProps {
  fields: AutoFormFieldSpec[];
  initial?: Record<string, unknown>;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
  serverErrors?: Record<string, string>;
}

type Errors = Record<string, string>;

function validateField(spec: AutoFormFieldSpec, raw: unknown): string | null {
  const { field, required, minLength, maxLength, pattern, min, max, enumValues } = spec;
  const isEmpty =
    raw === undefined ||
    raw === null ||
    (typeof raw === "string" && raw.length === 0);

  if (required && isEmpty) return `${field.label} is required`;
  if (isEmpty) return null;

  if (typeof raw === "string") {
    if (minLength != null && raw.length < minLength) {
      return `${field.label} must be at least ${minLength} characters`;
    }
    if (maxLength != null && raw.length > maxLength) {
      return `${field.label} must be at most ${maxLength} characters`;
    }
    if (pattern && !new RegExp(pattern).test(raw)) {
      return `${field.label} has an invalid format`;
    }
    if (enumValues && !enumValues.includes(raw)) {
      return `${field.label} must be one of ${enumValues.join(", ")}`;
    }
  }

  if (typeof raw === "number") {
    if (min != null && raw < min) return `${field.label} must be ≥ ${min}`;
    if (max != null && raw > max) return `${field.label} must be ≤ ${max}`;
  }

  return null;
}

export function AutoForm({
  fields,
  initial = {},
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  serverErrors,
}: AutoFormProps): ReactNode {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const clientErrors: Errors = useMemo(() => {
    const errs: Errors = {};
    for (const spec of fields) {
      const err = validateField(spec, values[spec.field.name]);
      if (err) errs[spec.field.name] = err;
    }
    return errs;
  }, [fields, values]);

  const allErrors: Errors = { ...clientErrors, ...(serverErrors ?? {}) };
  const canSubmit = Object.keys(clientErrors).length === 0 && !submitting;

  const setValue = (name: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const markTouched = (name: string) =>
    setTouched((prev) => ({ ...prev, [name]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(Object.fromEntries(fields.map((f) => [f.field.name, true])));
    if (Object.keys(clientErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((spec) => {
        const { field, enumValues, required } = spec;
        const val = values[field.name];
        const err = touched[field.name] ? allErrors[field.name] : undefined;
        const commonProps = {
          id: `field-${field.name}`,
          "aria-invalid": Boolean(err),
          "aria-describedby": err ? `err-${field.name}` : undefined,
          onBlur: () => markTouched(field.name),
          disabled: !field.editable,
        } as const;
        const inputClass =
          "block w-full border border-beige-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500";

        let control: ReactNode;
        if (enumValues && enumValues.length > 0) {
          control = (
            <select
              {...commonProps}
              className={inputClass}
              value={typeof val === "string" ? val : ""}
              onChange={(e) => setValue(field.name, e.target.value)}
            >
              <option value="">— select —</option>
              {enumValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          );
        } else if (field.renderer === "checkbox") {
          control = (
            <input
              {...commonProps}
              type="checkbox"
              checked={Boolean(val)}
              onChange={(e) => setValue(field.name, e.target.checked)}
            />
          );
        } else if (field.renderer === "number") {
          control = (
            <input
              {...commonProps}
              type="number"
              className={inputClass}
              value={val == null || val === "" ? "" : Number(val)}
              onChange={(e) =>
                setValue(field.name, e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          );
        } else if (field.renderer === "date") {
          control = (
            <input
              {...commonProps}
              type="date"
              className={inputClass}
              value={typeof val === "string" ? val : ""}
              onChange={(e) => setValue(field.name, e.target.value)}
            />
          );
        } else if (field.renderer === "datetime") {
          control = (
            <input
              {...commonProps}
              type="datetime-local"
              className={inputClass}
              value={typeof val === "string" ? val.slice(0, 16) : ""}
              onChange={(e) => setValue(field.name, e.target.value)}
            />
          );
        } else if (field.renderer === "email-link") {
          control = (
            <input
              {...commonProps}
              type="email"
              className={inputClass}
              value={typeof val === "string" ? val : ""}
              onChange={(e) => setValue(field.name, e.target.value)}
            />
          );
        } else if (field.renderer === "url-link") {
          control = (
            <input
              {...commonProps}
              type="url"
              className={inputClass}
              value={typeof val === "string" ? val : ""}
              onChange={(e) => setValue(field.name, e.target.value)}
            />
          );
        } else {
          control = (
            <input
              {...commonProps}
              type="text"
              className={inputClass}
              value={typeof val === "string" ? val : val == null ? "" : String(val)}
              onChange={(e) => setValue(field.name, e.target.value)}
            />
          );
        }

        return (
          <div key={field.name}>
            <label
              htmlFor={`field-${field.name}`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {field.label}
              {required && <span className="text-red-600 ml-0.5">*</span>}
            </label>
            {control}
            {err && (
              <p id={`err-${field.name}`} className="mt-1 text-xs text-red-700">
                {err}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex justify-end gap-2 pt-4 border-t border-beige-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border border-beige-300 text-gray-700 hover:bg-beige-50"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
