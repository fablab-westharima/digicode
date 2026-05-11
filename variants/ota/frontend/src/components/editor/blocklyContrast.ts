/**
 * Blockly block label の WCAG AA contrast 自動判定 + 文字色切替 + 中間色 outline 補強
 *
 * 真因: Blockly stock の `.blocklyText { fill: #fff }` は背景色によらず常に白文字、
 * dark theme primary (#facc15 LED 黄 / #a3e635 sound ライム / #22d3ee sensor cyan 等)
 * の明色 block で白文字 contrast ratio < 2.5 = 視認困難 (BUG-081)。
 *
 * 解: BlockSvg.prototype.applyColour を wrap、background hex から WCAG 2.1 相対輝度
 * 計算 → white/dark の higher contrast 側を選択、両方 4.5:1 未達の中間色帯は outline 補強。
 *
 * Blockly version: 10.4.3 (2026-05-11 時点 stable)
 * upgrade 時: BlockSvg.prototype.applyColour API rename / signature 変更を sync 確認
 * (rule 03 framework isolation soft axis、grep `applyColour` で blockly.min.js 内 5+
 * call site 確認済 = stable)
 */
import * as Blockly from 'blockly';

const DARK_TEXT = '#4b5563';        // Tailwind gray-600 (BUG-081 follow-up #4 で gray-700 → gray-600 にさらに soften、user 指示)
const LIGHT_TEXT = '#ffffff';
const WCAG_AA_NORMAL = 4.5;          // WCAG 2.1 AA normal text threshold (Blockly font 12pt weight 500 = normal)

const CLASS_DARK = 'blockly-text-dark';
const PATCH_FLAG = '__digiCodeContrastPatched';

/** sRGB hex (#RRGGBB) → linear RGB component (0-1) */
function srgbToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance (0-1) for sRGB hex */
export function relativeLuminance(hex: string): number {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) {
    // 不正 hex は黒扱い (Blockly 不整合 block への defensive)
    return 0;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 2.1 contrast ratio between two sRGB hex colors (1.0 - 21.0) */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * 背景 hex から最適な文字色を判定。
 * - white が WCAG AA pass → 白文字
 * - dark が WCAG AA pass → 黒寄り (gray-700) 文字
 * - 両方 fail (中間色帯) → higher contrast 側 (BUG-081 follow-up #2 で outline 補強廃止、
 *   mid-luminance band でも 2 色のうち高い側のみ採択、SVG outline は visual noise との
 *   trade-off で user 不採択)
 */
export function pickTextStyle(bgHex: string): { fill: string } {
  const whiteRatio = contrastRatio(LIGHT_TEXT, bgHex);
  const darkRatio = contrastRatio(DARK_TEXT, bgHex);
  if (whiteRatio >= WCAG_AA_NORMAL) return { fill: LIGHT_TEXT };
  if (darkRatio >= WCAG_AA_NORMAL) return { fill: DARK_TEXT };
  return whiteRatio > darkRatio ? { fill: LIGHT_TEXT } : { fill: DARK_TEXT };
}

/**
 * 単一 block への contrast class 適用 (applyColour patch + workspace listener 双方から呼ばれる)。
 * 内部 helper、export しない。
 */
function applyContrastClass(block: Blockly.BlockSvg): void {
  const root = block.getSvgRoot();
  if (!root) return;
  const colour = block.getColour();
  if (!colour) return;
  const style = pickTextStyle(colour);
  root.classList.toggle(CLASS_DARK, style.fill === DARK_TEXT);
}

/**
 * Blockly.BlockSvg.prototype.applyColour を wrap、block 生成 + colour 変更時に
 * SVG root の class を contrast 判定で toggle。idempotent (二重呼び出し時 no-op)。
 *
 * 適用時機: BlocklyEditor.tsx の `Blockly.inject()` 呼び出し前。
 * 影響: 全 BlockSvg instance (mutator workspace + insertion marker + drag preview 含む)。
 */
export function installContrastTextPatch(): void {
  const proto = Blockly.BlockSvg.prototype as Blockly.BlockSvg & Record<string, unknown>;
  if (proto[PATCH_FLAG]) return;
  const original = proto.applyColour as () => void;
  proto.applyColour = function (this: Blockly.BlockSvg) {
    original.call(this);
    applyContrastClass(this);
  };
  proto[PATCH_FLAG] = true;
}

/**
 * workspace に BLOCK_CREATE / BLOCK_CHANGE listener を attach、applyColour patch
 * の safety net (flyout 経由の dynamic block / xml load / theme 切替後など、
 * applyColour が想定外 path で発火しないケースも cover)。
 *
 * 適用時機: BlocklyEditor.tsx の `Blockly.inject()` 後、対象 workspace + flyout
 * workspace 双方に attach 推奨。
 */
export function attachContrastWorkspaceListener(workspace: Blockly.WorkspaceSvg): void {
  const handler = (event: Blockly.Events.Abstract) => {
    const t = event.type;
    if (t !== Blockly.Events.BLOCK_CREATE && t !== Blockly.Events.BLOCK_CHANGE) return;
    const blockId = (event as Blockly.Events.BlockBase).blockId;
    if (!blockId) return;
    const block = workspace.getBlockById(blockId);
    if (block && typeof (block as Blockly.BlockSvg).getSvgRoot === 'function') {
      applyContrastClass(block as Blockly.BlockSvg);
    }
  };
  workspace.addChangeListener(handler);
  // 既存 block (XML restore / undo など、listener attach 前に存在する block) にも一括適用
  const existing = workspace.getAllBlocks(false);
  existing.forEach((blk) => applyContrastClass(blk as Blockly.BlockSvg));
  // flyout workspace も同様 (toolbox category 開閉で動的に block 生成、applyColour
  // 経路で patch は届くが、theme reload や workspace switch の race 防御として安全網)。
  const flyout = workspace.getFlyout?.(true) ?? null;
  const flyoutWs = flyout && typeof (flyout as { getWorkspace?: () => Blockly.WorkspaceSvg }).getWorkspace === 'function'
    ? (flyout as { getWorkspace: () => Blockly.WorkspaceSvg }).getWorkspace()
    : null;
  if (flyoutWs && flyoutWs !== workspace) {
    flyoutWs.addChangeListener(handler);
    flyoutWs.getAllBlocks(false).forEach((blk) => applyContrastClass(blk as Blockly.BlockSvg));
  }
}

// test 用 export (production code は installContrastTextPatch のみ呼べば OK)
export const __testing__ = {
  PATCH_FLAG,
  CLASS_DARK,
  DARK_TEXT,
  LIGHT_TEXT,
  WCAG_AA_NORMAL,
};
