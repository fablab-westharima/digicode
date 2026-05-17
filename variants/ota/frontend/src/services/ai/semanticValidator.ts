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
import { CROSS_BLOCK_CONTRACTS, TYPE_C_INIT_CONTRACTS, type CrossBlockContract } from '@/data/crossBlockContracts';

// ---------------------------------------------------------------------------
// Issue types
// ---------------------------------------------------------------------------

export type ValidationIssue =
  | {
      kind: 'unconnected_value_input';
      blockType: string;
      blockId: string;
      inputName: string;
      expectedType: string | string[] | null;
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
    }
  | {
      // BUG-085 Phase 3 (Check 5) — Type-mismatch will cause Blockly's
      // connection-checker to REJECT the connection at workspace load,
      // detaching the child block to top-level (where it becomes an
      // orphan + value blocks emit `scrubNakedValue` expressions).
      // XML-level "looks connected" but runtime reality is "disconnected".
      // Root-cause defense for F1+F2 same-source bugs (servo_write
      // setCheck('Number') rejecting websocket_server_received_value's
      // 'String' output).
      kind: 'type_mismatch_will_cause_detach';
      parentBlockType: string;
      parentBlockId: string;
      inputName: string;
      expectedType: string | string[];
      childBlockType: string;
      childBlockId: string;
      childOutputType: string | string[] | null;
    }
  | {
      // BUG-086 Session 133 (Check 6) — Register/create block emitted
      // without the matching handler block(s) per the cross-block 1:1
      // contract registry. AI's most common cross-block defect: emit a
      // ha_switch_create / websocket_server_register but forget the
      // ha_switch_on_command / websocket_server_on_message handler.
      // Data-driven from CROSS_BLOCK_CONTRACTS — no hardcoded protocol
      // branches; adding a new protocol = 1 registry entry.
      kind: 'register_without_handler';
      contractId: string;
      registerType: string;
      handlerType: string; // pipe-joined when multiple handlers required (e.g. 'ha_light_on_command|ha_light_on_rgb_command')
      idField: string | null;
      missingId: string; // '__global__' when idField is null
      protocolLabel: string;
    }
  | {
      // BUG-086 Session 133 (Check 7) — XML failed strict (application/xml)
      // parse. Blockly's runtime parser (Blockly.utils.xml.textToDom) is
      // lenient and silently drops malformed sub-trees, producing broken
      // cpp without visible failure. Surfacing this at validator level
      // triggers the retry loop, asking AI to regenerate well-formed XML
      // before the broken output reaches the user's workspace.
      kind: 'xml_structural_malformed';
      parseErrorSnippet: string;
    }
  | {
      // BUG-086 Session 133 (Check 8) — controls_if with IF0=block child
      // (non-comparison, e.g. an *_init block) but no DO/ELSE statement
      // chain. This is the wifi-controller-mix / modbus-temp-monitor
      // canonical-sample defect that AI mimics: the if-condition is set
      // but the body is empty, AND a `<next>` chain after the controls_if
      // gets silently dropped by Blockly's lenient parser.
      kind: 'controls_if_anomaly_no_body';
      conditionBlockType: string;
      controlIfBlockId: string;
    }
  | {
      // BUG-086 Session 133 (Check 9) — Consumer block of a Type C family
      // present without the family's init block. Hardware silent fail
      // pattern: e.g. ble_uart_write emitted but ble_uart_setup missing.
      // Data-driven from TYPE_C_INIT_CONTRACTS — no hardcoded prefix branches.
      kind: 'missing_required_init';
      contractId: string;
      protocolLabel: string;
      consumerBlocks: string[]; // sample of consumer blocks present (capped at 5)
      requiredInitOptions: readonly string[]; // any one of these satisfies
    }
  | {
      // BUG-086 Session 133 (Check 10) — Handler block nested inside another
      // handler's HANDLER / CALLBACK / ON_CALLBACK / OFF_CALLBACK statement
      // input. Rule 03's existing prohibition codified into a runtime check.
      // Nesting causes the inner handler to fire only when the outer one
      // triggers, breaking independent operation.
      kind: 'handler_nested_inside_handler';
      innerHandlerType: string;
      innerHandlerId: string;
      outerHandlerType: string;
      outerHandlerId: string;
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
 * for Check 4 (because they embed a WiFi.begin() call internally — verified
 * by grep of WiFi.begin call sites in src/blocks/arduino/communication/*.ts).
 *
 * BUG-086 Session 133 C4: added mqtt_setup and ota_setup after Layer 0
 * sample audit surfaced false-positive missing_wifi_connect issues for
 * ha-led-control and mqtt-direct samples that use mqtt_setup without a
 * separate wifi_connect block. Both blocks emit `mqttWifiConnect()` /
 * the equivalent OTA WiFi init, which calls `WiFi.begin()` directly.
 */
const WIFI_INIT_BLOCK_TYPES = new Set<string>([
  'wifi_connect',
  'ha_device_init',
  'ha_device_init_auth',
  'mqtt_setup',  // embeds WiFi.begin via mqttWifiConnect()
  'ota_setup',   // embeds WiFi.begin internally
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
    //
    // BUG-086 Session 133 (Check 7): convert parse error into a regular
    // ValidationIssue so the retry orchestrator triggers a regeneration
    // request. Previously this returned with loadError + empty issues,
    // which bypassed retry entirely and let broken XML reach the workspace.
    const parsererror = doc.querySelector('parsererror');
    if (parsererror) {
      return {
        valid: false,
        issues: [
          {
            kind: 'xml_structural_malformed',
            parseErrorSnippet: (parsererror.textContent ?? 'XML parse failed').slice(0, 200),
          },
        ],
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
      ...checkTypeMismatchWillCauseDetach(doc, catalog),
      ...checkRegisterWithoutHandler(doc),
      ...checkControlsIfAnomalyNoBody(doc, catalog),
      ...checkMissingRequiredInit(doc),
      ...checkHandlerNestedInsideHandler(doc),
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
// Check 5: type-mismatch will cause Blockly to detach connection at load
// ---------------------------------------------------------------------------

/**
 * BUG-085 Phase 3 — when a value block (hasOutput=true) appears as a child
 * inside a `<value name="X">` element of a parent block, Blockly's
 * connection-checker will REJECT the connection at workspace load if the
 * child's `outputType` is incompatible with the parent's `valueInputs[X].check`.
 * The XML "looks connected" but the runtime workspace state has the child
 * as an orphan (which then emits either a hardcoded fallback in the parent's
 * cpp generator OR `scrubNakedValue` expression at top-level).
 *
 * This is the root cause of F1 (servo_write ANGLE setCheck('Number') rejecting
 * websocket_server_received_value's 'String' output → '90' fallback) and F2
 * (the rejected received_value becoming top-level orphan → `wsServerMessage;`).
 *
 * Phase 3 fix loosens 8 actuator setChecks to ['Number','String','Boolean'],
 * eliminating the immediate cause. Check 5 is the structural defense for
 * future similar cluster bugs (any new block with overly-restrictive setCheck
 * + AI generation that would pass an incompatible-typed received-value).
 *
 * Type compatibility rules:
 *   - parent.check === null    → accepts any → no flag
 *   - child.outputType === null → dynamic/unknown → defensive accept → no flag
 *   - otherwise: any child type in parent's accepted-types list → compatible
 *     (else flag)
 *   - shadow blocks NOT checked (shadows are intentional typed defaults,
 *     never cause Blockly detach — they ARE the type-compatible filler)
 */
function checkTypeMismatchWillCauseDetach(
  doc: Document,
  catalog: BlockCatalog,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blockMap = new Map<string, BlockCatalogEntry>(catalog.blocks.map((b) => [b.type, b]));

  const allBlocks = doc.querySelectorAll('block');
  for (let i = 0; i < allBlocks.length; i++) {
    const parentEl = allBlocks[i];
    const parentType = parentEl.getAttribute('type');
    if (!parentType) continue;
    const parentMeta = blockMap.get(parentType);
    if (!parentMeta || parentMeta.valueInputs.length === 0) continue;

    const parentId = parentEl.getAttribute('id') ?? `${parentType}@${i}`;

    for (const valueInputDef of parentMeta.valueInputs) {
      // No type constraint declared → accepts any → no mismatch possible
      if (valueInputDef.check === null || valueInputDef.check === undefined) continue;

      const valueChild = findDirectChild(parentEl, 'value', valueInputDef.name);
      if (!valueChild) continue;

      // Only inspect real <block> children. <shadow> blocks are typed-default
      // fillers that match by construction; they never cause Blockly detach.
      const innerBlock = findDirectChild(valueChild, 'block', null);
      if (!innerBlock) continue;

      const childType = innerBlock.getAttribute('type');
      if (!childType) continue;
      const childMeta = blockMap.get(childType);
      if (!childMeta) continue;
      // Child must be a value block (hasOutput=true) for this check to apply.
      // A non-value block in a value slot would be caught by Blockly load
      // (Block.outputConnection mismatch with appendValueInput), surfaced as
      // a load error, but our pre-check ensures cleaner diagnosis.
      if (!childMeta.hasOutput) continue;

      const childOutput = childMeta.outputType;
      // Dynamic / unknown output type → defensive accept (could match anything)
      if (childOutput === null || childOutput === undefined) continue;

      const parentAccepted = Array.isArray(valueInputDef.check)
        ? valueInputDef.check
        : [valueInputDef.check];
      const childTypes = Array.isArray(childOutput) ? childOutput : [childOutput];

      const compatible = childTypes.some((t) => parentAccepted.includes(t));
      if (compatible) continue;

      const childId = innerBlock.getAttribute('id') ?? childType;
      issues.push({
        kind: 'type_mismatch_will_cause_detach',
        parentBlockType: parentType,
        parentBlockId: parentId,
        inputName: valueInputDef.name,
        expectedType: valueInputDef.check,
        childBlockType: childType,
        childBlockId: childId,
        childOutputType: childOutput,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Check 6: register-without-handler (data-driven from CROSS_BLOCK_CONTRACTS)
// ---------------------------------------------------------------------------

/**
 * BUG-086 Session 133 — For every CrossBlockContract in the registry,
 * verify that every register block in the XML has the matching handler
 * block(s). Match rule depends on the contract:
 *   - idField !== null: handler must exist with same idField value
 *   - idField === null: any handler of the type satisfies (global handler)
 *   - allHandlersRequired: all handlers in `handlers[]` must match (RGB light)
 *   - requiredWhen set: contract only enforced when register matches the filter
 *
 * Adding a new protocol = add registry entry; this function automatically
 * starts enforcing the new contract with no code changes here.
 */
function checkRegisterWithoutHandler(doc: Document): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allBlocks = doc.querySelectorAll('block');

  for (const contract of CROSS_BLOCK_CONTRACTS) {
    const registers: Array<{ id: string }> = [];
    const handlersByType: Record<string, string[]> = {};
    for (const h of contract.handlers) handlersByType[h] = [];

    for (let i = 0; i < allBlocks.length; i++) {
      const el = allBlocks[i];
      const t = el.getAttribute('type');
      if (!t) continue;

      if (t === contract.register) {
        if (contract.requiredWhen) {
          const fEl = findDirectChild(el, 'field', contract.requiredWhen.fieldName);
          if (fEl?.textContent !== contract.requiredWhen.fieldValue) continue;
        }
        const id = contract.idField
          ? (findDirectChild(el, 'field', contract.idField)?.textContent ?? '?')
          : '__global__';
        registers.push({ id });
      }
      if (contract.handlers.includes(t)) {
        const id = contract.idField
          ? (findDirectChild(el, 'field', contract.idField)?.textContent ?? '?')
          : '__global__';
        handlersByType[t].push(id);
      }
    }

    for (const reg of registers) {
      if (contract.allHandlersRequired) {
        // ALL listed handlers must have a matching ID (RGB light requires
        // both on_command + on_rgb_command per LIGHT_ID)
        for (const ht of contract.handlers) {
          if (!handlersByType[ht].includes(reg.id)) {
            issues.push(makeIssue(contract, ht, reg.id));
          }
        }
      } else {
        // ANY matching handler is sufficient
        const ok = contract.handlers.some((ht) => handlersByType[ht].includes(reg.id));
        if (!ok) {
          issues.push(makeIssue(contract, contract.handlers.join('|'), reg.id));
        }
      }
    }
  }

  return issues;
}

function makeIssue(
  contract: CrossBlockContract,
  handlerType: string,
  missingId: string,
): ValidationIssue {
  return {
    kind: 'register_without_handler',
    contractId: contract.id,
    registerType: contract.register,
    handlerType,
    idField: contract.idField,
    missingId,
    protocolLabel: contract.protocolLabel,
  };
}

// ---------------------------------------------------------------------------
// Check 8: controls_if anomaly with no body (controls_if(IF0=block, no DO/ELSE))
// ---------------------------------------------------------------------------

/**
 * BUG-086 Session 133 — Detects `controls_if` where IF0 has a child block
 * (typically an *_init / non-comparison hasOutput block) but no DO/ELSE
 * statement chain. This is the wifi-controller-mix / modbus-temp-monitor
 * canonical sample defect: `controls_if(IF0=mpu6050_init, no DO)` with
 * the actual work chained via `<next>` AFTER the controls_if. Blockly's
 * lenient parser drops the `<next>` chain in some cases, and even when it
 * loads, the result is a no-op `if (init()) {}` that confuses the AI.
 *
 * Heuristic: flag when IF0 condition is a block but ALL of DO0..DOn /
 * ELSE statements are absent. Empty controls_if is suspicious anyway —
 * intentional empty bodies should use `controls_if` only after at least
 * one branch is filled.
 */
function checkControlsIfAnomalyNoBody(doc: Document, catalog: BlockCatalog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blockMap = new Map<string, BlockCatalogEntry>(catalog.blocks.map((b) => [b.type, b]));
  const allBlocks = doc.querySelectorAll('block');
  for (let i = 0; i < allBlocks.length; i++) {
    const el = allBlocks[i];
    if (el.getAttribute('type') !== 'controls_if') continue;

    const if0 = findDirectChild(el, 'value', 'IF0');
    if (!if0) continue;
    const inner = findDirectChild(if0, 'block', null);
    if (!inner) continue;
    const innerType = inner.getAttribute('type');
    if (!innerType) continue;

    // Has any DO chain (DO0, DO1, ...) or ELSE branch?
    let hasBody = false;
    for (let j = 0; j < el.children.length; j++) {
      const c = el.children[j];
      if (c.tagName !== 'statement') continue;
      const nm = c.getAttribute('name') ?? '';
      if (nm.startsWith('DO') || nm === 'ELSE') {
        // Statement element exists; consider non-empty if it has any child
        if (c.children.length > 0) {
          hasBody = true;
          break;
        }
      }
    }
    if (hasBody) continue;

    // Skip pure logic_compare / logic_operation / logic_boolean conditions —
    // they're idiomatic "if value is true" patterns. Only flag when the
    // condition is something else hasOutput=true (like *_init returning
    // Boolean status, but architecturally the wrong use of controls_if).
    if (innerType === 'logic_compare' || innerType === 'logic_operation' || innerType === 'logic_boolean' || innerType === 'logic_negate' || innerType === 'logic_ternary') continue;

    // Only flag if inner has hasOutput=true (the wifi-controller-mix /
    // modbus-temp-monitor pattern). Pure-statement children inside
    // value-slot would already be caught by Blockly's connection checker.
    const innerMeta = blockMap.get(innerType);
    if (!innerMeta || !innerMeta.hasOutput) continue;

    const controlIfBlockId = el.getAttribute('id') ?? `controls_if@${i}`;
    issues.push({
      kind: 'controls_if_anomaly_no_body',
      conditionBlockType: innerType,
      controlIfBlockId,
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Check 9: Type C missing_required_init (data-driven from TYPE_C_INIT_CONTRACTS)
// ---------------------------------------------------------------------------

/**
 * BUG-086 Session 133 — For every TypeCInitContract in the registry,
 * verify that whenever any consumer block is present, at least one init
 * block from the family is also present.
 *
 * Examples caught:
 *   - ble_uart_write without ble_uart_setup
 *   - espnow_send without espnow_init
 *   - iot_cloud_publish without iot_cloud_connect
 *
 * Adding a new Type C family = 1 entry in TYPE_C_INIT_CONTRACTS; this
 * check auto-extends with no code changes here.
 */
function checkMissingRequiredInit(doc: Document): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allBlocks = doc.querySelectorAll('block');
  const present = new Set<string>();
  for (let i = 0; i < allBlocks.length; i++) {
    const t = allBlocks[i].getAttribute('type');
    if (t) present.add(t);
  }

  for (const contract of TYPE_C_INIT_CONTRACTS) {
    const consumersFound = contract.consumerBlocks.filter((b) => present.has(b));
    if (consumersFound.length === 0) continue;
    const hasInit = contract.initBlocks.some((b) => present.has(b));
    if (hasInit) continue;
    issues.push({
      kind: 'missing_required_init',
      contractId: contract.id,
      protocolLabel: contract.protocolLabel,
      consumerBlocks: consumersFound.slice(0, 5),
      requiredInitOptions: contract.initBlocks,
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Check 10: handler nested inside another handler (rule 03 codified)
// ---------------------------------------------------------------------------

/**
 * BUG-086 Session 133 — Detects handler blocks (the ones in
 * HANDLER_BLOCK_TYPES_FOR_BINARY_BRANCH plus a few more) nested inside
 * another handler's HANDLER / CALLBACK / ON_CALLBACK / OFF_CALLBACK
 * statement input. Rule 03's existing systemPrompt prohibition is now
 * runtime-enforced.
 *
 * Nesting causes the inner handler to fire only when the outer one
 * triggers, breaking independent operation.
 */
const HANDLER_NEST_STATEMENT_NAMES = new Set<string>([
  'HANDLER',
  'CALLBACK',
  'ON_CALLBACK',
  'OFF_CALLBACK',
]);

// Additional handler-class block types beyond the binary-branch set
// (these can be top-level alone but must NOT nest inside another handler).
const ALL_HANDLER_BLOCK_TYPES = new Set<string>([
  ...HANDLER_BLOCK_TYPES_FOR_BINARY_BRANCH,
  'ha_switch_on_command',
  'ha_number_on_command',
  'ha_light_on_command',
  'ha_light_on_rgb_command',
  'ha_fan_on_command',
  'ha_cover_on_command',
  'ha_button_on_press',
  'ha_scene_on_command',
  'ha_tag_scanner_scanned',
  'ha_on_connected',
  'ha_on_disconnected',
  'websocket_server_on_connect',
  'ble_on_device_found',
  'espnow_on_receive',
  'lora_on_receive',
  'iot_cloud_on_message',
  'azure_iot_hub_on_c2d',
  'azure_iot_subscribe_direct_method',
  'ticker_attach',
  'attach_interrupt',
  'esp32_touch_attach_interrupt',
]);

function checkHandlerNestedInsideHandler(doc: Document): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allBlocks = doc.querySelectorAll('block');
  for (let i = 0; i < allBlocks.length; i++) {
    const inner = allBlocks[i];
    const innerType = inner.getAttribute('type');
    if (!innerType || !ALL_HANDLER_BLOCK_TYPES.has(innerType)) continue;

    // Walk up ancestors. If any ancestor is <statement name="HANDLER|CALLBACK|...">
    // AND its grandparent <block> is also a handler type → nested violation.
    let cur: Element | null = inner.parentElement;
    while (cur) {
      if (cur.tagName === 'statement') {
        const stmtName = cur.getAttribute('name') ?? '';
        if (HANDLER_NEST_STATEMENT_NAMES.has(stmtName)) {
          const grandparent = cur.parentElement;
          if (grandparent && grandparent.tagName === 'block') {
            const outerType = grandparent.getAttribute('type');
            if (outerType && ALL_HANDLER_BLOCK_TYPES.has(outerType)) {
              issues.push({
                kind: 'handler_nested_inside_handler',
                innerHandlerType: innerType,
                innerHandlerId: inner.getAttribute('id') ?? `${innerType}@${i}`,
                outerHandlerType: outerType,
                outerHandlerId: grandparent.getAttribute('id') ?? outerType,
              });
              break; // one report per inner handler
            }
          }
        }
      }
      cur = cur.parentElement;
    }
  }
  return issues;
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
