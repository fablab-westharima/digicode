/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BUG-086 Session 133 — Cross-block 1:1 contract registry.
 *
 * Single source of truth for "register/create block ↔ handler block"
 * relationships that the AI generator must respect. Used by:
 *   - aiSystemPrompts.ts / systemPrompt.ts: auto-emit `# Cross-Block Contracts`
 *     section in all 5 langs (template-driven, no per-entry i18n needed)
 *   - semanticValidator.ts Check 6: data-driven register_without_handler
 *     detection (no hardcoded `if (blockType === 'X')` chains)
 *   - fixPromptBuilder.ts: 5-lang message renderer for register_without_handler
 *   - scripts/audit-sample-structural.ts (prebuild): canonical sample audit
 *   - src/services/ai/__tests__/sample-e2e-probe.test.ts: permanent e2e gate
 *
 * Adding a new protocol = add ONE entry to CROSS_BLOCK_CONTRACTS. All 5
 * consumers above auto-track without manual sync. See plans/active/
 * bug-086-ai-infra-rebuild.md §2 + §6 for the full maintenance workflow.
 */

import type { AiLanguage } from './aiSystemPrompts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossBlockContract {
  /**
   * Stable contract id (kebab-case, e.g. 'websocket-server', 'ha-switch').
   * Used by validator + fix prompt + tests to key into the contract.
   */
  id: string;

  /**
   * Block type that registers/creates a channel/entity (1 per contract).
   * Must exist in the block catalog (verified by vitest registry-integrity).
   */
  register: string;

  /**
   * Required handler block type(s). When length > 1 with
   * allHandlersRequired=true, ALL handlers must match the register's ID
   * (e.g. ha_light_create_rgb requires both on_command and on_rgb_command).
   * Otherwise ANY matching handler satisfies the contract.
   */
  handlers: readonly string[];

  /**
   * When handlers.length > 1: do ALL need to match (true) or any (default: false)?
   */
  allHandlersRequired?: boolean;

  /**
   * Field name in the register block that identifies the entity/channel.
   * `null` = global contract (no per-ID match, existence-only check —
   * e.g. mqtt_subscribe has TOPIC but mqtt_on_message has no TOPIC field,
   * so we can only verify "any handler exists" globally).
   */
  idField: string | null;

  /**
   * Optional filter: only enforce contract when register block has this
   * field equal to this value. E.g., websocket_server_register WRITE=TRUE
   * filter means READ-only / NOTIFY-only registers don't require a handler.
   */
  requiredWhen?: {
    fieldName: string;
    fieldValue: string;
  };

  /**
   * Stable English short label used as the {protocolLabel} placeholder
   * in all 5 lang templates. Kept English even in non-en prompts because
   * block type names are English and consistency aids AI cross-reference.
   */
  protocolLabel: string;
}

// ---------------------------------------------------------------------------
// Registry — single source of truth (add new protocol HERE, only HERE)
// ---------------------------------------------------------------------------

/**
 * 10 Type A patterns + (Type C handled by extending later in commit C6).
 * Order is presentation order in systemPrompt section (most-common first).
 */
export const CROSS_BLOCK_CONTRACTS: readonly CrossBlockContract[] = [
  {
    id: 'websocket-server',
    register: 'websocket_server_register',
    handlers: ['websocket_server_on_message'],
    idField: 'CHANNEL_ID',
    requiredWhen: { fieldName: 'WRITE', fieldValue: 'TRUE' },
    protocolLabel: 'WebSocket server',
  },
  {
    id: 'ha-switch',
    register: 'ha_switch_create',
    handlers: ['ha_switch_on_command'],
    idField: 'SWITCH_ID',
    protocolLabel: 'HA Switch',
  },
  {
    id: 'ha-number',
    register: 'ha_number_create',
    handlers: ['ha_number_on_command'],
    idField: 'NUMBER_ID',
    protocolLabel: 'HA Number',
  },
  {
    id: 'ha-light',
    register: 'ha_light_create',
    handlers: ['ha_light_on_command'],
    idField: 'LIGHT_ID',
    protocolLabel: 'HA Light',
  },
  {
    id: 'ha-light-rgb',
    register: 'ha_light_create_rgb',
    handlers: ['ha_light_on_command', 'ha_light_on_rgb_command'],
    allHandlersRequired: true,
    idField: 'LIGHT_ID',
    protocolLabel: 'HA Light (RGB)',
  },
  {
    id: 'ha-fan',
    register: 'ha_fan_create',
    handlers: ['ha_fan_on_command'],
    idField: 'FAN_ID',
    protocolLabel: 'HA Fan',
  },
  {
    id: 'ha-cover',
    register: 'ha_cover_create',
    handlers: ['ha_cover_on_command'],
    idField: 'COVER_ID',
    protocolLabel: 'HA Cover',
  },
  {
    id: 'ha-button',
    register: 'ha_button_create',
    handlers: ['ha_button_on_press'],
    idField: 'BUTTON_ID',
    protocolLabel: 'HA Button',
  },
  {
    id: 'ha-scene',
    register: 'ha_scene_create',
    handlers: ['ha_scene_on_command'],
    idField: 'SCENE_ID',
    protocolLabel: 'HA Scene',
  },
  {
    id: 'mqtt-subscribe',
    register: 'mqtt_subscribe',
    handlers: ['mqtt_on_message'],
    // mqtt_on_message has no TOPIC field — handler is global, dispatching
    // via the `mqtt_topic` variable inside the user's HANDLER. So we can only
    // enforce existence (any mqtt_on_message satisfies any mqtt_subscribe).
    idField: null,
    protocolLabel: 'MQTT Subscribe',
  },
];

