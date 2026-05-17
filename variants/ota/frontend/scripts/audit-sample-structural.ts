/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BUG-086 Session 133 — Layer 0 build-time canonical sample audit.
 *
 * Verifies every sample in src/data/sampleProjects.ts at build time:
 *   1. Strict XML parse (DOMParser application/xml) — catches the wifi-dht22-
 *      controller / ha-watchdog-resilience malformed-XML defects
 *   2. semanticValidator.validateXml — catches Check 6 (register-without-
 *      handler, 10 protocols), Check 8 (controls_if anomaly), and the rest
 *      of the validator coverage. Single source of truth = same logic as
 *      runtime AI-output validation.
 *   3. xmlToCpp end-to-end runtime gen — catches Blockly workspace load
 *      errors (e.g. neomatrix-pixel-display shadow-block-connection bug)
 *      that DOM-level parsing doesn't surface.
 *
 * Exits 1 on any defect not in KNOWN_BROKEN_ALLOWLIST. The allowlist exists
 * temporarily for the 7 broken samples identified in Phase A audit; C5
 * will fix them and empty the allowlist.
 *
 * Adding a new protocol = 1 registry entry in crossBlockContracts.ts;
 * this audit auto-extends with no script changes. Hardcoded protocol
 * branches are forbidden here.
 */

// Bootstrap JSDOM globals BEFORE importing any block / Blockly module.
// Reuses the proven setup from probabilistic-debug/lib/jsdom-bootstrap.ts
// (handles non-opaque origin + safe define for non-configurable getters).
import './probabilistic-debug/lib/jsdom-bootstrap';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { sampleProjects } from '../src/data/sampleProjects';
import { validateXml, type ValidationIssue } from '../src/services/ai/semanticValidator';
import type { BlockCatalog } from '../src/services/ai/systemPrompt';
import { xmlToCpp } from './probabilistic-debug/lib/cpp-generator';

// __dirname workaround for ESM (vite + tsx default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.resolve(__dirname, '..', 'public', 'ai', 'block-catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8')) as BlockCatalog;

// ---------------------------------------------------------------------------
// KNOWN_BROKEN_ALLOWLIST (will be emptied in C5)
// ---------------------------------------------------------------------------

/**
 * 7 broken samples identified by Phase A audit. C5 commit will fix them
 * and remove from this allowlist. After C5, the allowlist must be empty
 * for a successful build.
 *
 * Each entry: sampleId → reason (for grep / changelog).
 */
const KNOWN_BROKEN_ALLOWLIST: Record<string, string> = {
  'wifi-dht22-controller':     'C5: XML structural defect (unclosed <next> + <block> at setup→loop boundary)',
  'ha-watchdog-resilience':    'C5: same XML structural defect pattern as wifi-dht22-controller',
  'wifi-controller-mix':       'C5: controls_if(IF0=mpu6050_init, no DO) anomaly + handlers silent-dropped',
  'ha-rgb-led':                'C5: ha_light_create_rgb missing ha_light_on_command (state/brightness)',
  'ha-via-device-multi-esp32': 'C5: ha_number_create missing ha_number_on_command',
  'modbus-temp-monitor':       'C5: controls_if(IF0=iot_cloud_connect, no DO) anomaly',
  'neomatrix-pixel-display':   'C5: Blockly shadow block connection error in xmlToCpp gen',
};

// ---------------------------------------------------------------------------
// Audit primitives
// ---------------------------------------------------------------------------

interface SampleDefect {
  sampleId: string;
  kind: string;
  detail: string;
}

