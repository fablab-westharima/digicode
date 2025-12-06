import * as Blockly from 'blockly';

// DigiCode カスタムテーマ
export const digiCodeTheme = Blockly.Theme.defineTheme('digicode', {
  name: 'digicode',

  // ブロックのスタイル定義
  blockStyles: {
    logic_blocks: {
      colourPrimary: '#6366f1',    // インディゴ
      colourSecondary: '#818cf8',
      colourTertiary: '#4f46e5',
    },
    loop_blocks: {
      colourPrimary: '#22c55e',    // グリーン
      colourSecondary: '#4ade80',
      colourTertiary: '#16a34a',
    },
    math_blocks: {
      colourPrimary: '#3b82f6',    // ブルー
      colourSecondary: '#60a5fa',
      colourTertiary: '#2563eb',
    },
    text_blocks: {
      colourPrimary: '#14b8a6',    // ティール
      colourSecondary: '#2dd4bf',
      colourTertiary: '#0d9488',
    },
    list_blocks: {
      colourPrimary: '#8b5cf6',    // パープル
      colourSecondary: '#a78bfa',
      colourTertiary: '#7c3aed',
    },
    variable_blocks: {
      colourPrimary: '#f43f5e',    // ローズ
      colourSecondary: '#fb7185',
      colourTertiary: '#e11d48',
    },
    procedure_blocks: {
      colourPrimary: '#ec4899',    // ピンク
      colourSecondary: '#f472b6',
      colourTertiary: '#db2777',
    },
    // ESP32/Arduino カスタムブロック
    otto_blocks: {
      colourPrimary: '#f97316',    // オレンジ
      colourSecondary: '#fb923c',
      colourTertiary: '#ea580c',
    },
    sensor_blocks: {
      colourPrimary: '#06b6d4',    // シアン
      colourSecondary: '#22d3ee',
      colourTertiary: '#0891b2',
    },
    motor_blocks: {
      colourPrimary: '#64748b',    // スレートグレー
      colourSecondary: '#94a3b8',
      colourTertiary: '#475569',
    },
    led_blocks: {
      colourPrimary: '#eab308',    // イエロー
      colourSecondary: '#facc15',
      colourTertiary: '#ca8a04',
    },
    sound_blocks: {
      colourPrimary: '#84cc16',    // ライム
      colourSecondary: '#a3e635',
      colourTertiary: '#65a30d',
    },
  },

  // カテゴリスタイル
  categoryStyles: {
    logic_category: { colour: '#6366f1' },
    loop_category: { colour: '#22c55e' },
    math_category: { colour: '#3b82f6' },
    text_category: { colour: '#14b8a6' },
    list_category: { colour: '#8b5cf6' },
    variable_category: { colour: '#f43f5e' },
    procedure_category: { colour: '#ec4899' },
    otto_category: { colour: '#f97316' },
    sensor_category: { colour: '#06b6d4' },
    motor_category: { colour: '#64748b' },
    led_category: { colour: '#eab308' },
    sound_category: { colour: '#84cc16' },
  },

  // コンポーネントスタイル
  componentStyles: {
    workspaceBackgroundColour: '#fafafa',
    toolboxBackgroundColour: '#f8fafc',
    toolboxForegroundColour: '#1f2937',
    flyoutBackgroundColour: '#ffffff',
    flyoutForegroundColour: '#374151',
    flyoutOpacity: 0.95,
    scrollbarColour: '#cbd5e1',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#6366f1',
    insertionMarkerOpacity: 0.4,
    markerColour: '#6366f1',
    cursorColour: '#6366f1',
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

// DigiCode ダークテーマ
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
    otto_blocks: {
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
    otto_category: { colour: '#fb923c' },
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