// ---------------------------------------------------------------------------
// i18n templates — 5 lang × small fixed string count (NOT per-contract strings)
// ---------------------------------------------------------------------------

/**
 * Section header (1 string per lang).
 */
const CROSS_BLOCK_INTRO: Record<AiLanguage, string> = {
  ja:      'AI 生成時に最も発生しやすい欠陥の一つは、register/create ブロックを emit したのに対応 handler ブロックを忘れる「register-without-handler」です。下記の対応表に従い、register ブロックを生成する場合は必ず対応 handler ブロックも同じ XML 内に生成してください。',
  en:      'One of the most common AI-generation defects is emitting a register/create block but forgetting the matching handler block ("register-without-handler"). For each row below, when you emit the register block you MUST also emit the matching handler block(s) in the same XML.',
  'zh-TW': 'AI 生成時最常見的缺陷之一是 emit register/create 積木卻忘記對應的 handler 積木 (「register-without-handler」)。下表中，當你 emit register 積木時，必須在同一 XML 內 emit 對應的 handler 積木。',
  es:      'Uno de los defectos más comunes en la generación AI es emitir un bloque register/create pero olvidar el bloque handler correspondiente ("register-without-handler"). Para cada fila a continuación, cuando emites el bloque register DEBES emitir también los bloques handler correspondientes en el mismo XML.',
  'pt-PT': 'Um dos defeitos mais comuns na geração AI é emitir um bloco register/create mas esquecer o bloco handler correspondente ("register-without-handler"). Para cada linha abaixo, quando emites o bloco register DEVES também emitir os blocos handler correspondentes no mesmo XML.',
};

/**
 * Template for ID-keyed contracts (idField !== null). Placeholders:
 *   {protocolLabel}, {register}, {handlers}, {idField}, {filterClause}, {allClause}
 */
const TEMPLATE_ID_KEYED: Record<AiLanguage, string> = {
  ja:      '- ★ {protocolLabel}: ブロック `{register}` を emit したとき、同じ `{idField}` を持つ `{handlers}` ハンドラを必ず同 XML 内に emit してください。{filterClause}{allClause}',
  en:      '- ★ {protocolLabel}: When you emit `{register}`, you MUST emit a matching `{handlers}` handler with the SAME `{idField}` value in the same XML. {filterClause}{allClause}',
  'zh-TW': '- ★ {protocolLabel}: emit `{register}` 積木時，必須在同一 XML 內 emit 具有相同 `{idField}` 值的 `{handlers}` 處理器。{filterClause}{allClause}',
  es:      '- ★ {protocolLabel}: Cuando emitas `{register}`, DEBES emitir también un handler `{handlers}` con el MISMO valor de `{idField}` en el mismo XML. {filterClause}{allClause}',
  'pt-PT': '- ★ {protocolLabel}: Quando emitires `{register}`, DEVES também emitir um handler `{handlers}` com o MESMO valor de `{idField}` no mesmo XML. {filterClause}{allClause}',
};

/**
 * Template for global contracts (idField === null). Placeholders:
 *   {protocolLabel}, {register}, {handlers}
 */
