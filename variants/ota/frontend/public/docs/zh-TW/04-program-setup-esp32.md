# 程式燒錄 — ESP32 系列

**最後更新:** 2026-05-02

本頁依方式整理 ESP32 系列開發板的程式燒錄手順 (USB / WiFi OTA / BLE / 本地編譯)。

---

## 🚀 USB 燒錄 — 5 步驟

最可靠,初學者推薦。約 30 秒完成。

1. **透過 USB 線 (支援資料傳輸) 將 ESP32 連接到電腦**
2. 在積木編輯器中建立程式 (或載入範例)
3. 右上的 **「燒錄」** 按鈕 → 選擇 **「USB」**
4. 在瀏覽器的序列埠選擇對話框中選擇 ESP32 的埠
5. 燒錄完成後,ESP32 自動重新啟動 ✅

> 💡 **若埠未顯示,請安裝 USB 驅動程式 (CP2102 / CH340) 並重新啟動電腦** ([詳細](#安裝-usb-驅動程式))。

---

## 支援的開發板

| 開發板 | USB | WiFi OTA | BLE | 備註 |
|---|:---:|:---:|:---:|---|
| ESP32 (無印) | ○ | ○ | ○ | 最普通 |
| ESP32-S3 | ○ | ○ | ○ | 高效能、AI 擴展 |
| ESP32-C3 | ○ | ○ | ○ | RISC-V、低功耗 |
| ESP32-C6 | ○ | ○ | ○ | 支援 Matter |
| M5Stack Basic / Gray / Fire | ○ | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | ○ | 小巧 |
| ATOM Lite / Matrix | ○ | ○ | ○ | 超小型 |
| M5Stamp Pico | ○ | ○ | ○ | — |
| M5Stamp C3 / C3U | ○ | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | ○ | DigiCode 推薦開發板 (專用擴展板開發中) |
| XIAO ESP32C3 | ○ | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | ○ | 支援鏡頭 |
| XIAO ESP32C6 | ○ | ○ | ○ | — |

> **不支援:** DigiCode 不支援 ESP8266。

---

## 4 種燒錄方式 — 快速比較

| 方式 | 速度 | 事前準備 | 備註 |
|---|---|---|---|
| **🥇 USB 直接** | ~30 秒 | USB 驅動程式 | 最可靠 |
| **🥈 WiFi OTA** | ~15 秒 | FW + WiFi 設定 (第一次 USB) | 最快、可同時更新多台 |
| **🥉 BLE** | ~40 秒 | FW (第一次 USB) | 不需 WiFi |
| **⚡ 本地編譯** | (組合用) | Docker | 節省雲端配額 |

---

## 方式 1: USB 直接燒錄 (基本・推薦)

### 安裝 USB 驅動程式

如果 ESP32 未被識別 (埠選擇對話框中未出現裝置),需要安裝 USB 驅動程式。

| 晶片 | 對應開發板範例 | 下載 |
|---|---|---|
| **CP2102** | ESP32-DevKitC、M5StampS3A、許多 M5Stack 系列 | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | 許多通用 ESP32 開發板 | http://www.wch.cn/downloads/CH341SER_ZIP.html |

安裝後請 **重新啟動電腦**。

### 故障排除

| 症狀 | 解決方法 |
|---|---|
| 埠未顯示 | 安裝 USB 驅動程式 + 重新啟動,確認 USB 線支援資料傳輸 |
| 燒錄失敗 | 按住 BOOT / BOOTSTRAP 按鈕同時開始燒錄 |
| 逾時錯誤 | 嘗試其他 USB 埠 / 連接線 |

---

## 方式 2: WiFi OTA (選用)

不需連接線,最快燒錄。可同時更新多台裝置。

### 前提條件

- **韌體燒錄完成** (僅第一次,透過 USB 執行,[詳細](#韌體初始燒錄))
- WiFi 設定完成 (SSID / 密碼)
- WiFi 路由器 (與 ESP32 同 LAN)
- (僅 Windows 未安裝 Bonjour 環境) [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) — mDNS 替代方案。Mac / Linux 標準支援 mDNS,不需要

### 步驟

1. 在瀏覽器中開啟 DigiCode (或使用 DigiCode Finder 取得 IP 位址)
2. **「燒錄」** → **「WiFi OTA」**
3. (mDNS 自動偵測有效的環境從裝置清單選擇 / 否則輸入 IP 位址)
4. 開始燒錄 (~15 秒)

> ⚠️ **Windows 進階使用者限定**: WiFi OTA 構建有多個前提條件,對 Windows 初學者負擔大。建議 USB / BLE。詳細請參閱 [本地編譯伺服器 § Windows](./local-compile-server.md#-開始前-推薦度與前提知識)。

→ 設定詳細: [OTA 設定指南](./05-ota-guide.md)

---

## 方式 3: BLE (選用)

藍牙燒錄。適合放入外殼的裝置和沒有 WiFi 的地方。

### 前提條件

- **韌體燒錄完成** (僅第一次,透過 USB 執行)
- 支援 Web Bluetooth 的瀏覽器 (Chrome / Edge)
- 支援開發板: 支援 BLE 的 ESP32 (`supportsBle: true`)

### 步驟

1. 在積木編輯器中建立程式
2. **「燒錄」** → **「BLE」**
3. **「搜尋裝置」** → 開始藍牙掃描
4. 選擇 **「DigiCode-XXXXXX」** 並配對
5. 開始燒錄 (~40 秒)

→ 設定詳細: [OTA 設定指南](./05-ota-guide.md)

---

## 方式 4: 本地編譯伺服器 (加速選項)

在自己的電腦上編譯,不消耗雲端編譯配額,更快速建置。與燒錄方式 (USB / WiFi OTA / BLE) 正交,可任意組合。cache HIT 約 1 ms。

→ 詳細: [本地編譯伺服器](./local-compile-server.md)

---

## 詳細・概念

### 術語

| 術語 | 說明 |
|---|---|
| **程式燒錄** | 燒錄用積木編輯器建立的程式的操作 (每次) |
| **韌體燒錄** | 燒錄 WiFi OTA / BLE 用基礎軟體的操作 (**僅在使用 WiFi OTA / BLE 的第一次**) |

更多請參閱 [共通步驟 § 術語](./01-program-setup-common.md#術語-程式燒錄-vs-韌體燒錄)。

### 韌體初始燒錄

想使用 WiFi OTA 或 BLE 時,只需透過 USB 執行一次。

1. 點擊左側選單的 **「韌體燒錄」**
2. 透過 USB 線連接 ESP32
3. 點擊 **「INSTALL」**
4. 選擇序列埠
5. 等待完成 (~1 分鐘)

### WiFi 設定 (WiFi OTA 用)

韌體燒錄後,要使用 WiFi OTA:

1. 點擊 **「WiFi 設定」**
2. 選擇序列埠並連接
3. 輸入 SSID 和密碼
4. 點擊 **「連線測試」**
5. 成功後顯示固定 IP 位址

### 序列監視器除錯

對程式除錯很方便。

1. 透過 USB 連接 ESP32
2. 點擊側邊欄的 **「序列監視器」**
3. 選擇埠並點擊 **「連接」**
4. 鮑率: **115200**

---

## 燒錄方式的選擇方法

| 情況 | 推薦方式 |
|---|---|
| 初學者・日常開發 | **🥇 USB** (最可靠) |
| 已設定 WiFi OTA | 🥈 **WiFi OTA** (最快) |
| 沒有 WiFi 環境 | USB 或 BLE |
| 放入外殼的裝置 | 🥉 BLE 或 WiFi OTA |
| 教室批次更新 | WiFi OTA |
| 想節省編譯配額 | ⚡ 本地編譯伺服器 |
| 故障排除・復原 | **🥇 USB** (最可靠) |

---

## 相關文件

- [開始使用](./getting-started.md) — 第一次 USB 燒錄教學
- [共通步驟](./01-program-setup-common.md) — 術語、燒錄方式概述
- [OTA 設定指南](./05-ota-guide.md) — WiFi OTA / BLE 設定詳細
- [本地編譯伺服器](./local-compile-server.md) — 在自己的電腦上編譯
- [故障排除](./troubleshooting.md) — 問題解決指南
- [硬體連接指南](./hardware-setup.md) — 感測器・馬達接線
