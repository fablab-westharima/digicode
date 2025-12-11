# プログラム書き込み_RP2040系

**最終更新:** 2025-12-06

> **用語の定義:** このドキュメントで使用する「ファームウェア初期書き込み」と「プログラム書き込み」の定義については、[プログラム書き込み_共通手順](./01-program-setup-common.md) の「用語の定義」セクションをご参照ください。

---

## 対応ボード

- Raspberry Pi Pico
- Pimoroni Tiny 2040
- その他RP2040搭載ボード

---

## RP2040の特徴

RP2040は、Raspberry Pi Foundationが開発した低コストのマイコン。以下の特徴があります：

- **ブートローダー:** ROMに固定（常に起動可能）
- **接続方法:** USB（バーチャルシリアルポート）のみ
- **書き込み形式:** UF2形式（USB Flashing Format）
- **特別な準備:** なし（ボートローダーは常に利用可能）

---

## 書き込み手順（USB接続）

### 準備

1. **ブートモードに入る**
   - パソコンから RP2040 をいったん外す
   - RP2040 の BOOTSEL ボタンを押しながら パソコンに接続
   - `RPI-RP2` という名前のストレージが現れる

   ```bash
   # Macの場合、以下で確認
   ls /Volumes/
   ```

   出力例:
   ```
   Macintosh HD
   RPI-RP2
   ```

   Windows の場合は `エクスプローラー` で `RPI-RP2` ドライブが見える

2. **DigiCode で UF2 ファイルを生成**
   - [DigiCode](https://digicode-frontend.pages.dev) にアクセス
   - ログイン
   - ボード選択: **RP2040** を選択
   - 言語: **MicroPython** を選択（Arduino C++は RP2040 未対応）
   - プログラムを作成（Blockly で ブロックを配置）
   - **コンパイル** ボタンをクリック
   - **ダウンロード** ボタンが表示される → クリック
   - `*.uf2` ファイルがダウンロードされる

3. **RP2040 に UF2 ファイルをコピー**
   ```bash
   # Macの場合
   cp ~/Downloads/*.uf2 /Volumes/RPI-RP2/

   # Linuxの場合
   cp ~/Downloads/*.uf2 /media/<ユーザー名>/RPI-RP2/
   ```

   Windows の場合は エクスプローラーで `RPI-RP2` ドライブにドラッグ&ドロップ

4. **書き込み完了**
   - コピー後、RP2040 が自動的にリセット
   - `RPI-RP2` ドライブが消える（プログラムが実行開始）
   - シリアルモニタで出力を確認できます

---

## シリアルモニタで動作確認

RP2040 のプログラム実行結果をシリアルモニタで確認できます。

### Arduino IDE を使う場合

1. Arduino IDE を開く
2. **ツール → ボード** から **Raspberry Pi Pico** を選択
3. **ツール → シリアルポート** から RP2040 のポート選択
4. **ツール → シリアルモニタ** を開く

### コマンドラインでの確認

```bash
# Macの場合
ls -la /dev/tty.usbmodem*
screen /dev/tty.usbmodem12301 115200

# Linuxの場合
ls -la /dev/ttyACM*
screen /dev/ttyACM0 115200

# Windowsの場合（PowerShell）
Get-WmiObject Win32_SerialPort
```

終了: `Ctrl+A` → `Ctrl+X`（GNU screen）

---

## ブートモードが反応しない場合

### 確認手順

1. **ボード上の LED を確認**
   - LED が点灯/点滅している → ファームウェアが実行中
   - LED が消えている → ブートモード待機中

2. **BOOTSEL ボタン位置を確認**
   - Raspberry Pi Pico: ボード上部の黒いボタン
   - Pimoroni Tiny 2040: 小さいボタン（拡大鏡で確認）

3. **リセットして再度試す**
   ```bash
   # RP2040 を外して 3秒待機
   # BOOTSEL を押しながら接続
   ```

### RP2040 がまったく反応しない場合

1. **USB ケーブルを変更**
   - データ転送対応の高品質ケーブルを試す
   - 充電専用ケーブルではなくデータ転送対応を確認

2. **別のパソコンで試す**
   - 別の環境で試してブートモードに入るか確認

3. **UF2 の再ダウンロード**
   - DigiCode で新しく UF2 ファイルを生成

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| RPI-RP2 ドライブが表示されない | BOOTSEL ボタンが押されていない | ボタンを長押ししながら接続 |
| UF2 コピー後にボード反応なし | UF2 ファイル破損 | ダウンロード再試行 |
| シリアル出力が見えない | ボーレート設定ミス | 115200 bps 確認 |
| 何度試してもブートモード不可 | ハードウェア故障 | 別の RP2040 を試す |

---

## 参考リンク

- [Raspberry Pi Pico 公式ドキュメント](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html)
- [MicroPython on Raspberry Pi Pico](https://micropython.org/download/#rp2)
- [UF2 フォーマット](https://github.com/microsoft/uf2)

---

## 次のステップ

- [プログラム書き込み_共通手順](./01_プログラム書き込み_共通手順.md) に戻る
- [Arduino系の書き込み手順](./03_プログラム書き込み_Arduino.md) を確認
- [ESP32系の書き込み手順](./04_プログラム書き込み_ESP32.md) を確認
