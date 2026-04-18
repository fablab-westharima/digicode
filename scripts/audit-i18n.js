#!/usr/bin/env node
/**
 * i18n 精密監査スクリプト
 *
 * 目的:
 * - variants/ota/frontend/src 配下のコードで t() 呼び出しキーを全抽出
 * - 抽出キーが 5 言語（ja/en/es/pt-PT/zh-TW）すべてに存在するか検証
 * - defaultValue と ja.json の値の不一致を検出
 * - ハードコード日本語（コメント・t() 内・defaultValue 内を除いた行）を計測
 *
 * 背景（2026-04-19 作成、17.md 参照）:
 * i18n 対応計画の事前調査で、コード側が t('key', { defaultValue: '日本語' }) で
 * キーを呼んでいても、キーが全 5 言語に欠落していれば defaultValue の日本語が
 * 英語モード等で表示される問題が発覚。初期監査（翻訳ファイル同期確認のみ）では
 * この問題を検出できなかったため、本スクリプトで全 Phase 着手前に事前チェックする。
 *
 * Phase 着手前の推奨実行:
 *   node scripts/audit-i18n.js
 *
 * 出力:
 *   サマリは stdout、詳細は /tmp/i18n_audit_report.json
 *
 * 関連ドキュメント:
 *   prompt/maintenance/17_2026-04-19_i18n徹底対応計画.md 方針 9
 *   prompt/maintenance/05-03_教訓・注意事項(機能実装関連).md ルール33
 */

const fs = require('fs');
const path = require('path');

// リポジトリルートからの相対パス（このスクリプトは scripts/ 配下想定）
const REPO_ROOT = path.resolve(__dirname, '..');
const ROOT = path.join(REPO_ROOT, 'variants/ota/frontend/src');
const LOCALE_DIR = path.join(ROOT, 'i18n/locales');
const REPORT_PATH = '/tmp/i18n_audit_report.json';

function flatten(obj, prefix = '') {
  const out = {};
  for (const k of Object.keys(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

// 5 言語の flat key map をロード
const locales = {};
for (const lang of ['ja', 'en', 'es', 'pt-PT', 'zh-TW']) {
  locales[lang] = flatten(JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, lang + '.json'), 'utf-8')));
}

// スキャン対象から除外するパス
// - blocks/: Blockly ブロック定義（Blockly.Msg.* で別系統の多言語化）
// - __tests__/, /test/, .d.ts: テスト・型定義
// - AdminPage: 管理者のみアクセス、スコープ外
// - toolbox 各種: Blockly ツールボックス生成（別議論）
// - i18n/: 翻訳ファイル自体
// - blocklyI18n/Messages: Blockly i18n ヘルパー
const EXCLUDE_PATTERNS = [
  '/blocks/',
  '/__tests__/',
  '/test/',
  '.d.ts',
  '/pages/AdminPage',
  '/components/editor/toolbox.ts',
  '/components/editor/toolboxArduino.ts',
  '/components/editor/toolboxGenerator.ts',
  '/components/editor/toolboxParser.ts',
  '/components/editor/toolboxMicroPython',
  '/components/editor/blocklyTheme.ts',
  '/i18n/',
  '/utils/blocklyI18n.ts',
  '/utils/blocklyMessages.ts',
];

function walk(dir) {
  const results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (EXCLUDE_PATTERNS.some(p => full.includes(p))) continue;
    if (item.isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(item.name) && !item.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(ROOT);
const jpChar = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

// コメント（JSX/JS 両方）を空白化して行番号を保持
function stripCommentsPreserveLines(content) {
  let stripped = content.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  stripped = stripped.replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '));
  stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, ' '));
  return stripped;
}

const report = {};
const allStaticKeys = new Set();

