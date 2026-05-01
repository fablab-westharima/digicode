# 程式燒錄 — 共通步驟

**最後更新:** 2026-05-02

DigiCode 是 **僅限 ESP32 系列** 的積木程式設計環境。本文件說明「該選擇哪種燒錄方式」和相關術語概要。

---

## 🚀 該用哪種方式? — 30 秒決定

| 你的狀況 | 推薦方式 |
|---|---|
| **第一次使用** / **想要可靠且不會出問題的燒錄** | 🥇 **USB 直接燒錄** ([詳細](#1-usb-直接燒錄-基本-推薦)) |
| ESP32 放入外殼內 / 每次接 USB 太麻煩 / 想同時更新多台裝置 | 🥈 **WiFi OTA** ([詳細](./05-ota-guide.md)) |
| 沒有 WiFi 環境 / 設定 WiFi 太麻煩 | 🥉 **BLE 燒錄** ([詳細](./05-ota-guide.md)) |
| 雲端編譯額度用完 / 想離線使用 / 想加速 | ⚡ **本地編譯 + 上述任一種** ([詳細](./local-compile-server.md)) |

> 💡 **猶豫時請從 USB 直接燒錄開始**。WiFi OTA / BLE 是先透過 USB 進行一次「韌體燒錄」後才能使用的選用功能。

---

## 4 種燒錄方式 — 比較表

| 方式 | 速度 | 連接線 | 事前準備 | 支援開發板 |
|---|---|---|---|---|
| **🥇 USB 直接** | ~30 秒 | 需要 | USB 驅動程式 | 全開發板 |
| **🥈 WiFi OTA** | ~15 秒 (最快) | 不需要 | 韌體燒錄 + WiFi 設定 (僅第一次) | ESP32 系列 (`supportsOta: true`) |
| **🥉 BLE** | ~40 秒 | 不需要 | 韌體燒錄 (僅第一次) | 支援 BLE 的 ESP32 (`supportsBle: true`) |
| **⚡ 本地編譯** | (組合用,速度依燒錄方式而定,cache HIT ~1 ms) | — | Docker | 全開發板 (可組合) |

---

## 支援的微控制器

DigiCode **僅支援 ESP32 系列**。

| 類別 | 開發板範例 | USB | WiFi OTA | BLE |
|---|---|:---:|:---:|:---:|
| **Generic ESP32 系列** | ESP32 / S3 / C3 / C6 | ○ | ○ | ○ |
| **M5Stack 系列** | M5Stack Basic / M5StickC Plus / ATOM / M5Stamp 等 | ○ | ○ | ○ |
| **XIAO ESP32 系列** | XIAO ESP32C3 / S3 / C6 | ○ | ○ | ○ |

> **不支援:** ESP8266、Arduino Uno/Nano、RP2040 系列不在支援範圍內。

---

## 基本燒錄流程 (USB)

1. **透過 USB 線將 ESP32 連接到電腦**
2. 在積木編輯器中建立程式 (或載入範例)
3. 右上的 **「燒錄」** 按鈕 → 選擇 **「USB」**
4. 在瀏覽器的序列埠選擇對話框中選擇埠
5. 燒錄完成後,ESP32 自動重新啟動並執行程式

📘 **完整的第一次手順請參閱** [開始使用](./getting-started.md) (驅動程式安裝到 LED 閃爍範例)。

---

## 詳細・概念

### 術語: 程式燒錄 vs 韌體燒錄

DigiCode 中「程式燒錄」和「韌體燒錄」是 **不同的操作**。

#### 程式燒錄 (一般操作)

將積木編輯器建立的程式燒錄到微控制器的操作。

| 項目 | 內容 |
|---|---|
| **燒錄內容** | 使用者用積木建立的程式 |
| **燒錄方式** | USB (基本) / WiFi OTA / BLE |
| **燒錄頻率** | 任何時候 (每次修改程式時) |
| **UI 位置** | 編輯器畫面的「燒錄」按鈕 |

#### 韌體燒錄 (僅在使用 WiFi OTA / BLE 時)

燒錄 WiFi OTA 或 BLE 所需的基礎軟體 (OTA receiver) 的操作。**僅使用 USB 燒錄時不需要**。

| 項目 | 內容 |
|---|---|
| **燒錄內容** | OTA 用基礎軟體 (硬體控制的最小化基礎指令) |
| **燒錄方式** | 僅透過 USB |
| **燒錄頻率** | 使用 WiFi OTA / BLE 的第一次 |
| **UI 位置** | 左側選單「韌體燒錄」 |

### 4 種燒錄方式 詳細

#### 1. USB 直接燒錄 (基本・推薦)

最可靠,在任何環境下都能運作。需事先安裝 USB 驅動程式 (CP2102 / CH340)。詳細請參閱 [開始使用](./getting-started.md) 和 [ESP32 燒錄指南](./04-program-setup-esp32.md)。

#### 2. WiFi OTA (選用)

不需連接線,最快速,可同時更新多台裝置。需要 WiFi 路由器。Windows 未安裝 Bonjour 的環境可使用 [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) 作為 mDNS 替代方案 (Mac / Linux 標準支援 mDNS)。詳細請參閱 [OTA 設定指南](./05-ota-guide.md)。

> ⚠️ **Windows 使用者請注意**: WiFi OTA 構建在 Windows 上屬於進階使用者範圍。初學者建議使用 USB / BLE 燒錄。詳細請參閱 [本地編譯伺服器 § Windows](./local-compile-server.md#-開始前-推薦度與前提知識)。

#### 3. BLE 燒錄 (選用)

不需連接線,不需 WiFi 環境。需要支援 Web Bluetooth 的瀏覽器 (Chrome / Edge)。詳細請參閱 [OTA 設定指南](./05-ota-guide.md)。

#### 4. 本地編譯伺服器 (加速選項)

不消耗雲端編譯配額,可離線使用。需要 Docker (或 OrbStack / Rancher Desktop / Podman)。與燒錄方式 (USB / WiFi OTA / BLE) 正交,可任意組合。詳細請參閱 [本地編譯伺服器](./local-compile-server.md)。

### 準備物品

#### 必要
- 電腦 (Windows / Mac / Linux)
- 網頁瀏覽器 (推薦 Chrome / Edge)
- 支援的 ESP32 開發板
- USB 線 (支援資料傳輸)
- USB 驅動程式 (CP2102 或 CH340)

#### 選用
- **WiFi OTA 用**: WiFi 路由器 (Windows 未安裝 Bonjour 環境需 DigiCode Finder)
- **BLE 用**: 支援 Web Bluetooth 的瀏覽器 (Chrome / Edge)
- **本地編譯用**: Docker 環境

### 如果想使用 WiFi OTA / BLE

只需一次性設定:

1. 透過 USB 連接 ESP32
2. 左側選單 **「韌體燒錄」** → 點擊 **「INSTALL」**
3. (WiFi OTA 的情況) 在 **「WiFi 設定」** 中設定 SSID 和密碼
4. 之後可以不需要 USB 連線,使用 WiFi OTA / BLE 燒錄

→ 詳細: [OTA 設定指南](./05-ota-guide.md)

---

## 常見失敗與解決方法

| 症狀 | 原因 | 解決方法 |
|---|---|---|
| 埠未顯示 | USB 驅動程式未安裝 | 安裝 CP2102 或 CH340 驅動程式 + 重新啟動電腦 |
| 燒錄錯誤 | USB 線僅供充電 | 更換為支援資料傳輸的連接線 |
| 燒錄中逾時 | 連接不穩定 | 嘗試其他 USB 埠 / 連接線 |
| 無法進入 BOOT 模式 | 開發板特定步驟 | 按住 BOOT / BOOTSTRAP 按鈕同時開始燒錄 |
| WiFi OTA 未偵測到 | 未連接 WiFi / 未燒錄韌體 | 透過 USB 確認韌體燒錄和 WiFi 設定 |

更多請參閱 [故障排除](./troubleshooting.md)。

---

## 相關文件

- [開始使用](./getting-started.md) — 從 USB 到 LED 閃爍
- [ESP32 燒錄指南](./04-program-setup-esp32.md) — ESP32 系列燒錄詳細
- [OTA 設定指南](./05-ota-guide.md) — WiFi OTA / BLE 設定
- [本地編譯伺服器](./local-compile-server.md) — 在自己的電腦上編譯
- [故障排除](./troubleshooting.md) — 常見問題與解決方法
