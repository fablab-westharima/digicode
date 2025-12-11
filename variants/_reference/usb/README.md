# USB書込み参考コード

**重要:** このディレクトリのコードは、Phase 2（USB実装）時の参考用です。

---

## 目的

Phase 2でUSB書込み機能を実装する際に、既存コードを参考にするために保存しています。

---

## 保存ファイル

| ファイル | 説明 | サイズ |
|---------|------|--------|
| `ConnectionSelector.tsx` | 接続方式選択UI | 1.3KB |
| `serialStore.ts` | シリアル通信ストア（Web Serial API） | 4KB |

**注意:** UsbPortReleaseDialog.tsx, UsbDriverDialog.tsx は既存コードに存在しなかったため保存されていません。

---

## Phase 2実装時の注意

### 用語の定義を確認

👉 **必読:** `prompt/maintenance/04-00_教訓・注意事項(共通項目).md`

**USB書込みとは:**
- **ファームウェア書込み**: DigiCodeOTA.ino（初回のみ）
- **プログラム書込み**: Blocklyで作成したプログラム（Phase 2で実装予定）

### 実装方針（Rule 13）

**統合実装しない:**
- OTA機能と統合しようとしない
- USB専用の完全独立実装
- variants/usb/ に完全分離

**参照:** `prompt/maintenance/04-03_教訓・注意事項(機能実装関連).md` Rule 13

---

## 関連ドキュメント

- `prompt/maintenance/07_接続方式分離計画.md` - Phase 2詳細計画
- `prompt/logs/接続方式分離計画実施/チケット/Phase2_USB実装/` - Phase 2チケット（作成予定）
