/**
 * audit-i18n-block-coverage.ts (Session 114 Task 1 commit 3 + Session 117 RB-1 t() pattern extension)
 *
 * Two-mode audit for src/blocks/ i18n coverage:
 *
 * Mode A (Pattern A regression — original Session 114 scope):
 *   Detects when `Blockly.Msg.X || 'English fallback'` resolves to the English fallback
 *   in non-English UI (ja / zh-TW) for non-technical translatable strings.
 *
 * Mode B (literal-key leak detection — Session 117 RB-1 extension):
 *   Detects `t('blocks.X.Y')` calls (i18next direct lookup pattern used by some legacy
 *   blocks) whose dotted path does not resolve to a string in ja.json. Missing keys cause
 *   i18next to return the key string verbatim, leaking `"blocks.sensor.ultrasonic.init"`
 *   into the UI. This was Session 117 RB-1's root cause for sensorBlocks.ts before its
 *   migration to the Blockly.Msg pattern.
 *
 * Background: in Session 113 the H-1 fill protocol's "ASCII-only → 5 lang verbatim port"
 * classifier copied English fallback strings verbatim into all 5 locales, leaving 375
 * block labels untranslated in the Japanese UI despite a 99.88% structural coverage metric.
 * Session 114 commit 1 (700bb6f) fixed those keys; this audit prevents the same class of
 * regression by failing the build whenever a non-technical English fallback is also the
 * Japanese / Chinese value verbatim.
 *
 * Mode A detection: for each `Blockly.Msg.KEY || 'fallback'` reference in src/blocks/:
 *   - if KEY is absent in {ja,en,es,pt-PT,zh-TW}.json → existing audit-data-consistency
 *     handles the missing-key class, this audit skips
 *   - if ja value === en fallback AND the value is "translatable" (not a short technical
 *     identifier) → fail
 *
 * Mode B detection: for each `t('blocks.X.Y[...]')` reference in src/blocks/:
 *   - if the dotted path does not resolve to a string in ja.json → fail (would leak the
 *     literal key into the UI)
 *
 * Allowlist (legit technical labels that intentionally stay English in JA UI):
 *   - Short tokens: 1-3 chars (DIR, EN, IN1, Hz, ms)
 *   - All-caps acronyms ≤6 chars (UART, GPIO, USB)
 *   - Protocol keywords used as wire-format constants (INPUT, OUTPUT, INPUT_PULLUP,
 *     HTTP GET/POST/PUT/DELETE, MQTT Buffer Size, MQTT Keep Alive)
 *   - Chip / sensor identifiers paired with unit (MAX30102 SpO2 (%), SCD30 CO2 (ppm))
 *   - Programming-language type names (bool, int8, int16, float, uint8, uint16)
 *
 * Run via:  npx tsx scripts/audit-i18n-block-coverage.ts
 * Auto-run: appended to "prebuild" hook in package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '..');
const BLOCKS_DIR = path.join(REPO_ROOT, 'src/blocks');
const LOCALES_DIR = path.join(REPO_ROOT, 'src/i18n/locales');

const LANGS = ['ja', 'en', 'es', 'pt-PT', 'zh-TW'] as const;
type Lang = (typeof LANGS)[number];

// Locales that should NOT be left identical to en for translatable strings.
// (We deliberately exclude 'en' from regression detection — English is the
// source of fallbacks; English value === English fallback is by design.)
const TRANSLATE_LANGS: Lang[] = ['ja', 'zh-TW'];

// ============ Step 1: walk src/blocks/ to extract Msg.* refs with fallbacks ============

interface MsgRef {
  key: string;
  fallback: string;
  file: string;
  line: number;
}

function* walkFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(p);
    else if (entry.name.endsWith('.ts')) yield p;
  }
}

// Match Blockly.Msg.KEY_NAME with optional || 'fallback' / "fallback"
const refPattern = /Blockly\.Msg\.([A-Z_][A-Z0-9_]*)\s*\|\|\s*(['"])((?:\\.|(?!\2).)*)\2/g;

function extractRefs(): MsgRef[] {
  const refs: MsgRef[] = [];
  for (const file of walkFiles(BLOCKS_DIR)) {
    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m: RegExpExecArray | null;
      refPattern.lastIndex = 0;
      while ((m = refPattern.exec(line)) !== null) {
        const key = m[1];
        const fallback = m[3].replace(/\\(.)/g, '$1');
        refs.push({ key, fallback, file: path.relative(REPO_ROOT, file), line: i + 1 });
      }
    }
  }
  return refs;
}

// ============ Step 2: flatten locale files ============

type FlatMap = Record<string, string>;
function flatten(obj: Record<string, unknown>, prefix = ''): FlatMap {
  const result: FlatMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = prefix ? `${prefix}_${k}` : k;
    if (typeof v === 'string') {
      result[nk.toUpperCase()] = v;
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, nk));
    }
  }
  return result;
}

function loadFlat(lang: Lang): FlatMap {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  return flatten(JSON.parse(fs.readFileSync(file, 'utf-8')));
}

// ============ Step 3: classifier — is a value "translatable English"? ============

/**
 * Returns true when the value is a legit technical identifier that should
 * remain identical across all 5 langs. These are intentionally not flagged
 * as Pattern A regressions even when ja value === en value.
 */