const TEMPLATE_GLOBAL: Record<AiLanguage, string> = {
  ja:      '- ★ {protocolLabel}: ブロック `{register}` を emit したとき、`{handlers}` ハンドラを必ず同 XML 内に少なくとも 1 つ emit してください (ハンドラは global で、TOPIC 等の per-message dispatch は HANDLER 内で行います)。',
  en:      '- ★ {protocolLabel}: When you emit `{register}`, you MUST emit at least one `{handlers}` handler in the same XML (the handler is global; per-message dispatch happens inside the HANDLER using the `mqtt_topic` variable).',
  'zh-TW': '- ★ {protocolLabel}: emit `{register}` 積木時，必須在同一 XML 內至少 emit 一個 `{handlers}` 處理器 (處理器為 global，per-message dispatch 在 HANDLER 內透過 `mqtt_topic` 變數進行)。',
  es:      '- ★ {protocolLabel}: Cuando emitas `{register}`, DEBES emitir al menos un handler `{handlers}` en el mismo XML (el handler es global; el despacho por mensaje ocurre dentro del HANDLER usando la variable `mqtt_topic`).',
  'pt-PT': '- ★ {protocolLabel}: Quando emitires `{register}`, DEVES emitir pelo menos um handler `{handlers}` no mesmo XML (o handler é global; o despacho por mensagem acontece dentro do HANDLER usando a variável `mqtt_topic`).',
};

/**
 * Clause appended when allHandlersRequired=true.
 */
const ALL_HANDLERS_REQUIRED_CLAUSE: Record<AiLanguage, string> = {
  ja:      ' 複数 handler が必要な場合は全件 emit してください。',
  en:      ' When multiple handlers are listed, ALL of them are required.',
  'zh-TW': ' 列出多個處理器時，必須全部 emit。',
  es:      ' Cuando se listan múltiples handlers, TODOS son obligatorios.',
  'pt-PT': ' Quando vários handlers são listados, TODOS são obrigatórios.',
};

/**
 * Clause appended when requiredWhen filter is set. Placeholders:
 *   {fieldName}, {fieldValue}
 */
const REQUIRED_WHEN_CLAUSE: Record<AiLanguage, string> = {
  ja:      ' (この契約は register の `{fieldName}=\"{fieldValue}\"` のときのみ適用)',
  en:      ' (This contract applies only when register has `{fieldName}=\"{fieldValue}\"`)',
  'zh-TW': ' (此契約僅在 register 的 `{fieldName}=\"{fieldValue}\"` 時適用)',
  es:      ' (Este contrato aplica solo cuando register tiene `{fieldName}=\"{fieldValue}\"`)',
  'pt-PT': ' (Este contrato aplica-se apenas quando register tem `{fieldName}=\"{fieldValue}\"`)',
};

// ---------------------------------------------------------------------------
// Public builder — used by systemPrompt.ts
// ---------------------------------------------------------------------------

/**
 * Build the `# Cross-Block Contracts` section text for the given language.
 * Auto-iterates CROSS_BLOCK_CONTRACTS and substitutes placeholders.
 * Adding a new contract = add an entry above; this function rebuilds
 * automatically with no code changes.
 */
export function buildCrossBlockContractSection(lang: AiLanguage): string {
  const intro = CROSS_BLOCK_INTRO[lang];
  const lines: string[] = [intro];

  for (const c of CROSS_BLOCK_CONTRACTS) {
    const filterClause = c.requiredWhen
      ? REQUIRED_WHEN_CLAUSE[lang]
          .replace('{fieldName}', c.requiredWhen.fieldName)
          .replace('{fieldValue}', c.requiredWhen.fieldValue)
      : '';
    const allClause = c.allHandlersRequired ? ALL_HANDLERS_REQUIRED_CLAUSE[lang] : '';
    const handlersJoined = c.handlers.join(' + ');

    const template = c.idField === null ? TEMPLATE_GLOBAL[lang] : TEMPLATE_ID_KEYED[lang];
    const rendered = template
      .replace('{protocolLabel}', c.protocolLabel)
      .replace('{register}', c.register)
      .replace('{handlers}', handlersJoined)
      .replace('{idField}', c.idField ?? '')
      .replace('{filterClause}', filterClause)
      .replace('{allClause}', allClause);

    lines.push(rendered);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Internal exports for testing (registry-integrity + auto-emit verify)
// ---------------------------------------------------------------------------

export const __testing__ = {
  CROSS_BLOCK_INTRO,
  TEMPLATE_ID_KEYED,
  TEMPLATE_GLOBAL,
  ALL_HANDLERS_REQUIRED_CLAUSE,
  REQUIRED_WHEN_CLAUSE,
};