// t('key') / t("key") / t(`key`) + optional { options }
const staticTRegex = /\bt\(\s*(['"`])([\w.-]+?)\1(?:\s*,\s*(\{[\s\S]*?\}))?\s*\)/g;
// t(`${varname}`) のような動的キー
const dynamicTplRegex = /\bt\(\s*`([^`]*\$\{[^`]*\}[^`]*)`/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const rel = file.replace(ROOT + '/', '');

  // 静的 t() 呼び出しを抽出
  const staticCalls = [];
  let m;
  staticTRegex.lastIndex = 0;
  while ((m = staticTRegex.exec(content)) !== null) {
    const key = m[2];
    const optionsBlock = m[3] || '';
    const dvMatch = optionsBlock.match(/defaultValue:\s*(['"`])([\s\S]*?)\1/);
    const lineNum = content.substring(0, m.index).split('\n').length;
    staticCalls.push({ key, defaultValue: dvMatch ? dvMatch[2] : null, line: lineNum });
    allStaticKeys.add(key);
  }

  // 動的キー呼び出し
  const dynTplCalls = [];
  dynamicTplRegex.lastIndex = 0;
  while ((m = dynamicTplRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, m.index).split('\n').length;
    dynTplCalls.push({ template: m[1].substring(0, 60), line: lineNum });
  }

  // ハードコード日本語カウント: コメント・t() 呼び出し全部を空白化してから JP チェック
  const contentNoComments = stripCommentsPreserveLines(content);
  let contentForHC = contentNoComments;
  contentForHC = contentForHC.replace(staticTRegex, (m) => m.replace(/[^\n]/g, ' '));
  contentForHC = contentForHC.replace(/\bt\(\s*`[^`]*\$\{[^}]*\}[^`]*`\s*(?:,\s*\{[\s\S]*?\})?\s*\)/g, (m) => m.replace(/[^\n]/g, ' '));

  const lines = contentForHC.split('\n');
  const origLines = content.split('\n');

  let jpHardcoded = 0;
  const hcSamples = [];
  for (let i = 0; i < lines.length; i++) {
    if (jpChar.test(lines[i])) {
      jpHardcoded++;
      if (hcSamples.length < 8) {
        hcSamples.push({ line: i + 1, content: origLines[i].trim().substring(0, 140) });
      }
    }
  }

  const rawJpLines = origLines.filter(l => jpChar.test(l)).length;

  report[rel] = { staticCalls, dynTplCalls, jpHardcoded, rawJpLines, hcSamples };
}

// キー × 言語のクロスチェック
const keyStatus = {};
for (const key of allStaticKeys) {
  keyStatus[key] = {
    ja: key in locales.ja,
    en: key in locales.en,
    es: key in locales.es,
    'pt-PT': key in locales['pt-PT'],
    'zh-TW': key in locales['zh-TW'],
  };
  keyStatus[key].missingAnywhere = !(
    keyStatus[key].ja && keyStatus[key].en && keyStatus[key].es &&
    keyStatus[key]['pt-PT'] && keyStatus[key]['zh-TW']
  );
}

// defaultValue と ja.json の不一致を検出
const dvMismatch = [];
for (const [file, r] of Object.entries(report)) {
  for (const c of r.staticCalls) {
    if (c.defaultValue && keyStatus[c.key] && keyStatus[c.key].ja) {
      const jaValue = locales.ja[c.key];
      if (typeof jaValue === 'string' && jaValue !== c.defaultValue) {
        dvMismatch.push({ file, key: c.key, line: c.line, codeDefault: c.defaultValue, jaValue });
      }
    }
  }
}

// 集計
let totalHC = 0, totalStatic = 0, totalDynTpl = 0;
for (const r of Object.values(report)) {
  totalHC += r.jpHardcoded;
  totalStatic += r.staticCalls.length;
  totalDynTpl += r.dynTplCalls.length;
}

const keysMissingAnywhere = [...allStaticKeys].filter(k => keyStatus[k].missingAnywhere);
const filesWithHC = Object.values(report).filter(r => r.jpHardcoded > 0).length;

console.log('===== i18n 精密監査サマリ =====');
console.log('Scanned files:                ' + files.length);
console.log('Files with hardcoded JP:      ' + filesWithHC);
console.log('Total t() static calls:       ' + totalStatic);
console.log('Total dyn tpl calls:          ' + totalDynTpl);
console.log('Unique static keys in code:   ' + allStaticKeys.size);
console.log('Hardcoded JP lines (real):    ' + totalHC);
console.log('Keys missing in 1+ language:  ' + keysMissingAnywhere.length);
console.log('defaultValue mismatches:      ' + dvMismatch.length);

fs.writeFileSync(REPORT_PATH, JSON.stringify({
  summary: {
    totalFiles: files.length, filesWithHC,
    totalStatic, totalDynTpl,
    totalUniqKeys: allStaticKeys.size,
    totalHC,
    keysMissingAnywhereCount: keysMissingAnywhere.length,
    dvMismatchCount: dvMismatch.length,
  },
  filesByHC: Object.entries(report)
    .filter(([_, r]) => r.jpHardcoded > 0)
    .sort((a, b) => b[1].jpHardcoded - a[1].jpHardcoded)
    .map(([f, r]) => ({
      file: f, hc: r.jpHardcoded, raw: r.rawJpLines,
      tCalls: r.staticCalls.length, dynTpl: r.dynTplCalls.length,
      samples: r.hcSamples,
    })),
  keysMissingAnywhere: keysMissingAnywhere.map(k => ({
    key: k, ...keyStatus[k]
  })),
  dvMismatch,
}, null, 2));

console.log();
console.log('詳細レポート: ' + REPORT_PATH);
