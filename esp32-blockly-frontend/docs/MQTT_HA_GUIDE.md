# MQTT / Home Assistant 連携ガイド

DigiCodeでESP32をHome Assistantと連携させるためのガイドです。

## 目次
1. [概要](#概要)
2. [方式の選択](#方式の選択)
3. [MQTT基本ブロック](#mqtt基本ブロック)
4. [ArduinoHA統合ブロック](#arduinoha統合ブロック)
5. [HTTP/JSONブロック](#httpjsonブロック)
6. [OTA/ESP管理ブロック](#otaesp管理ブロック)
7. [サンプル](#サンプル)

---

## 概要

DigiCodeは2つの方式でHome Assistantと連携できます：

| 方式 | 難易度 | HA側設定 | 特徴 |
|------|--------|----------|------|
| **MQTT基本** | 簡単 | 必要（YAML） | シンプル、柔軟 |
| **ArduinoHA** | 簡単 | 不要（自動） | Auto Discovery対応 |

---

## 方式の選択

### MQTT基本ブロックを使う場合
- HAの設定を細かく制御したい
- 既存のMQTT構成がある
- シンプルな送受信だけしたい

### ArduinoHA統合を使う場合
- HAの設定を自動化したい
- デバイス管理を楽にしたい
- 適切なUIを自動で得たい

---

## MQTT基本ブロック

### 必須ブロック構成

```
[セットアップ]
  ├─ MQTT設定（WiFi SSID/パスワード、ブローカーIP、ポート）
  ├─ MQTTブローカーに接続
  └─ MQTT購読（受信する場合）

[ループ]
  ├─ MQTTループ処理 ← 必須！
  ├─ MQTT送信（送信する場合）
  └─ MQTTメッセージ受信時（受信処理）
```

### ブロック一覧

| ブロック | 説明 |
|---------|------|
| MQTT設定 | WiFi/MQTT接続情報を設定 |
| MQTTブローカーに接続 | ブローカーへ接続（認証あり/なし） |
| MQTT送信 | トピックにメッセージ送信 |
| MQTT購読 | トピックを購読 |
| MQTTメッセージ受信時 | 受信時の処理を定義 |
| MQTTループ処理 | **loop()内で必須** |
| 受信トピック名 | 受信したトピック取得 |
| 受信メッセージ | 受信した内容取得 |
| MQTTが接続中 | 接続状態確認 |

### Home Assistant側設定例

```yaml
# configuration.yaml
mqtt:
  sensor:
    - name: "ESP32 温度"
      state_topic: "home/esp32/temperature"
      unit_of_measurement: "°C"

  switch:
    - name: "ESP32 LED"
      state_topic: "home/esp32/led/state"
      command_topic: "home/esp32/led/set"
```

---

## ArduinoHA統合ブロック

### 自動登録の仕組み

ArduinoHAは **MQTT Auto Discovery** を使用します。
ESP32がブローカーに接続すると、Home Assistantが自動的にデバイスを認識します。

### ブロック構成

```
[セットアップ]
  ├─ HAデバイス初期化
  ├─ HAセンサー登録（温度など）
  ├─ HAスイッチ登録（ON/OFF制御）
  └─ HAスイッチコマンド受信時（処理定義）

[ループ]
  ├─ HAループ処理 ← 必須！
  └─ HAセンサー更新（値送信）
```

### 対応エンティティ

| ブロック | HAエンティティ | 用途 |
|---------|---------------|------|
| HAセンサー | sensor | 温度、湿度、電圧など数値 |
| HAバイナリセンサー | binary_sensor | 人感、ドア開閉などON/OFF |
| HAスイッチ | switch | リレー、LEDなどの制御 |
| HAライト | light | 調光対応LED |
| HAボタン | button | ワンショット操作 |

### デバイスクラス

センサーに適切なデバイスクラスを設定すると、HAが自動で適切なアイコンと単位を設定します。

**温度センサーの例:**
- デバイスクラス: `temperature`
- 単位: `°C`
- → HAで温度計アイコンが自動表示

---

## HTTP/JSONブロック

REST APIとの連携用ブロックです。

### HTTPブロック

| ブロック | 説明 |
|---------|------|
| HTTP GET | URLからデータ取得 |
| HTTP GET（ヘッダー付き） | API Key認証など |
| HTTP POST | データ送信 |
| HTTP POST JSON | JSONデータ送信 |
| HTTP PUT/DELETE | REST API用 |

### JSONブロック

| ブロック | 説明 |
|---------|------|
| JSONパース | 文字列→JSON |
| JSON値取得（文字列/数値/真偽） | キーで値取得 |
| JSONネスト値取得 | `data.items[0].name` 形式 |
| JSON配列サイズ/要素取得 | 配列操作 |
| JSON作成・設定 | JSON生成 |
| JSONを文字列に | JSON→文字列 |

### 使用例：天気API

```
[HTTP GET] URL: "https://api.weather.com/..."
  ↓
[JSONパース]
  ↓
[JSON数値取得] "temperature" → 変数
```

---

## OTA/ESP管理ブロック

### OTAブロック

WiFi経由でファームウェアを更新できます。

| ブロック | 説明 |
|---------|------|
| OTA設定 | WiFi/ホスト名/パスワード設定 |
| 簡易OTA設定 | WiFi接続済みの場合 |
| OTAループ処理 | **loop()内で必須** |

**Arduino IDEからの更新:**
1. ツール → ポート → ネットワークポート → `esp32-ota`
2. 通常通りアップロード

### ESP管理ブロック

| ブロック | 説明 |
|---------|------|
| ESP32を再起動 | ソフトウェアリセット |
| ディープスリープ | 省電力モード（復帰で再起動） |
| ライトスリープ | 省電力モード（復帰で続行） |
| 空きメモリ | ヒープメモリ確認 |
| ESPチップID | ユニークID取得 |

---

## サンプル

### 1. 温度センサー（MQTT基本）

```
[セットアップ]
  MQTT設定: SSID, Password, 192.168.1.100, 1883
  DHT初期化: GPIO4, DHT11
  シリアル通信開始: 115200
  MQTTブローカーに接続

[ループ]
  MQTTループ処理
  もし [MQTTが接続中] なら:
    MQTT送信: "home/esp32/temperature" ← [DHT温度]
    MQTT送信: "home/esp32/humidity" ← [DHT湿度]
  待つ: 10000ms
```

### 2. LED制御（ArduinoHA）

```
[セットアップ]
  HAデバイス初期化: SSID, Password, 192.168.1.100
  ピンモード: GPIO2 → OUTPUT
  HAスイッチ登録: "led", 名前="LED"
  HAスイッチコマンド受信時 "led":
    ONの時: デジタル出力 GPIO2 → HIGH
    OFFの時: デジタル出力 GPIO2 → LOW

[ループ]
  HAループ処理
```

→ Home Assistantに「LED」スイッチが自動登録される

### 3. REST API連携

```
[セットアップ]
  MQTT設定（WiFi接続用）
  シリアル通信開始

[ループ]
  変数 response = [HTTP GET] "https://api.example.com/data"
  [JSONパース] response
  変数 value = [JSON数値取得] "temperature"
  シリアル出力: value
  待つ: 60000ms
```

---

## 必要ライブラリ

コンパイルサーバーには以下がインストール済み：

- **PubSubClient** - MQTT通信
- **home-assistant-integration** - ArduinoHA
- **ArduinoJson** - JSON処理
- **ArduinoOTA** - ESP32コア内蔵

---

## トラブルシューティング

### MQTTに接続できない
1. WiFi SSID/パスワードを確認
2. ブローカーIPが正しいか確認
3. ポート（通常1883）が開いているか確認
4. ブローカーの認証設定を確認

### HAに自動登録されない
1. HAのMQTT統合が有効か確認
2. Discovery prefix が `homeassistant` か確認
3. シリアルモニタでエラーを確認

### JSONパースでエラー
1. バッファサイズを増やす（2048 → 4096）
2. JSON形式が正しいか確認
3. ネストしたキーのパス指定を確認
