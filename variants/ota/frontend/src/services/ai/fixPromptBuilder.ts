/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BUG-085 Phase 2-V — Fix prompt builder for AI retry.
 *
 * Given a previous AI-generated XML and a list of semantic validation
 * issues, build a fix instruction prompt that:
 *   1. Lists each defect explicitly with block id + context,
 *   2. Re-states the relevant BUG-085 rules (concentrated reminder,
 *      since the original system prompt's attention may have decayed),
 *   3. Attaches the previous XML for the AI to reference + fix.
 *
 * The prompt is in the user's target AI language so the AI's retry stays
 * within the same language context (the system prompt is already in that
 * language).
 *
 * D-5 採択: issue list + ルール再掲 + 前回 XML 添付 (full context).
 */

import type { ValidationIssue } from './semanticValidator';
import type { AiLanguage } from '@/data/aiSystemPrompts';

// ---------------------------------------------------------------------------
// Per-language message renderers
// ---------------------------------------------------------------------------

type IssueRenderer = (issue: ValidationIssue) => string;

const ISSUE_RENDERERS: Record<AiLanguage, Record<ValidationIssue['kind'], IssueRenderer>> = {
  ja: {
    unconnected_value_input: (i) => {
      if (i.kind !== 'unconnected_value_input') return '';
      const t = i.expectedType ? ` (期待型: ${i.expectedType})` : '';
      return `${i.blockType} block (id=${i.blockId}) の ${i.inputName} 入力に value block が接続されていません${t}。固定値 literal で hardcode せず、必ず value block (e.g. websocket_server_received_value / dht_temperature 等の sensor 読取 block / variables_get / math_number 等) を <value name="${i.inputName}"> 子要素として接続してください。型不一致に見えても (例: String→Number) generator が auto-coerce します`;
    },
    orphan_value_block: (i) => {
      if (i.kind !== 'orphan_value_block') return '';
      return `${i.blockType} block (id=${i.blockId}) が XML top-level (arduino_setup / arduino_loop と sibling) に配置されています。これは意味のない top-level expression (\`wsServerMessage;\` 等) を emit する原因です。必ず対応する HANDLER 内の <value> 子要素として nest してください`;
    },
    asymmetric_binary_branch: (i) => {
      if (i.kind !== 'asymmetric_binary_branch') return '';
      return `${i.handlerType} HANDLER (channel/id=${i.handlerKey}) で受信値比較 "${i.present.join('", "')}" のみで分岐し、対称的な "${i.missing.join('", "')}" 分岐が不在です。両方の controls_if を必ず生成してください (例: == "1" → HIGH の next に == "0" → LOW を chain)`;
    },
    missing_wifi_connect: (i) => {
      if (i.kind !== 'missing_wifi_connect') return '';
      const blocksHead = i.presentWifiBlocks.slice(0, 3).join(', ');
      const more = i.presentWifiBlocks.length > 3 ? ', ...' : '';
      return `WiFi 通信を含む block (${blocksHead}${more}) を使用していますが、arduino_setup 内に wifi_connect (または WiFi 接続を内包する ha_device_init) が不在です。必ず arduino_setup の先頭付近に wifi_connect block を追加してください`;
    },
    type_mismatch_will_cause_detach: (i) => {
      if (i.kind !== 'type_mismatch_will_cause_detach') return '';
      const exp = Array.isArray(i.expectedType) ? i.expectedType.join('|') : i.expectedType;
      const out = Array.isArray(i.childOutputType) ? i.childOutputType.join('|') : i.childOutputType;
      return `${i.parentBlockType} block (id=${i.parentBlockId}) の ${i.inputName} 入力 (受入型: ${exp}) に ${i.childBlockType} block (出力型: ${out ?? '?'}) を接続していますが、型不一致で Blockly が workspace load 時に接続を rejection、child block が top-level orphan 化します。型互換 block (例: math_number / variables_get) に切り替えるか、別 input slot を使用してください`;
    },
    register_without_handler: (i) => {
      if (i.kind !== 'register_without_handler') return '';
      const idClause = i.idField ? ` (${i.idField}="${i.missingId}")` : ' (global handler)';
      return `${i.protocolLabel}: \`${i.registerType}\` block${idClause} に対応する \`${i.handlerType}\` handler block が同 XML 内に不在です。${i.idField ? `同じ ${i.idField} 値を持つ` : '少なくとも 1 つの'} ${i.handlerType} block を必ず生成してください。register と handler は 1:1 対応で、handler が無いとブラウザ/HA UI から値を送っても device は反応しません (silent fail)`;
    },
    xml_structural_malformed: (i) => {
      if (i.kind !== 'xml_structural_malformed') return '';
      return `生成された XML が構造的に不正です (parse error: ${i.parseErrorSnippet})。Blockly の寛容な parser が malformed XML を silent に dropping して broken cpp を emit する原因になります。\`<block>\` / \`<next>\` / \`<statement>\` / \`<value>\` の開閉が全て揃っていること、属性が正しく quote されていること、全 tag が小文字であることを確認し、well-formed な XML を再生成してください`;
    },
    controls_if_anomaly_no_body: (i) => {
      if (i.kind !== 'controls_if_anomaly_no_body') return '';
      return `\`controls_if\` (id=${i.controlIfBlockId}) の IF0 入力に \`${i.conditionBlockType}\` block が接続されていますが、DO0 / ELSE 等の本体 statement chain が全て空です。\`${i.conditionBlockType}\` は初期化系/非比較系 block と推測されます。\`controls_if\` を空 body で配置せず、(a) \`${i.conditionBlockType}\` を sequential block として直接 setup chain に置く、(b) DO0 に本来の処理を入れる、(c) この controls_if を削除する、のいずれかにしてください。空 body のまま放置すると Blockly の lenient parser が後続の \`<next>\` chain を silent drop します`;
    },
    missing_required_init: (i) => {
      if (i.kind !== 'missing_required_init') return '';
      return `${i.protocolLabel}: 消費 block (${i.consumerBlocks.join(', ')}) を emit していますが、arduino_setup 内に init block (${i.requiredInitOptions.join(' / ')} のいずれか) が不在です。${i.requiredInitOptions.join(' / ')} のうちいずれか 1 つを必ず arduino_setup 内に追加してください。init 不在のままだと ${i.protocolLabel} ハードウェアは silent fail します`;
    },
    handler_nested_inside_handler: (i) => {
      if (i.kind !== 'handler_nested_inside_handler') return '';
      return `\`${i.innerHandlerType}\` block (id=${i.innerHandlerId}) が \`${i.outerHandlerType}\` block の HANDLER / CALLBACK 入力内に nest されています。ハンドラ系 block は arduino_setup / arduino_loop と並列の top-level に配置してください。nest すると内側 handler は外側 handler 発火時のみ実行され、独立動作になりません`;
    },
  },
  en: {
    unconnected_value_input: (i) => {
      if (i.kind !== 'unconnected_value_input') return '';
      const t = i.expectedType ? ` (expected type: ${i.expectedType})` : '';
      return `${i.blockType} block (id=${i.blockId}) has an empty ${i.inputName} value input${t}. Connect a value block (e.g. websocket_server_received_value / dht_temperature / variables_get / math_number, etc.) as a <value name="${i.inputName}"> child element. NEVER use a hardcoded literal. Type mismatches (e.g. String→Number) are auto-coerced by the generator`;
    },
    orphan_value_block: (i) => {
      if (i.kind !== 'orphan_value_block') return '';
      return `${i.blockType} block (id=${i.blockId}) is placed at the XML top-level (sibling of arduino_setup / arduino_loop). This emits a meaningless top-level expression like \`wsServerMessage;\`. Nest it as a <value> child inside the corresponding HANDLER`;
    },
    asymmetric_binary_branch: (i) => {
      if (i.kind !== 'asymmetric_binary_branch') return '';
      return `${i.handlerType} HANDLER (channel/id=${i.handlerKey}) only branches on values "${i.present.join('", "')}", but the symmetric "${i.missing.join('", "')}" branch is missing. Emit BOTH controls_if branches (e.g. == "1" → HIGH chained with == "0" → LOW)`;
    },
    missing_wifi_connect: (i) => {
      if (i.kind !== 'missing_wifi_connect') return '';
      const blocksHead = i.presentWifiBlocks.slice(0, 3).join(', ');
      const more = i.presentWifiBlocks.length > 3 ? ', ...' : '';
      return `WiFi-using blocks (${blocksHead}${more}) are used, but wifi_connect (or ha_device_init that embeds WiFi) is missing from arduino_setup. Add a wifi_connect block near the top of arduino_setup`;
    },
    type_mismatch_will_cause_detach: (i) => {
      if (i.kind !== 'type_mismatch_will_cause_detach') return '';
      const exp = Array.isArray(i.expectedType) ? i.expectedType.join('|') : i.expectedType;
      const out = Array.isArray(i.childOutputType) ? i.childOutputType.join('|') : i.childOutputType;
      return `${i.parentBlockType} block (id=${i.parentBlockId}) ${i.inputName} input (accepts: ${exp}) has ${i.childBlockType} block (outputs: ${out ?? '?'}) connected, but the type mismatch will cause Blockly to REJECT the connection at workspace load and detach the child to top-level. Use a type-compatible block (e.g. math_number / variables_get) or a different input slot`;
    },
    register_without_handler: (i) => {
      if (i.kind !== 'register_without_handler') return '';
      const idClause = i.idField ? ` (${i.idField}="${i.missingId}")` : ' (global handler)';
      return `${i.protocolLabel}: \`${i.registerType}\` block${idClause} has no matching \`${i.handlerType}\` handler in the same XML. You MUST emit a \`${i.handlerType}\` block ${i.idField ? `with the SAME ${i.idField} value` : '(at least one)'}. Register and handler are 1:1; without the handler, the device silently fails to react when values arrive from the browser / HA UI`;
    },
    xml_structural_malformed: (i) => {
      if (i.kind !== 'xml_structural_malformed') return '';
      return `Your generated XML is structurally malformed (parse error: ${i.parseErrorSnippet}). Blockly's lenient parser silently drops malformed sub-trees and emits broken cpp. Ensure every \`<block>\` / \`<next>\` / \`<statement>\` / \`<value>\` open tag has a matching close tag, every attribute is properly quoted, and all tags are lowercase, then regenerate well-formed XML`;
    },
    controls_if_anomaly_no_body: (i) => {
      if (i.kind !== 'controls_if_anomaly_no_body') return '';
      return `\`controls_if\` (id=${i.controlIfBlockId}) has \`${i.conditionBlockType}\` connected as IF0, but DO0 / ELSE / other body statements are all empty. \`${i.conditionBlockType}\` looks like an initialization / non-comparison block. Do NOT place \`controls_if\` with an empty body; instead either (a) put \`${i.conditionBlockType}\` directly as a sequential block in the setup chain, (b) fill DO0 with the intended work, or (c) remove this controls_if entirely. An empty body causes Blockly's lenient parser to silently drop the trailing \`<next>\` chain`;
    },
    missing_required_init: (i) => {
      if (i.kind !== 'missing_required_init') return '';
      return `${i.protocolLabel}: consumer blocks (${i.consumerBlocks.join(', ')}) are emitted but no init block (${i.requiredInitOptions.join(' / ')}) is present in arduino_setup. Add one of ${i.requiredInitOptions.join(' / ')} inside arduino_setup. Without the init, ${i.protocolLabel} hardware silently fails`;
    },
    handler_nested_inside_handler: (i) => {
      if (i.kind !== 'handler_nested_inside_handler') return '';
      return `\`${i.innerHandlerType}\` block (id=${i.innerHandlerId}) is nested inside the HANDLER / CALLBACK input of \`${i.outerHandlerType}\`. Handler blocks MUST be placed at the top level alongside arduino_setup / arduino_loop. Nesting causes the inner handler to run only when the outer fires, breaking independent operation`;
    },
  },
  'zh-TW': {
    unconnected_value_input: (i) => {
      if (i.kind !== 'unconnected_value_input') return '';
      const t = i.expectedType ? ` (預期型別: ${i.expectedType})` : '';
      return `${i.blockType} 積木 (id=${i.blockId}) 的 ${i.inputName} 輸入未連接 value 積木${t}。請勿使用固定 literal hardcode，必須將 value 積木 (例如 websocket_server_received_value / dht_temperature 等 sensor 讀取積木 / variables_get / math_number 等) 作為 <value name="${i.inputName}"> 子元素連接。即使型別看似不符 (例: String→Number)，generator 會自動 coerce`;
    },
    orphan_value_block: (i) => {
      if (i.kind !== 'orphan_value_block') return '';
      return `${i.blockType} 積木 (id=${i.blockId}) 放置於 XML top-level (arduino_setup / arduino_loop 的 sibling)。這會 emit 無意義的 top-level 表達式 (例如 \`wsServerMessage;\`)。請務必 nest 在對應 HANDLER 內的 <value> 子元素中`;
    },
    asymmetric_binary_branch: (i) => {
      if (i.kind !== 'asymmetric_binary_branch') return '';
      return `${i.handlerType} HANDLER (channel/id=${i.handlerKey}) 僅針對 "${i.present.join('", "')}" 進行分支，但對稱的 "${i.missing.join('", "')}" 分支不存在。請務必同時生成兩個 controls_if 分支 (例如 == "1" → HIGH 後接 == "0" → LOW)`;
    },
    missing_wifi_connect: (i) => {
      if (i.kind !== 'missing_wifi_connect') return '';
      const blocksHead = i.presentWifiBlocks.slice(0, 3).join(', ');
      const more = i.presentWifiBlocks.length > 3 ? ', ...' : '';
      return `使用 WiFi 通訊類積木 (${blocksHead}${more}) 但 arduino_setup 內缺少 wifi_connect (或內含 WiFi 連線的 ha_device_init)。請於 arduino_setup 開頭附近新增 wifi_connect 積木`;
    },
    type_mismatch_will_cause_detach: (i) => {
      if (i.kind !== 'type_mismatch_will_cause_detach') return '';
      const exp = Array.isArray(i.expectedType) ? i.expectedType.join('|') : i.expectedType;
      const out = Array.isArray(i.childOutputType) ? i.childOutputType.join('|') : i.childOutputType;
      return `${i.parentBlockType} 積木 (id=${i.parentBlockId}) 的 ${i.inputName} 輸入 (接受型別: ${exp}) 連接了 ${i.childBlockType} 積木 (輸出型別: ${out ?? '?'})，但型別不符會導致 Blockly 在 workspace load 時拒絕連接、將 child 積木分離至 top-level orphan。請改用型別相容的積木 (例: math_number / variables_get) 或使用其他 input slot`;
    },
    register_without_handler: (i) => {
      if (i.kind !== 'register_without_handler') return '';
      const idClause = i.idField ? ` (${i.idField}="${i.missingId}")` : ' (global handler)';
      return `${i.protocolLabel}: \`${i.registerType}\` 積木${idClause} 在同 XML 內缺少對應的 \`${i.handlerType}\` handler 積木。請務必 emit ${i.idField ? `具有相同 ${i.idField} 值的` : '至少一個'} \`${i.handlerType}\` 積木。register 與 handler 為 1:1 對應，缺少 handler 會導致瀏覽器 / HA UI 傳值時 device 無回應 (silent fail)`;
    },
    xml_structural_malformed: (i) => {
      if (i.kind !== 'xml_structural_malformed') return '';
      return `生成的 XML 結構不正確 (parse error: ${i.parseErrorSnippet})。Blockly 的寬容 parser 會 silent 丟棄不完整的子樹並 emit broken cpp。請確認 \`<block>\` / \`<next>\` / \`<statement>\` / \`<value>\` 所有 tag 都有對應的關閉、屬性都正確 quote、所有 tag 為小寫，然後重新生成 well-formed XML`;
    },
    controls_if_anomaly_no_body: (i) => {
      if (i.kind !== 'controls_if_anomaly_no_body') return '';
      return `\`controls_if\` (id=${i.controlIfBlockId}) 的 IF0 輸入連接了 \`${i.conditionBlockType}\` 積木，但 DO0 / ELSE 等 body statement 全部為空。\`${i.conditionBlockType}\` 看起來是初始化系/非比較系積木。請勿將 \`controls_if\` 留空 body，請改用 (a) 將 \`${i.conditionBlockType}\` 直接放在 setup chain 作為 sequential block、(b) 在 DO0 中填入實際處理、或 (c) 移除此 controls_if。空 body 會導致 Blockly 的 lenient parser silent 丟棄後續 \`<next>\` chain`;
    },
    missing_required_init: (i) => {
      if (i.kind !== 'missing_required_init') return '';
      return `${i.protocolLabel}: emit 了消費積木 (${i.consumerBlocks.join(', ')}) 但 arduino_setup 內缺少 init 積木 (${i.requiredInitOptions.join(' / ')} 之一)。請在 arduino_setup 內加入 ${i.requiredInitOptions.join(' / ')} 之一。init 不在則 ${i.protocolLabel} 硬體會 silent fail`;
    },
    handler_nested_inside_handler: (i) => {
      if (i.kind !== 'handler_nested_inside_handler') return '';
      return `\`${i.innerHandlerType}\` 積木 (id=${i.innerHandlerId}) 被 nest 在 \`${i.outerHandlerType}\` 的 HANDLER / CALLBACK 輸入內。處理器積木必須與 arduino_setup / arduino_loop 並列放置於 top-level。Nest 會使內部處理器僅在外部處理器觸發時執行，破壞獨立運作`;
    },
  },
  es: {
    unconnected_value_input: (i) => {
      if (i.kind !== 'unconnected_value_input') return '';
      const t = i.expectedType ? ` (tipo esperado: ${i.expectedType})` : '';
      return `El bloque ${i.blockType} (id=${i.blockId}) tiene la entrada ${i.inputName} vacía${t}. Conecta un bloque de valor (p.ej. websocket_server_received_value / dht_temperature / variables_get / math_number, etc.) como elemento hijo <value name="${i.inputName}">. NUNCA uses un literal hardcoded. Los desajustes de tipo (p.ej. String→Number) son auto-coerced por el generator`;
    },
    orphan_value_block: (i) => {
      if (i.kind !== 'orphan_value_block') return '';
      return `El bloque ${i.blockType} (id=${i.blockId}) está colocado en el top-level del XML (como hermano de arduino_setup / arduino_loop). Esto emite una expresión sin sentido como \`wsServerMessage;\`. Anídalo como hijo <value> dentro del HANDLER correspondiente`;
    },
    asymmetric_binary_branch: (i) => {
      if (i.kind !== 'asymmetric_binary_branch') return '';
      return `El HANDLER ${i.handlerType} (channel/id=${i.handlerKey}) solo se ramifica en "${i.present.join('", "')}", pero la rama simétrica "${i.missing.join('", "')}" está ausente. Emite AMBAS ramas controls_if (p.ej. == "1" → HIGH encadenado con == "0" → LOW)`;
    },
    missing_wifi_connect: (i) => {
      if (i.kind !== 'missing_wifi_connect') return '';
      const blocksHead = i.presentWifiBlocks.slice(0, 3).join(', ');
      const more = i.presentWifiBlocks.length > 3 ? ', ...' : '';
      return `Bloques que usan WiFi (${blocksHead}${more}) están presentes, pero falta wifi_connect (o ha_device_init que incrusta WiFi) en arduino_setup. Añade un bloque wifi_connect cerca del inicio de arduino_setup`;
    },
    type_mismatch_will_cause_detach: (i) => {
      if (i.kind !== 'type_mismatch_will_cause_detach') return '';
      const exp = Array.isArray(i.expectedType) ? i.expectedType.join('|') : i.expectedType;
      const out = Array.isArray(i.childOutputType) ? i.childOutputType.join('|') : i.childOutputType;
      return `El bloque ${i.parentBlockType} (id=${i.parentBlockId}) entrada ${i.inputName} (acepta: ${exp}) tiene conectado el bloque ${i.childBlockType} (salida: ${out ?? '?'}), pero la incompatibilidad de tipos hará que Blockly RECHACE la conexión al cargar el workspace y desplace el bloque hijo al top-level (orphan). Usa un bloque compatible (p.ej. math_number / variables_get) o una entrada distinta`;
    },
    register_without_handler: (i) => {
      if (i.kind !== 'register_without_handler') return '';
      const idClause = i.idField ? ` (${i.idField}="${i.missingId}")` : ' (handler global)';
      return `${i.protocolLabel}: el bloque \`${i.registerType}\`${idClause} no tiene un bloque handler \`${i.handlerType}\` correspondiente en el mismo XML. DEBES emitir un bloque \`${i.handlerType}\` ${i.idField ? `con el MISMO valor de ${i.idField}` : '(al menos uno)'}. Register y handler son 1:1; sin el handler, el dispositivo falla silenciosamente al recibir valores desde el navegador / HA UI`;
    },
    xml_structural_malformed: (i) => {
      if (i.kind !== 'xml_structural_malformed') return '';
      return `Tu XML generado está estructuralmente mal formado (parse error: ${i.parseErrorSnippet}). El parser tolerante de Blockly descarta silenciosamente sub-árboles mal formados y emite cpp roto. Asegúrate de que cada \`<block>\` / \`<next>\` / \`<statement>\` / \`<value>\` tenga su tag de cierre, los atributos estén entre comillas y todos los tags sean minúsculas, luego regenera el XML well-formed`;
    },
    controls_if_anomaly_no_body: (i) => {
      if (i.kind !== 'controls_if_anomaly_no_body') return '';
      return `\`controls_if\` (id=${i.controlIfBlockId}) tiene \`${i.conditionBlockType}\` conectado como IF0, pero DO0 / ELSE / otros statements del cuerpo están todos vacíos. \`${i.conditionBlockType}\` parece un bloque de inicialización / no-comparación. NO coloques \`controls_if\` con cuerpo vacío; en su lugar (a) coloca \`${i.conditionBlockType}\` directamente como bloque secuencial en la cadena de setup, (b) rellena DO0 con el trabajo previsto, o (c) elimina este controls_if. Un cuerpo vacío hace que el parser tolerante de Blockly descarte silenciosamente la cadena \`<next>\` posterior`;
    },
    missing_required_init: (i) => {
      if (i.kind !== 'missing_required_init') return '';
      return `${i.protocolLabel}: bloques consumidores (${i.consumerBlocks.join(', ')}) emitidos pero falta un bloque init (${i.requiredInitOptions.join(' / ')}) en arduino_setup. Añade uno de ${i.requiredInitOptions.join(' / ')} dentro de arduino_setup. Sin el init, el hardware ${i.protocolLabel} falla silenciosamente`;
    },
    handler_nested_inside_handler: (i) => {
      if (i.kind !== 'handler_nested_inside_handler') return '';
      return `El bloque \`${i.innerHandlerType}\` (id=${i.innerHandlerId}) está anidado dentro de la entrada HANDLER / CALLBACK de \`${i.outerHandlerType}\`. Los bloques handler DEBEN colocarse al nivel superior junto a arduino_setup / arduino_loop. Anidar causa que el handler interno se ejecute solo cuando dispara el externo, rompiendo la operación independiente`;
    },
  },
  'pt-PT': {
    unconnected_value_input: (i) => {
      if (i.kind !== 'unconnected_value_input') return '';
      const t = i.expectedType ? ` (tipo esperado: ${i.expectedType})` : '';
      return `O bloco ${i.blockType} (id=${i.blockId}) tem a entrada ${i.inputName} vazia${t}. Liga um bloco de valor (p.ex. websocket_server_received_value / dht_temperature / variables_get / math_number, etc.) como elemento filho <value name="${i.inputName}">. NUNCA uses um literal hardcoded. Os desfasamentos de tipo (p.ex. String→Number) são auto-coerced pelo generator`;
    },
    orphan_value_block: (i) => {
      if (i.kind !== 'orphan_value_block') return '';
      return `O bloco ${i.blockType} (id=${i.blockId}) está colocado no top-level do XML (como irmão de arduino_setup / arduino_loop). Isto emite uma expressão sem sentido como \`wsServerMessage;\`. Aninha-o como filho <value> dentro do HANDLER correspondente`;
    },
    asymmetric_binary_branch: (i) => {
      if (i.kind !== 'asymmetric_binary_branch') return '';
      return `O HANDLER ${i.handlerType} (channel/id=${i.handlerKey}) só ramifica em "${i.present.join('", "')}", mas o ramo simétrico "${i.missing.join('", "')}" está ausente. Emite AMBOS os ramos controls_if (p.ex. == "1" → HIGH encadeado com == "0" → LOW)`;
    },
    missing_wifi_connect: (i) => {
      if (i.kind !== 'missing_wifi_connect') return '';
      const blocksHead = i.presentWifiBlocks.slice(0, 3).join(', ');
      const more = i.presentWifiBlocks.length > 3 ? ', ...' : '';
      return `Blocos que usam WiFi (${blocksHead}${more}) estão presentes, mas falta wifi_connect (ou ha_device_init que incorpora WiFi) em arduino_setup. Adiciona um bloco wifi_connect perto do início de arduino_setup`;
    },
    type_mismatch_will_cause_detach: (i) => {
      if (i.kind !== 'type_mismatch_will_cause_detach') return '';
      const exp = Array.isArray(i.expectedType) ? i.expectedType.join('|') : i.expectedType;
      const out = Array.isArray(i.childOutputType) ? i.childOutputType.join('|') : i.childOutputType;
      return `O bloco ${i.parentBlockType} (id=${i.parentBlockId}) entrada ${i.inputName} (aceita: ${exp}) tem conectado o bloco ${i.childBlockType} (saída: ${out ?? '?'}), mas a incompatibilidade de tipos fará com que Blockly REJEITE a conexão ao carregar o workspace e desloque o bloco filho para o top-level (orphan). Usa um bloco compatível (p.ex. math_number / variables_get) ou outra entrada`;
    },
    register_without_handler: (i) => {
      if (i.kind !== 'register_without_handler') return '';
      const idClause = i.idField ? ` (${i.idField}="${i.missingId}")` : ' (handler global)';
      return `${i.protocolLabel}: o bloco \`${i.registerType}\`${idClause} não tem um bloco handler \`${i.handlerType}\` correspondente no mesmo XML. DEVES emitir um bloco \`${i.handlerType}\` ${i.idField ? `com o MESMO valor de ${i.idField}` : '(pelo menos um)'}. Register e handler são 1:1; sem o handler, o dispositivo falha silenciosamente ao receber valores do browser / HA UI`;
    },
    xml_structural_malformed: (i) => {
      if (i.kind !== 'xml_structural_malformed') return '';
      return `O teu XML gerado está estruturalmente mal formado (parse error: ${i.parseErrorSnippet}). O parser tolerante do Blockly descarta silenciosamente sub-árvores mal formadas e emite cpp partido. Garante que cada \`<block>\` / \`<next>\` / \`<statement>\` / \`<value>\` tem a sua tag de fecho, os atributos estão entre aspas e todas as tags são minúsculas, depois regenera o XML well-formed`;
    },
    controls_if_anomaly_no_body: (i) => {
      if (i.kind !== 'controls_if_anomaly_no_body') return '';
      return `\`controls_if\` (id=${i.controlIfBlockId}) tem \`${i.conditionBlockType}\` ligado como IF0, mas DO0 / ELSE / outros statements do corpo estão todos vazios. \`${i.conditionBlockType}\` parece um bloco de inicialização / não-comparação. NÃO coloques \`controls_if\` com corpo vazio; em vez disso (a) coloca \`${i.conditionBlockType}\` diretamente como bloco sequencial na cadeia de setup, (b) preenche DO0 com o trabalho pretendido, ou (c) remove este controls_if. Um corpo vazio faz com que o parser tolerante do Blockly descarte silenciosamente a cadeia \`<next>\` seguinte`;
    },
    missing_required_init: (i) => {
      if (i.kind !== 'missing_required_init') return '';
      return `${i.protocolLabel}: blocos consumidores (${i.consumerBlocks.join(', ')}) emitidos mas falta um bloco init (${i.requiredInitOptions.join(' / ')}) em arduino_setup. Adiciona um de ${i.requiredInitOptions.join(' / ')} dentro de arduino_setup. Sem o init, o hardware ${i.protocolLabel} falha silenciosamente`;
    },
    handler_nested_inside_handler: (i) => {
      if (i.kind !== 'handler_nested_inside_handler') return '';
      return `O bloco \`${i.innerHandlerType}\` (id=${i.innerHandlerId}) está aninhado dentro da entrada HANDLER / CALLBACK de \`${i.outerHandlerType}\`. Os blocos handler DEVEM ser colocados no nível superior junto a arduino_setup / arduino_loop. Aninhar faz com que o handler interno execute só quando o externo dispara, quebrando a operação independente`;
    },
  },
};

// ---------------------------------------------------------------------------
// Per-language prompt scaffolding
// ---------------------------------------------------------------------------

const FIX_PROMPT_INTRO: Record<AiLanguage, string> = {
  ja: '前回生成された XML に以下の構造的問題があります。各問題を修正した完全な XML を再生成してください。回答は XML のみ、説明文不要。',
  en: 'Your previous response had the following structural issues. Regenerate the complete XML with all issues fixed. Return ONLY the corrected XML, no explanations.',
  'zh-TW': '上次生成的 XML 有以下結構性問題。請重新生成已修正所有問題的完整 XML。回應僅 XML，無需說明。',
  es: 'Tu respuesta previa tuvo los siguientes problemas estructurales. Regenera el XML completo con todas las correcciones. Devuelve SOLO el XML corregido, sin explicaciones.',
  'pt-PT': 'A tua resposta anterior teve os seguintes problemas estruturais. Regenera o XML completo com todas as correções. Devolve APENAS o XML corrigido, sem explicações.',
};

const RULES_REMINDER: Record<AiLanguage, string> = {
  ja: '修正に必要なルール (BUG-085 + BUG-086 再掲):\n- ★ 全 valueInput には必ず block を接続 (固定値 literal hardcode 禁止、generator default fallback も禁止)\n- ★ value 系 received-value block (websocket_server_received_value 等) は HANDLER 内の <value> 子要素のみ、top-level 配置禁止\n- ★ 2 値分岐 (ON/OFF, 1/0, true/false, OPEN/CLOSE) は両方の controls_if を必ず生成\n- ★ WiFi 通信 block (websocket_server_* / mqtt_* / http_* / ha_* / ntp_* / ota_*) 使用時は wifi_connect を arduino_setup に必須\n- ★ [BUG-086] register/create block (websocket_server_register WRITE=TRUE / ha_*_create / mqtt_subscribe 等) を emit したら、対応する handler block を同じ ID で必ず同 XML 内に emit。register と handler は 1:1 対応',
  en: 'Rules to apply (BUG-085 + BUG-086 reminder):\n- ★ Every valueInput MUST have a block connected (no hardcoded literals, no relying on generator default fallback)\n- ★ Received-value blocks (websocket_server_received_value, etc.) MUST be nested as <value> children inside their HANDLER, NEVER at top-level\n- ★ Binary branches (ON/OFF, 1/0, true/false, OPEN/CLOSE) MUST emit BOTH controls_if branches\n- ★ When using WiFi blocks (websocket_server_* / mqtt_* / http_* / ha_* / ntp_* / ota_*), wifi_connect MUST be in arduino_setup\n- ★ [BUG-086] When you emit a register/create block (websocket_server_register WRITE=TRUE / ha_*_create / mqtt_subscribe, etc.), you MUST emit the matching handler block with the SAME ID in the same XML. Register and handler are 1:1',
  'zh-TW': '修正所需規則 (BUG-085 + BUG-086 重點重申):\n- ★ 所有 valueInput 必須連接 block (禁止使用 hardcoded literal，禁止依賴 generator default fallback)\n- ★ value 系 received-value 積木 (websocket_server_received_value 等) 僅可作為 HANDLER 內的 <value> 子元素，禁止 top-level 放置\n- ★ 2 值分支 (ON/OFF, 1/0, true/false, OPEN/CLOSE) 必須同時生成兩個 controls_if 分支\n- ★ 使用 WiFi 通訊類積木 (websocket_server_* / mqtt_* / http_* / ha_* / ntp_* / ota_*) 時，wifi_connect 必須放在 arduino_setup 內\n- ★ [BUG-086] emit register/create 積木 (websocket_server_register WRITE=TRUE / ha_*_create / mqtt_subscribe 等) 時，必須在同一 XML 內以相同 ID emit 對應的 handler 積木。register 與 handler 為 1:1 對應',
  es: 'Reglas a aplicar (recordatorio BUG-085 + BUG-086):\n- ★ Cada valueInput DEBE tener un bloque conectado (sin literales hardcoded, sin depender del fallback del generator)\n- ★ Los bloques de valor recibido (websocket_server_received_value, etc.) DEBEN anidarse como hijos <value> dentro de su HANDLER, NUNCA en top-level\n- ★ Las ramas binarias (ON/OFF, 1/0, true/false, OPEN/CLOSE) DEBEN emitir AMBAS ramas controls_if\n- ★ Al usar bloques WiFi (websocket_server_* / mqtt_* / http_* / ha_* / ntp_* / ota_*), wifi_connect DEBE estar en arduino_setup\n- ★ [BUG-086] Al emitir un bloque register/create (websocket_server_register WRITE=TRUE / ha_*_create / mqtt_subscribe, etc.), DEBES emitir el bloque handler correspondiente con el MISMO ID en el mismo XML. Register y handler son 1:1',
  'pt-PT': 'Regras a aplicar (lembrete BUG-085 + BUG-086):\n- ★ Cada valueInput DEVE ter um bloco conectado (sem literais hardcoded, sem depender do fallback do generator)\n- ★ Os blocos de valor recebido (websocket_server_received_value, etc.) DEVEM ser aninhados como filhos <value> dentro do seu HANDLER, NUNCA no top-level\n- ★ Os ramos binários (ON/OFF, 1/0, true/false, OPEN/CLOSE) DEVEM emitir AMBOS os ramos controls_if\n- ★ Ao usar blocos WiFi (websocket_server_* / mqtt_* / http_* / ha_* / ntp_* / ota_*), wifi_connect DEVE estar em arduino_setup\n- ★ [BUG-086] Ao emitir um bloco register/create (websocket_server_register WRITE=TRUE / ha_*_create / mqtt_subscribe, etc.), DEVES emitir o bloco handler correspondente com o MESMO ID no mesmo XML. Register e handler são 1:1',
};

const PREVIOUS_XML_LABEL: Record<AiLanguage, string> = {
  ja: '前回生成された XML (修正対象、これを base に再生成してください)',
  en: 'Previous XML (the target to fix; regenerate based on this)',
  'zh-TW': '上次生成的 XML (待修正，請以此為基礎重新生成)',
  es: 'XML previo (objetivo a corregir; regenera basándote en este)',
  'pt-PT': 'XML anterior (alvo a corrigir; regenera com base neste)',
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function buildFixPrompt(
  previousXml: string,
  issues: ValidationIssue[],
  language: AiLanguage,
): string {
  const intro = FIX_PROMPT_INTRO[language];
  const renderers = ISSUE_RENDERERS[language];
  const rules = RULES_REMINDER[language];
  const previousLabel = PREVIOUS_XML_LABEL[language];

  const issueList = issues
    .map((issue, i) => `${i + 1}. ${renderers[issue.kind](issue)}`)
    .join('\n');

  return `${intro}\n\n${issueList}\n\n${rules}\n\n${previousLabel}:\n${previousXml}`;
}
