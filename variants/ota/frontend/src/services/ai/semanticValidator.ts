/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BUG-085 Phase 2-V — Semantic validator for AI-generated Blockly XML.
 *
 * Detects 4 categories of structural defects that prompt-only mitigation
 * (Phase 1 + Phase 2 i18n rule strengthening) consistently failed to
 * prevent in AI output:
 *   1. unconnected_value_input — block.valueInputs exist in catalog but
 *      the XML has no <value name="..."> child (generator falls back to
 *      hardcoded defaults, e.g. servo_write ANGLE empty → '90' fallback).
 *   2. orphan_value_block — a hasOutput=true block placed at XML top-level
 *      (sibling of arduino_setup / arduino_loop). Emits meaningless
 *      expression statements like `wsServerMessage;`.
 *   3. asymmetric_binary_branch — inside on_message HANDLER, AI emits
 *      controls_if for one half of a binary pair (e.g. == "1" → HIGH) but
 *      omits the symmetric branch (e.g. == "0" → LOW), leaving the device
 *      stuck in one state for the other received value.
 *   4. missing_wifi_connect — WiFi-using blocks (websocket_server_* /
 *      mqtt_* / http_* / ha_* / ntp_* / ota_*) present but wifi_connect
 *      (or ha_device_init which embeds it) missing from arduino_setup.
 *
 * Uses pure DOM parsing (jsdom in tests, browser DOM at runtime) — no
 * Blockly workspace dependency. This keeps the validator side-effect-free
 * and trivially testable. The validator runs BEFORE the AI output is
 * loaded into the actual user workspace; only after retry exhausts does
 * the (still-flawed) XML reach the workspace, accompanied by a warning.
 *
 * case 19 cluster AI infra parallel — semantic check is the runtime layer
 * complementing catalog schema (outputType field) and system prompt rules.
 */

import type { BlockCatalog, BlockCatalogEntry } from './systemPrompt';

// ---------------------------------------------------------------------------
// Issue types
// ---------------------------------------------------------------------------

export type ValidationIssue =
  | {
      kind: 'unconnected_value_input';
      blockType: string;
      blockId: string;
      inputName: string;
      expectedType: string | null;
    }
  | {
      kind: 'orphan_value_block';
      blockType: string;
      blockId: string;
    }
  | {
      kind: 'asymmetric_binary_branch';
      handlerType: string;
      handlerKey: string;
      present: string[];
      missing: string[];
    }
  | {
      kind: 'missing_wifi_connect';
      presentWifiBlocks: string[];
    };

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  loadError?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Binary value pairs for Check 3 (case-insensitive comparison). The keys
 * and values are intentionally symmetric — when one half is present in
 * the handler's controls_if and the other half is missing, that's an
 * asymmetric branch.
 *
 * Higher-cardinality enums (e.g. RGB "RED"/"GREEN"/"BLUE", state machines
 * with 3+ states) are NOT in this set — they don't have a single "pair"
 * relationship and shouldn't trigger asymmetry warnings.
 */
const BINARY_PAIRS: Record<string, string> = {
  '1': '0',
  '0': '1',
  on: 'off',
  off: 'on',
  true: 'false',
  false: 'true',
  open: 'close',
  close: 'open',
  high: 'low',
  low: 'high',
};

/**
 * Block types whose hasOutput=true value blocks return data from a
 * received-message context (Check 3 comparison detection + Check 2
 * orphan validation focus). These must always live inside their
 * corresponding on_message HANDLER's statement tree.
 */
const RECEIVED_VALUE_BLOCK_TYPES = new Set<string>([
  'websocket_server_received_value',
  'ble_received_value',
  'espnow_received_data',
  'espnow_received_mac',
  'lora_received_value',
  'azure_iot_received_value',
  'iot_cloud_received_value',
  'ble_scan_found_name',
  'ble_scan_found_address',
  'ble_scan_found_rssi',
]);

/**
 * Block-type prefixes that require WiFi connectivity. If any block whose
 * type starts with one of these prefixes exists, Check 4 expects
 * wifi_connect (or ha_device_init / ha_device_init_auth which embeds it)
 * to be present in arduino_setup.
 */
const WIFI_BLOCK_PREFIXES = [
  'websocket_server_',
  'mqtt_',
  'http_',
  'ha_',
  'ntp_',
  'ota_',
];

/**
 * Handler block types whose HANDLER statement input contains the
 * received-value comparison branches relevant to Check 3.
 */
const HANDLER_BLOCK_TYPES_FOR_BINARY_BRANCH = new Set<string>([
  'websocket_server_on_message',
  'ble_uart_on_receive',
  'ble_on_write',
  'espnow_on_receive',
  'mqtt_on_message',
  'iot_cloud_on_message',
  'lora_on_receive',
  'azure_iot_hub_on_c2d',
]);

