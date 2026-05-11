import * as Blockly from 'blockly';

// DigiCode ダークテーマ
// 旧 light theme (`digiCodeTheme`) は第101回 BUG-081 fix で削除済 = 参照ゼロ確認 (grep
// `digiCodeTheme\b` 全 src 結果 = 定義 1 件のみ、参照 0)。将来 light theme 復活時は
// 新規設計で再起こす方が当時 user input 反映できて健全 (rule 06 dead code removal、
// memory:reactive_vs_systematic 適用)。
export const digiCodeDarkTheme = Blockly.Theme.defineTheme('digicode-dark', {
  name: 'digicode-dark',

  // ブロックのスタイル定義（ダークモード用 - より鮮やかな色）
  blockStyles: {
    logic_blocks: {
      colourPrimary: '#818cf8',    // インディゴ（明るめ）
      colourSecondary: '#a5b4fc',
      colourTertiary: '#6366f1',
    },
    loop_blocks: {
      colourPrimary: '#4ade80',    // グリーン（明るめ）
      colourSecondary: '#86efac',
      colourTertiary: '#22c55e',
    },
    math_blocks: {
      colourPrimary: '#60a5fa',    // ブルー（明るめ）
      colourSecondary: '#93c5fd',
      colourTertiary: '#3b82f6',
    },
    text_blocks: {
      colourPrimary: '#2dd4bf',    // ティール（明るめ）
      colourSecondary: '#5eead4',
      colourTertiary: '#14b8a6',
    },
    list_blocks: {
      colourPrimary: '#a78bfa',    // パープル（明るめ）
      colourSecondary: '#c4b5fd',
      colourTertiary: '#8b5cf6',
    },
    variable_blocks: {
      colourPrimary: '#fb7185',    // ローズ（明るめ）
      colourSecondary: '#fda4af',
      colourTertiary: '#f43f5e',
    },
    procedure_blocks: {
      colourPrimary: '#f472b6',    // ピンク（明るめ）
      colourSecondary: '#f9a8d4',
      colourTertiary: '#ec4899',
    },
    // ESP32/Arduino カスタムブロック
    robot_blocks: {
      colourPrimary: '#fb923c',    // オレンジ（明るめ）
      colourSecondary: '#fdba74',
      colourTertiary: '#f97316',
    },
    sensor_blocks: {
      colourPrimary: '#22d3ee',    // シアン（明るめ）
      colourSecondary: '#67e8f9',
      colourTertiary: '#06b6d4',
    },
    motor_blocks: {
      colourPrimary: '#94a3b8',    // スレートグレー（明るめ）
      colourSecondary: '#cbd5e1',
      colourTertiary: '#64748b',
    },
    led_blocks: {
      colourPrimary: '#facc15',    // イエロー（明るめ）
      colourSecondary: '#fde047',
      colourTertiary: '#eab308',
    },
    sound_blocks: {
      colourPrimary: '#a3e635',    // ライム（明るめ）
      colourSecondary: '#bef264',
      colourTertiary: '#84cc16',
    },
  },

  // カテゴリスタイル
  categoryStyles: {
    logic_category: { colour: '#818cf8' },
    loop_category: { colour: '#4ade80' },
    math_category: { colour: '#60a5fa' },
    text_category: { colour: '#2dd4bf' },
    list_category: { colour: '#a78bfa' },
    variable_category: { colour: '#fb7185' },
    procedure_category: { colour: '#f472b6' },
    robot_category: { colour: '#fb923c' },
    sensor_category: { colour: '#22d3ee' },
    motor_category: { colour: '#94a3b8' },
    led_category: { colour: '#facc15' },
    sound_category: { colour: '#a3e635' },
  },

  // コンポーネントスタイル（ダークモード）
  componentStyles: {
    workspaceBackgroundColour: '#1a1a1a',
    toolboxBackgroundColour: '#1C1F26',
    toolboxForegroundColour: '#E6EDF3',
    flyoutBackgroundColour: '#252930',
    flyoutForegroundColour: '#E6EDF3',
    flyoutOpacity: 0.98,
    scrollbarColour: '#4a5568',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#818cf8',
    insertionMarkerOpacity: 0.5,
    markerColour: '#818cf8',
    cursorColour: '#818cf8',
  },

  // フォントスタイル
  fontStyle: {
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    weight: '500',
    size: 12,
  },

  // ブロックの角丸を有効化
  startHats: true,
});

// BUG-081 contrast fix: blocklyContrast.ts の installContrastTextPatch が
// BlockSvg.applyColour wrap で .blockly-text-dark を toggle、本 CSS が文字色を適用。
//
// Specificity 戦略 (BUG-081 follow-up #3): zelos renderer は theme 名から auto-register する
// `.zelos-renderer.digicode-dark-theme .blocklyText { fill: #fff }` (3-class specificity) で
// 全 block label を白固定。素朴な `.blockly-text-dark .blocklyText` (2-class) では負ける。
// 4-class compound selector (`.injectionDiv.zelos-renderer` で 2-class + descendant 2-class)
// で stock を outright override (cascade 順や `!important` に依存しない)。
//
// JSDOM 検証で全 blocklyText fill rule を列挙確認、本 selector 以外で .blocklyText に
// 適用される 4-class 以上の rule は `.blocklyText.blocklyBubbleText` (bubble 専用、競合なし)
// のみ = 本 fix が確実 win することを実証済 (改定log 第101回 follow-up #3 §証拠)。
Blockly.Css.register('.injectionDiv.zelos-renderer .blockly-text-dark .blocklyText { fill: #4b5563; }');
