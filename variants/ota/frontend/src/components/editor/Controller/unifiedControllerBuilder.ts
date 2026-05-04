/**
 * unifiedControllerBuilder — N projects → unified WifiControllerSchema +
 * downloadable HTML blob (47.md Phase 3 / 48.md commit #2, §6).
 *
 * Pipeline (called by `UnifiedControllerSection.tsx`, commit #3):
 *
 *   .digicode.json × N (parsed via projectFileReader)
 *      │
 *      │ user edits deviceLabel / host / port in the dialog grid
 *      │ user-edited deviceId is uniquified via uniquifyDeviceId
 *      ▼
 *   UnifiedDeviceInput[] ─────────────────────┐
 *                                              │
 *                                              ▼
 *   buildUnifiedControllerHtml(inputs, opts) ──┤  for each input:
 *                                              │    extractWsServerDataFromXml
 *                                              │      → WsServerRegistration[]
 *                                              │    inferWifiUiSchema(opts)
 *                                              │      → schema (length=1)
 *                                              │    override deviceLabel /
 *                                              │      deviceId / endpoint.host
 *                                              │      / endpoint.port
 *                                              │    prefix per-device warnings
 *                                              │      with [deviceLabel] (C4)
 *                                              ▼
 *                                       WifiControllerSchema (length=N) +
 *                                       Blob (HTML with schema embedded)
 *
 * Critical detail: the schema is embedded as JSON inside an HTML
 * `<script id="schema" type="application/json">`. We escape `<` / `>` /
 * `&` to `\uXXXX` Unicode escapes so the HTML parser can't end the
 * script block early and so the embedded payload survives copy-paste
 * through HTML-aware tools. JSON.parse decodes the escapes natively.
 */

import {
  WIFI_SCHEMA_VERSION,
  type WifiControllerSchema,
  type WifiDeviceSchema,
  type WifiWidgetDefinition,
} from './types';
import {
  extractWsServerDataFromXml,
  inferWifiUiSchema,
  sanitizeDeviceId,
} from './inferWifiUiSchema';
import { applyCustomizationDiff, type CustomizationDiff } from './controllerCustomizer';

/**
 * Single project's contribution to the unified controller. Constructed by
 * `UnifiedControllerSection.tsx` from a parsed `.digicode.json` plus the
 * user's edits in the dialog grid.
 */
export interface UnifiedDeviceInput {
  /** Title from the source `.digicode.json`. Used as fallback project name
   * for `inferWifiUiSchema` and surfaced in warnings. */
  projectTitle: string;
  /** Raw blocklyXml from the source `.digicode.json`. */
  blocklyXml: string;
  /** User-edited human-readable label shown on the device card. */
  deviceLabel: string;
  /** Stable per-device id (sanitize-then-uniquify; see `uniquifyDeviceId`). */
  deviceId: string;
  /** Per-device WS host (IPv4 / hostname). User-entered. */
  host: string;
  /** Per-device WS port. Defaults to 81 when the user clears the field. */
  port: number;
}

export interface UnifiedHtmlOptions {
  /** Raw HTML template — `UNIFIED_BUNDLE_TEMPLATE` from
   * `@/data/unifiedControllerBundle`. Passed in (not imported here) so
   * vitest can substitute a tiny fixture without importing the auto-
   * generated module. */
  bundleHtml: string;
  /**
   * Phase 4 (50.md §10.2 + BUG-076 fix): AI-applied customization diffs
   * to merge into the embedded schema before download. Diffs are applied
   * in-order (oldest first) via `applyCustomizationDiff`, mirroring the
   * stack semantics in UnifiedControllerSection. Optional — backward
   * compatible with the 14 vitest cases that pre-date Phase 4.
   */
  customizationDiffs?: CustomizationDiff[];
}

export interface UnifiedHtmlResult {
  /** Blob ready for `URL.createObjectURL` + `<a download>` click. */
  blob: Blob;
  /** The HTML string the Blob was constructed from. Returned so callers
   * (and tests) can inspect / log without round-tripping through Blob.text()
   * — useful in jsdom environments where Blob.text isn't always polyfilled. */
  html: string;
  /** Schema embedded into the HTML. Returned for diagnostics / preview. */
  schema: WifiControllerSchema;
}

// ---------------------------------------------------------------------------
// Public helpers — also called by UnifiedControllerSection (commit #3)
// ---------------------------------------------------------------------------

