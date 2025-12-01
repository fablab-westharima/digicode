# ブロック追加ガイド

DigiCodeに新しいブロックを追加する方法を説明します。

## 目次

1. [ブロックの構造](#ブロックの構造)
2. [ブロック定義の作成](#ブロック定義の作成)
3. [コードジェネレーターの実装](#コードジェネレーターの実装)
4. [ツールボックスへの追加](#ツールボックスへの追加)
5. [テストの作成](#テストの作成)
6. [ベストプラクティス](#ベストプラクティス)

---

## ブロックの構造

DigiCodeのブロックは以下の3つの要素で構成されます：

```
ブロック
├── 1. ブロック定義 (Blockly.Blocks[])
│   └── UI、入力フィールド、接続形状を定義
├── 2. Arduino C++ ジェネレーター (javascriptGenerator)
│   └── Arduino C++コードを生成
└── 3. MicroPython ジェネレーター (pythonGenerator)
    └── MicroPythonコードを生成
```

## ブロック定義の作成

### 基本的なブロック定義

```typescript
// src/blocks/arduino/sensor/mySensorBlocks.ts

import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';

// 型定義
const generator = javascriptGenerator as any;
const pyGen = pythonGenerator as any;

// ブロックの色（カテゴリ別に統一）
const SENSOR_COLOR = '#FF9800';  // オレンジ（センサー）

// ブロック定義
Blockly.Blocks['my_sensor_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔧 センサー初期化')
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(4, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);  // 上に接続可能
    this.setNextStatement(true, null);       // 下に接続可能
    this.setColour(SENSOR_COLOR);
    this.setTooltip('センサーを初期化します');
    this.setHelpUrl('');
  }
};
```

### 入力フィールドの種類

| フィールド | 用途 | 例 |
|-----------|------|-----|
| `FieldNumber` | 数値入力 | ピン番号、角度 |
| `FieldDropdown` | 選択肢 | モード、方向 |
| `FieldTextInput` | テキスト | 変数名 |
| `FieldCheckbox` | チェック | ON/OFF |
| `FieldAngle` | 角度（ダイヤル） | サーボ角度 |
| `FieldColour` | 色選択 | LED色 |

### 接続タイプ

```typescript
// 文ブロック（上下に接続）
this.setPreviousStatement(true, null);
this.setNextStatement(true, null);

// 値ブロック（出力あり）
this.setOutput(true, 'Number');  // 数値を出力
this.setOutput(true, 'Boolean'); // 真偽値を出力
this.setOutput(true, 'String');  // 文字列を出力
this.setOutput(true, null);      // 任意の型

// 入力を受け取る
this.appendValueInput('VALUE')
    .setCheck('Number')  // 数値のみ受け付け
    .appendField('値');
```

---

## コードジェネレーターの実装

### Arduino C++ ジェネレーター

```typescript
javascriptGenerator.forBlock['my_sensor_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  // グローバル定義（#include, 変数宣言）
  generator.definitions_['include_my_sensor'] = '#include <MySensor.h>';
  generator.definitions_['my_sensor_instance'] =
    `MySensor mySensor(${pin});`;

  // setup()内の初期化コード
  generator.setups_['my_sensor_begin'] = '  mySensor.begin();';

  // loop()内のコード（この場合は空）
  return '';
};

// 値を返すブロック
javascriptGenerator.forBlock['my_sensor_read'] = function(block: Blockly.Block) {
  const code = 'mySensor.read()';
  return [code, Order.FUNCTION_CALL];
};
```

### MicroPython ジェネレーター

```typescript
pythonGenerator.forBlock['my_sensor_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  // インポート文
  pyGen.definitions_['import_my_sensor'] = 'from machine import Pin';

  // グローバル変数
  pyGen.definitions_['my_sensor_instance'] =
    `my_sensor = Pin(${pin}, Pin.IN)`;

  return '';
};

pythonGenerator.forBlock['my_sensor_read'] = function(block: Blockly.Block) {
  const code = 'my_sensor.value()';
  return [code, pyGen.ORDER_FUNCTION_CALL];
};
```

### 演算子の優先順位

Arduino C++ (`Order`):
- `Order.ATOMIC` - 最高優先度（括弧不要）
- `Order.FUNCTION_CALL` - 関数呼び出し
- `Order.UNARY_NEGATION` - 単項マイナス
- `Order.MULTIPLICATION` - 乗算・除算
- `Order.ADDITION` - 加算・減算

MicroPython (`pyGen.ORDER_*`):
- 同様の優先順位定数

---

## ツールボックスへの追加

### ツールボックス定義の編集

```typescript
// src/config/toolbox.ts

export const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    // ... 既存のカテゴリ
    {
      kind: 'category',
      name: 'マイセンサー',
      colour: '#FF9800',
      contents: [
        {
          kind: 'block',
          type: 'my_sensor_init',
          inputs: {
            PIN: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 4 }
              }
            }
          }
        },
        {
          kind: 'block',
          type: 'my_sensor_read'
        }
      ]
    }
  ]
};
```

### ブロックのインポート

```typescript
// src/blocks/index.ts

// 新しいブロックファイルをインポート
import './arduino/sensor/mySensorBlocks';
```

---

## テストの作成

### ブロック定義のテスト

```typescript
// src/blocks/__tests__/mySensorBlocks.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import * as Blockly from 'blockly';
import '../arduino/sensor/mySensorBlocks';

describe('MySensor Blocks', () => {
  beforeAll(() => {
    // Blocklyの初期化
  });

  it('my_sensor_init ブロックが定義されている', () => {
    expect(Blockly.Blocks['my_sensor_init']).toBeDefined();
  });

  it('my_sensor_read ブロックが定義されている', () => {
    expect(Blockly.Blocks['my_sensor_read']).toBeDefined();
  });
});
```

### コード生成のテスト

```typescript
import { javascriptGenerator } from 'blockly/javascript';

describe('MySensor Code Generation', () => {
  it('正しいArduinoコードを生成する', () => {
    // ワークスペースとブロックを作成
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('my_sensor_init');
    block.setFieldValue('18', 'PIN');

    // コード生成
    const code = javascriptGenerator.blockToCode(block);

    // 検証
    expect(code).toContain('MySensor');
  });
});
```

---

## ベストプラクティス

### 1. 命名規則

```typescript
// ブロック名: カテゴリ_機能_アクション
'sensor_ultrasonic_init'     // センサー_超音波_初期化
'motor_dc_forward'           // モーター_DC_前進
'display_oled_text'          // 表示_OLED_テキスト
```

### 2. 色の統一

| カテゴリ | 色 | HEX |
|---------|-----|-----|
| 基本 | 青 | #4A90D9 |
| センサー | オレンジ | #FF9800 |
| アクチュエーター | 緑 | #4CAF50 |
| 表示 | 紫 | #9C27B0 |
| ロボット | 赤 | #E91E63 |
| オーディオ | シアン | #00BCD4 |

### 3. ピン設定の連携

```typescript
import { getSensorPins } from '../../../utils/pinHelper';

Blockly.Blocks['my_sensor_init'] = {
  init: function() {
    const pins = getSensorPins();  // プリセットからピン取得
    this.appendDummyInput()
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(pins.myPin, 0, 39), 'PIN');
    // ...
  }
};
```

### 4. 国際化対応（将来）

```typescript
// 将来的にはBlockly.Msg を使用
this.appendDummyInput()
    .appendField(Blockly.Msg['MY_SENSOR_INIT'] || 'センサー初期化');
```

### 5. エラーハンドリング

```typescript
javascriptGenerator.forBlock['my_sensor_read'] = function(block: Blockly.Block) {
  // 初期化チェック用のコメントを生成
  generator.definitions_['my_sensor_check'] =
    '// Note: my_sensor_init must be called before reading';

  const code = 'mySensor.read()';
  return [code, Order.FUNCTION_CALL];
};
```

---

## チェックリスト

新しいブロックを追加する際のチェックリスト：

- [ ] ブロック定義を作成
- [ ] Arduino C++ ジェネレーターを実装
- [ ] MicroPython ジェネレーターを実装
- [ ] ツールボックスに追加
- [ ] ブロックファイルをインポート
- [ ] 動作確認（両言語）
- [ ] テストを作成
- [ ] ドキュメントを更新（block-reference.md）

---

## 関連ドキュメント

- [アーキテクチャ概要](./architecture.md)
- [API リファレンス](./api-reference.md)
- [ブロックリファレンス](../block-reference.md)