function isLegitTechnical(v: string): boolean {
  if (v.length <= 3) return true; // 'Hz', 'ms', 'DIR', 'EN', 'IN1', ' '
  if (/^[A-Z]+\d*$/.test(v)) return true; // 'OUTPUT', 'INPUT', 'GPIO12'
  if (/^[a-z]+\d*$/.test(v) && v.length <= 4) return true; // 'pin', 'val', 'reg'
  if (/^[A-Z]+_[A-Z]+(_[A-Z]+)*$/.test(v)) return true; // 'INPUT_PULLUP'
  if (/^\d+(\.\d+)?$/.test(v)) return true; // '0.5'
  if (/^[\d.,\s xX×]+$/.test(v)) return true; // '0-4095'
  if (/^\([^)]+\)$/.test(v)) return true; // '(hex)'

  // Programming type names
  if (/^(bool|int8|int16|int32|int64|uint8|uint16|uint32|uint64|float|double|char)\b/.test(v)) return true;

  // HTTP method labels
  if (/^HTTP\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)(\s+JSON)?$/.test(v)) return true;

  // MQTT protocol terms (English universally in Japanese tech writing)
  if (/^MQTT\s+(Keep\s+Alive|Buffer\s+Size|Broker|Retain|User|Client\s+ID|Topic|Message)$/.test(v)) return true;

  // Chip / sensor identifier + unit pattern: 'CHIP1234 LABEL (unit)' or 'CHIPNAME measurement (unit)'
  if (/^[A-Z][A-Z0-9]{2,}\s+[A-Za-z0-9]+\s*\([^)]+\)$/.test(v)) return true;

  // Standalone unit suffixes commonly kept English
  if (/^(bytes?|seconds?|minutes?|hours?|ms|μs|us|kHz|MHz|Hz|dB|mV|mA|V|A|W|mW)$/.test(v)) return true;

  // Wire-format pin names with parenthesized aliases (universally English in datasheets):
  // 'DIN (DOUT)', 'LRCK (WS)', 'DE/RE', 'TX/RX', 'SDA/SCL', etc.
  if (/^[A-Z][A-Z0-9/]{1,8}(\s+\([A-Z0-9/]{1,8}\))?$/.test(v)) return true;

  // Chemical / particulate formulas (PM2.5, PM10, CO2)
  if (/^(PM\d+(\.\d+)?|CO2?|NO2?|SO2?|O3|VOC)$/.test(v)) return true;

  // Chip-name + measurement + unit (matches PMS5003 PM2.5 (μg/m³), MAX30102 SpO2 (%), etc.)
  // Allows non-ASCII chars inside parentheses for unit symbols.
  if (/^[A-Z][A-Z0-9]{2,}\s+[A-Za-z0-9.]+\s*\([^)]+\)$/.test(v)) return true;

  // Standalone tech terms universally kept English in JP tech writing
  if (/^(Webhook URL|Retain|Buffer|Handler|Payload|Host|Port|Topic|baud|reg|pin|col\d*)$/i.test(v)) return true;

  return false;
}

// ============ Step 3b (Mode B): scan t('blocks.X.Y') refs ============

interface TRef {
  i18nPath: string; // 'blocks.sensor.ultrasonic.init'
  file: string;
  line: number;
}

