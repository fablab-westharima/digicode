# shared/ - 全variant共通コンポーネント

このディレクトリには、OTA/USB/Bluetooth全variantで共通して使用するコンポーネントを配置します。

---

## ディレクトリ構成

```
shared/
├── blockly/           # Blocklyコア（ブロック定義、コード生成）
│   ├── blocks/        # ブロック定義
│   ├── generators/    # コード生成ロジック
│   └── config/        # Toolbox設定
├── components/
│   ├── editor/        # エディタコンポーネント
│   │   ├── BlocklyEditor.tsx
│   │   └── CodePreview.tsx
│   └── ui/            # shadcn/ui 共通UIコンポーネント
├── pages/             # 全variant共通ページ
│   ├── ProjectsPage.tsx
│   ├── PinSettingsPage.tsx
│   ├── DocsPage.tsx
│   └── CompileServerSettingsPage.tsx
├── services/          # 共通サービス
│   └── compileService.ts    # Arduino CLI呼び出し
└── stores/            # 共通ストア
    ├── projectStore.ts      # プロジェクト管理
    └── boardStore.ts        # ボード設定
```

---

## 使用方法

各variantから以下のようにimportします：

```typescript
// variants/ota/frontend/src/pages/EditorPage.tsx
import { BlocklyEditor } from '@/shared/components/editor/BlocklyEditor';
import { CodePreview } from '@/shared/components/editor/CodePreview';
import { useProjectStore } from '@/shared/stores/projectStore';
```

---

## 注意事項

- **variant固有の機能は含めない**
- OTA/USB/Bluetooth共通で使える機能のみ配置
- 変更時は全variantへの影響を確認すること