/**
 * Resolve a deviceId collision against an already-used set. Appends `-2`,
 * `-3`, … up to `-999`. Falls back to a timestamped suffix in the
 * astronomically-unlikely 1000+ collision case.
 *
 * Mutation policy: this function is read-only with respect to `used`. The
 * caller is expected to add the returned id to its set before calling
 * again for the next input.
 */
export function uniquifyDeviceId(base: string, used: ReadonlySet<string>): string {
  if (!base) base = 'device';
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Derive the canonical deviceId from a project title. Same regex as
 * `inferWifiUiSchema.sanitizeDeviceId`; falls back to `'device'` (without
 * the `-1` suffix used inside that function — the unified path adds
 * suffixes via uniquifyDeviceId only on collision).
 */
export function deriveDeviceId(projectTitle: string): string {
  return sanitizeDeviceId(projectTitle) || 'device';
}

// ---------------------------------------------------------------------------
// Schema-into-HTML embed
// ---------------------------------------------------------------------------

/**
 * Escape JSON for safe embedding inside an HTML `<script type="application/json">`.
 * Only `<` is strictly required to keep the HTML parser from terminating the
 * script block early at a stray `</script>` substring; `>` / `&` are escaped
 * symmetrically as a defense-in-depth measure (no functional cost — JSON.parse
 * decodes `\uXXXX` natively).
 */
function escapeJsonForHtml(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

const SCHEMA_PLACEHOLDER_RE =
  /<script id="schema" type="application\/json">[^<]*<\/script>/;

function embedSchema(html: string, schema: WifiControllerSchema): string {
  const safeJson = escapeJsonForHtml(JSON.stringify(schema));
  const replacement = `<script id="schema" type="application/json">${safeJson}</script>`;
  if (!SCHEMA_PLACEHOLDER_RE.test(html)) {
    throw new Error(
      'unifiedControllerBuilder: bundle template missing <script id="schema"> placeholder',
    );
  }
  return html.replace(SCHEMA_PLACEHOLDER_RE, replacement);
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function buildUnifiedControllerHtml(
  inputs: UnifiedDeviceInput[],
  options: UnifiedHtmlOptions,
): UnifiedHtmlResult {
  const devices: WifiDeviceSchema[] = [];
  const warnings: string[] = [];

  for (const input of inputs) {
    const labelForPrefix = (input.deviceLabel || input.projectTitle || input.deviceId).trim();
    const prefix = labelForPrefix ? `[${labelForPrefix}] ` : '';

    let widgets: WifiWidgetDefinition[] = [];
    try {
      const data = extractWsServerDataFromXml(input.blocklyXml);
      const partial = inferWifiUiSchema({
        projectName: input.projectTitle,
        serverStart: data.serverStart,
        registrations: data.registrations,
      });
      widgets = partial.devices[0]?.widgets ?? [];
      // Per-device warnings get the [label] prefix (48.md C4) so the bundle
      // can route them to the device card and the dialog can show them
      // adjacent to the offending device row.
      for (const w of partial.warnings) {
        warnings.push(`${prefix}${w}`);
      }
    } catch (err) {
      // extractWsServerDataFromXml swallows DOM-parse errors itself, but a
      // pathological blocklyXml could still throw — surface as a warning
      // rather than aborting the whole build.
      warnings.push(
        `${prefix}Could not parse blocklyXml: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const port = Number.isFinite(input.port) && input.port > 0 ? input.port : 81;

    devices.push({
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel || input.projectTitle || input.deviceId,
      endpoint: {
        port,
        path: '/',
        host: input.host,
      },
      widgets,
    });
  }

  const baseSchema: WifiControllerSchema = {
    connection: 'wifi',
    version: WIFI_SCHEMA_VERSION,
    devices,
    warnings,
  };

  // Phase 4 (50.md §10.2 + BUG-076): apply AI customization diffs onto
  // the Layer 1 schema before embed. Each diff merges schemaLevel +
  // widget-level customization slots; channelId/dataType/min/max/label
  // remain untouched (jsonValidator + applyCustomizationDiff invariants).
  // Empty / undefined diffs short-circuit to baseSchema.
  const schema = (options.customizationDiffs ?? []).reduce(
    (acc, diff) => applyCustomizationDiff(acc, diff).schema,
    baseSchema,
  );

  const html = embedSchema(options.bundleHtml, schema);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

  return { blob, html, schema };
}