// Match t('blocks.X.Y[.Z...]') or t("blocks.X.Y[.Z...]")
// Only matches dotted i18n keys whose first segment is 'blocks.' to scope the audit to
// block-related callers (other namespaces are exercised by other audits).
const tRefPattern = /\bt\(\s*(['"])(blocks\.[a-zA-Z0-9_.]+)\1/g;

function extractTRefs(): TRef[] {
  const out: TRef[] = [];
  for (const file of walkFiles(BLOCKS_DIR)) {
    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip pure single-line comments (// at start of trimmed line).
      // Block / inline comments still get scanned — that's intentional, comment matches are rare
      // and a stale t('...') reference in a comment is a smell worth surfacing once.
      if (line.trim().startsWith('//')) continue;
      let m: RegExpExecArray | null;
      tRefPattern.lastIndex = 0;
      while ((m = tRefPattern.exec(line)) !== null) {
        out.push({ i18nPath: m[2], file: path.relative(REPO_ROOT, file), line: i + 1 });
      }
    }
  }
  return out;
}

function resolveNestedPath(root: unknown, dotPath: string): unknown {
  const parts = dotPath.split('.');
  let cur: unknown = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

// ============ Step 4: run detection ============

interface Failure {
  key: string;
  value: string;
  lang: Lang;
  refFile: string;
  refLine: number;
}

const refs = extractRefs();
const uniqueRefs = new Map<string, MsgRef>();
for (const r of refs) {
  if (!uniqueRefs.has(r.key)) uniqueRefs.set(r.key, r);
}

const flats: Record<Lang, FlatMap> = {} as Record<Lang, FlatMap>;
for (const lang of LANGS) flats[lang] = loadFlat(lang);

const failures: Failure[] = [];
for (const [key, ref] of uniqueRefs) {
  const enValue = flats.en[key];
  if (enValue == null) continue; // missing — handled elsewhere
  for (const lang of TRANSLATE_LANGS) {
    const value = flats[lang][key];
    if (value == null) continue;
    if (value !== enValue) continue; // translated (differs from en) — OK
    if (isLegitTechnical(value)) continue; // intentional English
    failures.push({ key, value, lang, refFile: ref.file, refLine: ref.line });
  }
}

// ============ Step 4b: Mode B detection — t('blocks.X.Y') unresolved paths ============

interface TFailure {
  i18nPath: string;
  refFile: string;
  refLine: number;
}

const tRefs = extractTRefs();
const uniqueTRefs = new Map<string, TRef>();
for (const r of tRefs) {
  if (!uniqueTRefs.has(r.i18nPath)) uniqueTRefs.set(r.i18nPath, r);
}

const jaJsonRaw = JSON.parse(
  fs.readFileSync(path.join(LOCALES_DIR, 'ja.json'), 'utf-8')
) as Record<string, unknown>;

const tFailures: TFailure[] = [];
for (const [i18nPath, ref] of uniqueTRefs) {
  const value = resolveNestedPath(jaJsonRaw, i18nPath);
  if (typeof value !== 'string') {
    tFailures.push({ i18nPath, refFile: ref.file, refLine: ref.line });
  }
}

// ============ Step 5: report ============

console.log('🔍 Auditing i18n block label coverage (Pattern A + t() path resolution)…');
console.log(`   Mode A: ${uniqueRefs.size} unique Blockly.Msg.BLOCKS_* keys (locales: ${TRANSLATE_LANGS.join(', ')})`);
console.log(`   Mode B: ${uniqueTRefs.size} unique t('blocks.*') paths (ja.json resolution)`);

if (failures.length === 0 && tFailures.length === 0) {
  console.log('✅ All audits passed (0 warning(s))');
  process.exit(0);
}

if (failures.length > 0) {
  const byLang: Record<string, Failure[]> = {};
  for (const f of failures) {
    if (!byLang[f.lang]) byLang[f.lang] = [];
    byLang[f.lang].push(f);
  }

  console.error(`❌ Mode A (Pattern A regression) detected: ${failures.length} block label(s) show English in non-English UI`);
  for (const lang of Object.keys(byLang)) {
    console.error(`\n  ${lang}: ${byLang[lang].length} key(s) untranslated`);
    for (const f of byLang[lang].slice(0, 20)) {
      console.error(`    ${f.key.padEnd(45)} = ${JSON.stringify(f.value)}`);
      console.error(`      referenced from ${f.refFile}:${f.refLine}`);
    }
    if (byLang[lang].length > 20) {
      console.error(`    ... and ${byLang[lang].length - 20} more`);
    }
  }
  console.error('\n  Fix: translate the value in src/i18n/locales/<lang>.json at the corresponding nested path.');
  console.error('  If the value is a legitimate technical identifier that should stay English in all langs,');
  console.error('  add the pattern to isLegitTechnical() in scripts/audit-i18n-block-coverage.ts.');
}

if (tFailures.length > 0) {
  console.error(`\n❌ Mode B (t() literal-key leak) detected: ${tFailures.length} path(s) unresolved in ja.json`);
  for (const f of tFailures.slice(0, 30)) {
    console.error(`    ${f.i18nPath.padEnd(55)} from ${f.refFile}:${f.refLine}`);
  }
  if (tFailures.length > 30) {
    console.error(`    ... and ${tFailures.length - 30} more`);
  }
  console.error('\n  Fix (preferred): migrate t(\'blocks.X.Y\') to `Blockly.Msg.BLOCKS_X_Y || \'fallback\'`');
  console.error('  pattern + add the key to all 5 locales under blocks.X.Y. See sensorBlocks.ts (Session 117 RB-1).');
  console.error('  Fix (alternative): add the nested path to ja.json (and other locales for translation parity).');
}

process.exit(1);
