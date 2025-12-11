# OTA設定ガイド

**最終更新:** 2025-12-06

> **用語の定義:** このドキュメントで使用する「ファームウェア初期書き込み」と「プログラム書き込み」の定義については、[プログラム書き込み_共通手順](./01-program-setup-common.md) の「用語の定義」セクションをご参照ください。

---

## はじめに

OTA (Over-The-Air) 書き込みは、WiFi を経由して ESP32 にプログラムを書き込む方法です。一度ファームウェアが書き込まれていれば、USB ケーブルなしに WiFi だけで更新できます。

本ガイドでは、OTA 書き込みに必要な事前設定と実行手順を説明します。

---

## OTA の利点と制限

### 利点
- USB ケーブルが不要（WiFi だけ）
- 複数台を同時に更新可能
- 現場での更新が容易

### 制限
- 初回はファームウェアを USB で書き込む必要がある
- WiFi 接続が必須
- 書き込み中の停電は危険（ブートローダーのみ起動可能）

---

## 前提条件

1. **ファームウェアが既に書き込まれている**
   - USB 有線で初回ファームウェア書き込み済み
   - [プログラム書き込み_ESP32](./04_プログラム書き込み_ESP32.md) の「方法 1: USB 有線接続」を参照

2. **WiFi ルータが利用可能**
   - ESP32 が接続可能な WiFi ネットワーク

3. **ap 名（SSID）とデバイス名を設定**
   - 本ガイド内で設定方法を説明

---

## ステップ 1: ファームウェアの初期化と WiFi 設定

### USB 有線で初回ファームウェア書き込み

1. **USB ケーブルで接続**
   ```bash
   ls -la /dev/tty.usbserial*
   ```

2. **DigiCode で ファームウェアを生成して書き込み**
   ```bash
   esptool.py -p /dev/tty.usbserial-14101 -b 460800 write_flash 0x1000 firmware.bin
   ```

3. **シリアルモニタで確認**
   ```bash
   screen /dev/tty.usbserial-14101 115200
   ```

   ファームウェアが起動し、以下のようなログが表示される：
   ```
   DigiCode Bootloader v1.0
   Initializing WiFi...
   WiFi not configured. Enter setup mode.
   ```

### WiFi 設定の入力

ファームウェアが初期化中の場合、シリアルコンソールから AP (WiFi) の設定が可能です。

**シリアルコンソールでの対話:**

```
Enter WiFi SSID: MyWiFiNetwork
Enter WiFi Password: MyPassword123
Device Name: esp32-robot-001

Configuration saved!
Connecting to WiFi...
WiFi Connected!
IP: 192.168.1.100
mDNS: esp32-robot-001.local
OTA Ready: http://192.168.1.100/ota
```

**設定内容の保存:**
- AP (SSID) と パスワードは EEPROM に保存される
- デバイス名も EEPROM に保存される

---

## ステップ 2: デバイス名の確認と変更

### デバイス名の確認

シリアルモニタで起動ログを確認：

```
Device Name: esp32-robot-001
mDNS: esp32-robot-001.local
```

### デバイス名の変更

**USB 経由で変更（シリアルコンソール）:**

```bash
# シリアルコンソールで以下を入力
set_device_name esp32-robot-002

# 確認
get_device_name
```

**Web インターフェース経由で変更（WiFi 接続後）:**

```bash
# ブラウザで以下にアクセス
http://192.168.1.100/api/config/device

# レスポンス例
{
  "device_name": "esp32-robot-001",
  "ap": "MyWiFiNetwork",
  "ip": "192.168.1.100"
}
```

### デバイス名の命名規則（推奨）

```
esp32-[用途]-[識別番号]

例:
- esp32-robot-001
- esp32-sensor-lab-a
- esp32-test-device
- esp32-class-002
```

---

## ステップ 3: mDNS による検出確認

### 単一デバイスの確認

```bash
# デバイスの mDNS ホスト名から IP を解決
ping esp32-robot-001.local

# 出力例
PING esp32-robot-001.local (192.168.1.100): 56 data bytes
64 bytes from 192.168.1.100: icmp_seq=0 ttl=64 time=2.345 ms
```

### ネットワーク内の全デバイスをスキャン

```bash
# 全 DigiCode デバイスを検出
dns-sd -B _digicode._tcp local.

# 出力例
Browsing for _digicode._tcp
DATE TIME  Start
DATE TIME  ..
DATE TIME  Instance "esp32-robot-001" in domain local
DATE TIME  Instance "esp32-robot-002" in domain local
DATE TIME  Instance "esp32-robot-003" in domain local
```

---

## ステップ 4: 単一デバイスへの OTA 書き込み

### 準備