function auditSample(sampleId: string, xml: string): SampleDefect[] {
  const defects: SampleDefect[] = [];

  // Layer (a): validateXml runs Check 1-8 (incl. data-driven Check 6 from
  // CROSS_BLOCK_CONTRACTS, Check 7 XML structural, Check 8 controls_if anomaly).
  const v = validateXml(xml, catalog);
  if (v.loadError) {
    // Check 7 surfaces parse error as an issue too, so this stays for safety
    defects.push({ sampleId, kind: 'load_error', detail: v.loadError });
  }
  for (const issue of v.issues) {
    defects.push({ sampleId, kind: issue.kind, detail: summarizeIssue(issue) });
  }

  // Layer (b): xmlToCpp end-to-end runtime gen (catches Blockly-specific
  // errors that XML parsers don't see — e.g. shadow block connection bugs).
  try {
    xmlToCpp(xml);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    defects.push({ sampleId, kind: 'xml_to_cpp_throw', detail: msg.slice(0, 200) });
  }

  return defects;
}

function summarizeIssue(i: ValidationIssue): string {
  switch (i.kind) {
    case 'register_without_handler':
      return `${i.protocolLabel} (${i.registerType}: ${i.idField ?? 'global'}="${i.missingId}", missing handler=${i.handlerType})`;
    case 'unconnected_value_input':
      return `${i.blockType}.${i.inputName} expected=${JSON.stringify(i.expectedType)}`;
    case 'orphan_value_block':
      return `${i.blockType} (id=${i.blockId}) at top-level`;
    case 'asymmetric_binary_branch':
      return `${i.handlerType} (${i.handlerKey}) present=${i.present.join(',')} missing=${i.missing.join(',')}`;
    case 'missing_wifi_connect':
      return `wifi-using blocks: ${i.presentWifiBlocks.slice(0, 3).join(',')}`;
    case 'type_mismatch_will_cause_detach':
      return `${i.parentBlockType}.${i.inputName}(expect=${JSON.stringify(i.expectedType)}) ← ${i.childBlockType}(out=${JSON.stringify(i.childOutputType)})`;
    case 'xml_structural_malformed':
      return `parse: ${i.parseErrorSnippet}`;
    case 'controls_if_anomaly_no_body':
      return `controls_if(${i.controlIfBlockId}) IF0=${i.conditionBlockType}, no DO/ELSE body`;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`🔍 Auditing ${sampleProjects.length} canonical samples (BUG-086 Layer 0)…`);

const allDefects: SampleDefect[] = [];
for (const s of sampleProjects) {
  allDefects.push(...auditSample(s.id, s.blocklyXml));
}

const byId = new Map<string, SampleDefect[]>();
for (const d of allDefects) {
  if (!byId.has(d.sampleId)) byId.set(d.sampleId, []);
  byId.get(d.sampleId)!.push(d);
}

// Defects in allowlist = expected (will be fixed in C5)
const allowlistedHits: string[] = [];
const newDefects: SampleDefect[] = [];

for (const [sampleId, defects] of byId) {
  if (sampleId in KNOWN_BROKEN_ALLOWLIST) {
    allowlistedHits.push(`${sampleId} (${defects.length} defect, allowlisted: ${KNOWN_BROKEN_ALLOWLIST[sampleId]})`);
  } else {
    newDefects.push(...defects);
  }
}

const totalSamplesWithDefects = byId.size;
const samplesClean = sampleProjects.length - totalSamplesWithDefects;

console.log(`   ${sampleProjects.length} samples audited`);
console.log(`   ${samplesClean} clean / ${totalSamplesWithDefects} with defects`);
console.log(`   ${allowlistedHits.length} samples in KNOWN_BROKEN_ALLOWLIST (expected for C5):`);
for (const a of allowlistedHits) console.log(`     - ${a}`);

if (newDefects.length > 0) {
  console.error(`\n❌ ${newDefects.length} NEW defect(s) in non-allowlisted samples:`);
  for (const d of newDefects) {
    console.error(`     - ${d.sampleId}: ${d.kind} — ${d.detail}`);
  }
  process.exit(1);
}

console.log(`✅ All audits passed (0 new defect(s), ${allowlistedHits.length} allowlisted)`);