/**
 * Block types that, when present, satisfy the WiFi-connect prerequisite
 * for Check 4 (because they embed a WiFi.begin() call).
 */
const WIFI_INIT_BLOCK_TYPES = new Set<string>([
  'wifi_connect',
  'ha_device_init',
  'ha_device_init_auth',
]);

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function validateXml(xmlString: string, catalog: BlockCatalog): ValidationResult {
  try {
    const parser = new DOMParser();
    // Use 'application/xml' to match the existing xmlValidator.ts pattern.
    // Both 'text/xml' and 'application/xml' are XML modes, but browser DOM
    // implementations have historically diverged on namespace handling for
    // `text/xml` — sticking with the proven path keeps parity.
    const doc = parser.parseFromString(xmlString, 'application/xml');

    // Parse error detection: in Chrome/Firefox XML mode, a malformed input
    // produces a doc whose tree contains <parsererror>. `doc.querySelector`
    // searches the entire document (not just below documentElement), which
    // is the same approach the proven xmlValidator.ts uses.
    if (doc.querySelector('parsererror')) {
      return {
        valid: false,
        issues: [],
        loadError: 'XML parse failed',
      };
    }

    const root = doc.documentElement;
    if (!root) {
      return {
        valid: false,
        issues: [],
        loadError: 'XML has no document element',
      };
    }

    const issues: ValidationIssue[] = [
      ...checkUnconnectedValueInputs(doc, catalog),
      ...checkOrphanValueBlocks(root, catalog),
      ...checkAsymmetricBinaryBranches(doc),
      ...checkMissingWifiConnect(doc),
    ];

    return { valid: issues.length === 0, issues };
  } catch (e) {
    return {
      valid: false,
      issues: [],
      loadError: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Check 1: unconnected value input
// ---------------------------------------------------------------------------

function checkUnconnectedValueInputs(doc: Document, catalog: BlockCatalog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blockMap = new Map<string, BlockCatalogEntry>(catalog.blocks.map((b) => [b.type, b]));

  // querySelectorAll matches by local name across namespaces (proven pattern
  // from xmlValidator.ts:doc.querySelectorAll('block[type]')). This is more
  // browser-portable than getElementsByTagName for namespaced XML.
  const allBlocks = doc.querySelectorAll('block');
  for (let i = 0; i < allBlocks.length; i++) {
    const blockEl = allBlocks[i];
    const blockType = blockEl.getAttribute('type');
    if (!blockType) continue;
    const meta = blockMap.get(blockType);
    if (!meta || meta.valueInputs.length === 0) continue;

    const blockId = blockEl.getAttribute('id') ?? `${blockType}@${i}`;

    for (const valueInputDef of meta.valueInputs) {
      const valueChild = findDirectChild(blockEl, 'value', valueInputDef.name);
      if (!valueChild) {
        issues.push({
          kind: 'unconnected_value_input',
          blockType,
          blockId,
          inputName: valueInputDef.name,
          expectedType: valueInputDef.check ?? null,
        });
        continue;
      }
      // <value name="X"> exists but has no <block> or <shadow> child → still unconnected
      const inner = findDirectChildAny(valueChild, ['block', 'shadow']);
      if (!inner) {
        issues.push({
          kind: 'unconnected_value_input',
          blockType,
          blockId,
          inputName: valueInputDef.name,
          expectedType: valueInputDef.check ?? null,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Check 2: orphan value block at top-level
// ---------------------------------------------------------------------------

function checkOrphanValueBlocks(root: Element, catalog: BlockCatalog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blockMap = new Map<string, BlockCatalogEntry>(catalog.blocks.map((b) => [b.type, b]));

  // Direct child <block> elements of the <xml> root.
  const children = root.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.tagName !== 'block') continue;
    const blockType = child.getAttribute('type');
    if (!blockType) continue;
    const meta = blockMap.get(blockType);
    if (!meta) continue;
    if (!meta.hasOutput) continue;

    const blockId = child.getAttribute('id') ?? blockType;
    issues.push({
      kind: 'orphan_value_block',
      blockType,
      blockId,
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Check 3: asymmetric binary branch in on_message HANDLER
// ---------------------------------------------------------------------------

function checkAsymmetricBinaryBranches(doc: Document): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const allBlocks = doc.querySelectorAll('block');
  for (let i = 0; i < allBlocks.length; i++) {
    const handlerEl = allBlocks[i];
    const handlerType = handlerEl.getAttribute('type');
    if (!handlerType || !HANDLER_BLOCK_TYPES_FOR_BINARY_BRANCH.has(handlerType)) continue;

    // Find HANDLER / CALLBACK statement.
    const handlerStmt =
      findDirectChild(handlerEl, 'statement', 'HANDLER') ??
      findDirectChild(handlerEl, 'statement', 'CALLBACK');
    if (!handlerStmt) continue;

    const compValues = collectReceivedValueComparisons(handlerStmt);
    const present = new Set(compValues.map((v) => v.toLowerCase()));
    const missingPairs: string[] = [];
    const seenMissing = new Set<string>();

    for (const v of present) {
      const pair = BINARY_PAIRS[v];
      if (pair && !present.has(pair) && !seenMissing.has(pair)) {
        missingPairs.push(pair);
        seenMissing.add(pair);
      }
    }

    if (missingPairs.length > 0) {
      const channelIdField = findDirectChild(handlerEl, 'field', 'CHANNEL_ID');
      const switchIdField = findDirectChild(handlerEl, 'field', 'SWITCH_ID');
      const handlerKey =
        channelIdField?.textContent ??
        switchIdField?.textContent ??
        handlerEl.getAttribute('id') ??
        'unknown';
      issues.push({
        kind: 'asymmetric_binary_branch',
        handlerType,
        handlerKey,
        present: Array.from(present),
        missing: missingPairs,
      });
    }
  }

  return issues;
}

function collectReceivedValueComparisons(handlerStmt: Element): string[] {
  const values: string[] = [];
  const compareBlocks = handlerStmt.querySelectorAll('block');
  for (let i = 0; i < compareBlocks.length; i++) {
    const cmpEl = compareBlocks[i];
    if (cmpEl.getAttribute('type') !== 'logic_compare') continue;

    const opField = findDirectChild(cmpEl, 'field', 'OP');
    if (opField?.textContent !== 'EQ') continue;

    const aValue = findDirectChild(cmpEl, 'value', 'A');
    const bValue = findDirectChild(cmpEl, 'value', 'B');
    if (!aValue || !bValue) continue;

    const aBlock = findDirectChild(aValue, 'block', null);
    const bBlock = findDirectChild(bValue, 'block', null);
    if (!aBlock || !bBlock) continue;

    const literal = extractLiteralFromCompare(aBlock, bBlock);
    if (literal !== null) values.push(literal);
  }
  return values;
}

function extractLiteralFromCompare(a: Element, b: Element): string | null {
  const aType = a.getAttribute('type') ?? '';
  const bType = b.getAttribute('type') ?? '';
  const isReceived = (type: string) => RECEIVED_VALUE_BLOCK_TYPES.has(type);
  const isLiteral = (type: string) =>
    type === 'text' || type === 'math_number' || type === 'logic_boolean';

  let literalEl: Element | null = null;
  if (isReceived(aType) && isLiteral(bType)) literalEl = b;
  if (isReceived(bType) && isLiteral(aType)) literalEl = a;

  if (!literalEl) return null;

  const litType = literalEl.getAttribute('type');
  if (litType === 'text') return findDirectChild(literalEl, 'field', 'TEXT')?.textContent ?? null;
  if (litType === 'math_number')
    return findDirectChild(literalEl, 'field', 'NUM')?.textContent ?? null;
  if (litType === 'logic_boolean')
    return findDirectChild(literalEl, 'field', 'BOOL')?.textContent ?? null;

  return null;
}

// ---------------------------------------------------------------------------
// Check 4: missing wifi_connect when WiFi-using blocks are present
// ---------------------------------------------------------------------------

function checkMissingWifiConnect(doc: Document): ValidationIssue[] {
  const allBlocks = doc.querySelectorAll('block');
  const wifiUsingBlocks: string[] = [];
  let hasWifiInit = false;

  for (let i = 0; i < allBlocks.length; i++) {
    const blockType = allBlocks[i].getAttribute('type');
    if (!blockType) continue;
    if (WIFI_INIT_BLOCK_TYPES.has(blockType)) {
      hasWifiInit = true;
    }
    if (WIFI_BLOCK_PREFIXES.some((p) => blockType.startsWith(p))) {
      wifiUsingBlocks.push(blockType);
    }
  }

  if (wifiUsingBlocks.length === 0) return [];
  if (hasWifiInit) return [];

  return [
    {
      kind: 'missing_wifi_connect',
      presentWifiBlocks: Array.from(new Set(wifiUsingBlocks)).slice(0, 5),
    },
  ];
}

// ---------------------------------------------------------------------------
// DOM helpers (avoid querySelector :scope nonsense in older jsdom versions)
// ---------------------------------------------------------------------------

function findDirectChild(parent: Element, tagName: string, nameAttr: string | null): Element | null {
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.tagName !== tagName) continue;
    if (nameAttr === null) return c;
    if (c.getAttribute('name') === nameAttr) return c;
  }
  return null;
}

function findDirectChildAny(parent: Element, tagNames: string[]): Element | null {
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    if (tagNames.includes(children[i].tagName)) return children[i];
  }
  return null;
}