1. **DigiCode でバイナリを生成**
   - [DigiCode](https://digicode-frontend.pages.dev) でプログラムをコンパイル
   - `firmware.bin` をダウンロード

2. **デバイスの IP アドレスを確認**
   ```bash
   ping esp32-robot-001.local
   # 192.168.1.100 が応答
   ```

### OTA 書き込み実行

```bash
# esptool.py で OTA 書き込み
esptool.py --chip esp32 -p OTA -h 192.168.1.100 write_flash 0x1000 firmware.bin

# または mDNS ホスト名で指定
esptool.py --chip esp32 -p OTA -h esp32-robot-001.local write_flash 0x1000 firmware.bin
```

**出力例:**
```
Connecting OTA device esp32-robot-001.local...
Connected!
Writing flash...
Compressed 50 bytes to 33...
Wrote 50 bytes (33 compressed) at 0x00001000 in 0.1 seconds
Leaving...
```

書き込み後、ESP32 が自動的にリセットしてプログラムが実行開始。

---

## ステップ 5: 複数デバイスへの一括 OTA 書き込み

### スクリプトで一括書き込み

**bash スクリプト例:**

```bash
#!/bin/bash

# 書き込み対象デバイス一覧
DEVICES=(
  "esp32-robot-001"
  "esp32-robot-002"
  "esp32-robot-003"
)

FIRMWARE="firmware.bin"
SUCCESS_COUNT=0
FAIL_COUNT=0

echo "=== OTA 一括書き込み開始 ==="
echo "対象デバイス数: ${#DEVICES[@]}"
echo ""

for device in "${DEVICES[@]}"; do
  echo "書き込み中: $device"

  # mDNS で IP アドレスを解決
  ip=$(ping -c1 -t1 "$device.local" 2>/dev/null | grep -oP '\d+\.\d+\.\d+\.\d+' | head -1)

  if [ -z "$ip" ]; then
    echo "  ✗ デバイスが見つかりません"
    ((FAIL_COUNT++))
    continue
  fi

  echo "  IP: $ip"

  # OTA 書き込み実行
  if esptool.py --chip esp32 -p OTA -h "$ip" write_flash 0x1000 "$FIRMWARE" 2>/dev/null; then
    echo "  ✓ 書き込み成功"
    ((SUCCESS_COUNT++))
  else
    echo "  ✗ 書き込み失敗"
    ((FAIL_COUNT++))
  fi

  echo ""
  sleep 2  # デバイスの復帰待機
done

echo "=== 一括書き込み完了 ==="
echo "成功: $SUCCESS_COUNT 台"
echo "失敗: $FAIL_COUNT 台"
```

**使用方法:**

```bash
# スクリプト保存
cat > ota_batch.sh << 'EOF'
[上記スクリプトを貼り付け]
EOF

# 実行権限付与
chmod +x ota_batch.sh

# 実行
./ota_batch.sh
```

### Python スクリプト例

```python
#!/usr/bin/env python3

import subprocess
import socket
import time
from datetime import datetime

DEVICES = [
    "esp32-robot-001",
    "esp32-robot-002",
    "esp32-robot-003",
]

FIRMWARE = "firmware.bin"

def resolve_hostname(hostname):
    """ホスト名から IP アドレスを解決"""
    try:
        return socket.gethostbyname(hostname + ".local")
    except socket.gaierror:
        return None

def ota_write(ip, firmware):
    """OTA 書き込みを実行"""
    cmd = [
        "esptool.py",
        "--chip", "esp32",
        "-p", "OTA",
        "-h", ip,
        "write_flash",
        "0x1000", firmware
    ]
    return subprocess.call(cmd) == 0

def main():
    print("=== OTA 一括書き込み開始 ===")
    print(f"対象デバイス数: {len(DEVICES)}")
    print(f"ファームウェア: {FIRMWARE}")
    print(f"開始時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    success_count = 0
    fail_count = 0

    for device in DEVICES:
        print(f"書き込み中: {device}")

        # IP アドレス解決
        ip = resolve_hostname(device)
        if not ip:
            print(f"  ✗ デバイスが見つかりません")
            fail_count += 1
            continue

        print(f"  IP: {ip}")

        # OTA 書き込み
        if ota_write(ip, FIRMWARE):
            print(f"  ✓ 書き込み成功")
            success_count += 1
        else:
            print(f"  ✗ 書き込み失敗")
            fail_count += 1

        print()
        time.sleep(2)

    print("=== 一括書き込み完了 ===")
    print(f"成功: {success_count} 台")
    print(f"失敗: {fail_count} 台")
    print(f"終了時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
```

**使用方法:**

```bash
# スクリプト保存
cat > ota_batch.py << 'EOF'
[上記スクリプトを貼り付け]
EOF

# 実行権限付与
chmod +x ota_batch.py

# 実行
python3 ota_batch.py
```

---

## OTA トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `Connection refused` | デバイスがネットワークにない | 有線USB で確認、WiFi 設定再実行 |
| `dns-sd` で検出されない | mDNS 未対応ファームウェア | USB で正式ファームウェア再書き込み |
| 書き込み途中で失敗 | WiFi 接続不安定 | ルータ近くに移動、別チャネル試す |
| デバイスが応答しない | OTA 中に停電 | USB 有線でブートローダーモード復旧 |

---

## WiFi 接続トラブル

### WiFi 設定を忘れた場合

```bash
# USB で シリアルコンソール接続
screen /dev/tty.usbserial-14101 115200

# コンソールで設定リセット
reset_wifi

# WiFi 設定をやり直し
Enter WiFi SSID: ...
```

### 特定のチャネルのみ使用したい場合

```bash
# シリアルコンソールで指定
set_wifi_channel 6  # 2.4GHz Channel 6

# または DigiCode Web で設定
```

---

## セキュリティに関する注意

⚠️ **重要:**

- **デフォルトパスワードを変更**してください
- OTA エンドポイント (`/ota`) は認証保護されていません
- 信頼できるネットワークのみで使用してください
- 本番環境では VPN や IP ホワイトリストを推奨

---

## 参考リンク

- [ESP-IDF OTA 更新](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/ota.html)
- [esptool.py OTA オプション](https://github.com/espressif/esptool#remote-connections-via-ota)
- [mDNS について](https://en.wikipedia.org/wiki/Multicast_DNS)

---

## 次のステップ

- [プログラム書き込み_共通手順](./01_プログラム書き込み_共通手順.md) に戻る
- [プログラム書き込み_ESP32](./04_プログラム書き込み_ESP32.md) を確認
