/**
 * jsonValidator — Phase 4 AI output validator (50.md §6).
 *
 * Validates a CustomizationDiff JSON returned by the AI. Mirrors
 * xmlValidator.ts in spirit: parse → schema check → return ok/error so
 * retryHelper can decide to retry. Strips markdown code fences (AI
 * frequently wraps JSON in ```json ... ```).
 *
 * Validation rules (50.md §5.3, §6.3, §11 I5/I6/I7):
 *   - Top-level keys: only `schemaLevel` and `widgets` allowed.
 *   - `widgets[i].id` required string (matched against schema by caller).
 *   - `displayMode` enum: 'plain' | 'gauge' | 'graph' | 'led'
 *   - `layout` enum:      'grid' | 'columns-2' | 'columns-3' | 'rows'
 *   - `colorScheme.{bg,fg,accent}` are CSS color strings
 *     (#hex / rgb()/ rgba() / lowercase name).
 *   - `customCss` ≤ 4000 chars (defense-in-depth, bundle also slices).
 *   - All other top-level / nested keys → reject with explanatory error
 *     (so retry can include the error in the next prompt).
 */
import type { CustomizationDiff } from '@/components/editor/Controller/controllerCustomizer';

export interface JsonValidationResult {
  ok: boolean;
  diff?: CustomizationDiff;
  /** Human-readable error suitable for surfacing to the user OR feeding back to the AI on retry. */
  error?: string;
}

const ALLOWED_DISPLAY_MODES = new Set(['plain', 'gauge', 'graph', 'led']);
const ALLOWED_LAYOUTS = new Set(['grid', 'columns-2', 'columns-3', 'rows']);
const ALLOWED_COLOR_KEYS = new Set(['bg', 'fg', 'accent']);
const ALLOWED_CUSTOMIZATION_KEYS = new Set(['displayMode', 'layout', 'colorScheme', 'customCss']);
// Loose CSS color check: #hex / rgb()/ rgba() / lowercase name keyword.
// Intentionally permissive so AI can return common forms; strict canon is the
// browser's job at render time (invalid → CSS no-op, no crash).
const COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$|^rgba?\([^)]+\)$|^[a-zA-Z]+$/;
const MAX_CUSTOM_CSS = 4000;

function stripCodeFences(s: string): string {
  const fenceMatch = s.match(/^\s*```(?:json)?\s*\n?([\s\S]+?)\n?\s*```\s*$/);
  return (fenceMatch ? fenceMatch[1] : s).trim();
}

export function validateCustomizationDiff(rawText: string): JsonValidationResult {
  const jsonText = stripCodeFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return {
      ok: false,
      error: `JSON parse failed: ${e instanceof Error ? e.message : 'unknown error'}`,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Top-level value must be an object (not array, null, or primitive)' };
  }
  const obj = parsed as Record<string, unknown>;

  const allowedTopKeys = new Set(['schemaLevel', 'widgets']);
  const extraTopKeys = Object.keys(obj).filter((k) => !allowedTopKeys.has(k));
  if (extraTopKeys.length > 0) {
    return { ok: false, error: `Unknown top-level keys: ${extraTopKeys.join(', ')}` };
  }

  if (obj.schemaLevel !== undefined) {
    const err = validateCustomizationShape(obj.schemaLevel, 'schemaLevel');
    if (err) return { ok: false, error: err };
  }

  if (obj.widgets !== undefined) {
    if (!Array.isArray(obj.widgets)) {
      return { ok: false, error: 'widgets must be an array' };
    }
    for (let i = 0; i < obj.widgets.length; i++) {
      const w = obj.widgets[i];
      if (typeof w !== 'object' || w === null || Array.isArray(w)) {
        return { ok: false, error: `widgets[${i}] must be an object` };
      }
      const widget = w as Record<string, unknown>;
      if (typeof widget.id !== 'string' || widget.id.length === 0) {
        return { ok: false, error: `widgets[${i}].id missing or not a non-empty string` };
      }
      const { id: _id, ...rest } = widget;
      const err = validateCustomizationShape(rest, `widgets[${i}]`);
      if (err) return { ok: false, error: err };
    }
  }

  return { ok: true, diff: parsed as CustomizationDiff };
}

function validateCustomizationShape(value: unknown, path: string): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return `${path} must be an object`;
  }
  const obj = value as Record<string, unknown>;

  const extras = Object.keys(obj).filter((k) => !ALLOWED_CUSTOMIZATION_KEYS.has(k));
  if (extras.length > 0) {
    return `${path} has unknown keys: ${extras.join(', ')}`;
  }

  if (obj.displayMode !== undefined && !ALLOWED_DISPLAY_MODES.has(String(obj.displayMode))) {
    return `${path}.displayMode must be one of: plain, gauge, graph, led`;
  }
  if (obj.layout !== undefined && !ALLOWED_LAYOUTS.has(String(obj.layout))) {
    return `${path}.layout must be one of: grid, columns-2, columns-3, rows`;
  }
  if (obj.colorScheme !== undefined) {
    if (typeof obj.colorScheme !== 'object' || obj.colorScheme === null || Array.isArray(obj.colorScheme)) {
      return `${path}.colorScheme must be an object`;
    }
    const cs = obj.colorScheme as Record<string, unknown>;
    const colorExtras = Object.keys(cs).filter((k) => !ALLOWED_COLOR_KEYS.has(k));
    if (colorExtras.length > 0) {
      return `${path}.colorScheme has unknown keys: ${colorExtras.join(', ')}`;
    }
    for (const k of ALLOWED_COLOR_KEYS) {
      const v = cs[k];
      if (v !== undefined && (typeof v !== 'string' || !COLOR_REGEX.test(v))) {
        return `${path}.colorScheme.${k} must be a CSS color string (#hex, rgb(), rgba(), or color name)`;
      }
    }
  }
  if (obj.customCss !== undefined) {
    if (typeof obj.customCss !== 'string') {
      return `${path}.customCss must be a string`;
    }
    if (obj.customCss.length > MAX_CUSTOM_CSS) {
      return `${path}.customCss exceeds ${MAX_CUSTOM_CSS} chars`;
    }
  }
  return null;
}
