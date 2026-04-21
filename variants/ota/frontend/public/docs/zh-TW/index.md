# DigiCode 文件

**最後更新:** 2025-12-28

DigiCode 是一個視覺化開發環境，讓您可以使用積木方塊輕鬆為 ESP32 微控制器的機器人和 IoT 裝置進行程式設計。

---

## 整體流程

![整體流程](/docs/images/flow-overview.svg)

| 步驟 | 內容 | 頻率 |
|------|------|------|
| **1. 準備** | 準備 ESP32 開發板和 USB 線 | 僅首次 |
| **2. 韌體燒錄** | 透過 USB 燒錄 DigiCode 基礎程式 | 僅首次 |
| **3. 連線設定** | WiFi 連線或 BLE 設定（依使用方式不同） | 首次或變更時 |
| **4. 程式燒錄** | 燒錄用積木製作的程式 | 可重複多次 |

---

## 三種燒錄方式

DigiCode 提供三種方式將程式燒錄到 ESP32。

![三種燒錄方式](/docs/images/upload-methods.svg)

### 方式比較表

| 方式 | 速度 | 傳輸線 | 需求 | 建議用途 |
|------|------|--------|------|----------|
| **WiFi OTA** | 最快 | 不需要 | WiFi 路由器、DigiCode Finder | 日常開發、多裝置更新 |
| **BLE** | 中等 | 不需要 | 支援 Web Bluetooth 的瀏覽器 | 無 WiFi 環境、封閉式裝置 |
| **USB** | 快速 | 需要 | USB 線、驅動程式 | 初次設定、故障排除 |

> **給初學者:** 建議先用 USB 燒錄韌體，之後再使用 WiFi OTA 更新程式。

---

## 快速入門指南

### 首次設定（15分鐘）

![初始設定](/docs/images/quickstart-initial.svg)

1. **USB 連接** - 將 ESP32 透過 USB 連接到電腦
2. **韌體燒錄** - 左側選單「韌體燒錄」→「INSTALL」
3. **WiFi 設定** - 在「WiFi 設定」輸入 SSID 和密碼
4. **DigiCode Finder** - 使用桌面應用程式偵測裝置

→ 詳細: [開始使用](./getting-started.md)

---

### 第二次以後（1分鐘）

![第二次以後](/docs/images/quickstart-repeat.svg)

1. 在積木編輯器中建立程式
2. 點選「燒錄」→ 選擇「WiFi OTA」
3. 選擇裝置並開始燒錄

---

## 支援的微控制器開發板

### ESP32 系列（WiFi OTA / BLE / USB）

| 開發板 | WiFi OTA | BLE | USB | 備註 |
|--------|:--------:|:---:|:---:|------|
| ESP32 | ○ | ○ | ○ | 推薦 |
| ESP32-S3 | ○ | ○ | ○ | 高效能 |
| ESP32-C3 | ○ | ○ | ○ | 低功耗 |
| ESP32-S2 | ○ | - | ○ | 不支援 BLE |

→ 詳細: [ESP32 燒錄指南](./04-program-setup-esp32.md)

---

## 必要軟體

| 軟體 | 用途 | 必要/選用 |
|------|------|----------|
| **網頁瀏覽器**（Chrome/Edge） | DigiCode 主程式 | 必要 |
| **DigiCode Finder** | WiFi 裝置偵測 | 使用 WiFi OTA 時 |
| **USB 驅動程式** | 序列通訊 | 使用 USB 時 |

### DigiCode Finder 下載

使用 WiFi OTA 燒錄需要裝置偵測用的桌面應用程式。

**下載:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| 作業系統 | 檔案 |
|----------|------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

→ 詳細: [OTA 設定指南](./05-ota-guide.md)

---

## 文件一覽

### 入門

| 文件 | 內容 |
|------|------|
| [開始使用](./getting-started.md) | 初始設定、第一個程式 |
| [推薦硬體](./recommended-hardware.md) | 已驗證裝置清單 |

### 燒錄指南

| 文件 | 內容 |
|------|------|
| [共通步驟](./01-program-setup-common.md) | 術語定義、所有微控制器共通步驟 |
| [ESP32](./04-program-setup-esp32.md) | ESP32 全系列（WiFi OTA/BLE/USB） |
| [OTA 設定](./05-ota-guide.md) | WiFi OTA 詳細設定 |

### 參考資料

| 文件 | 內容 |
|------|------|
| [積木參考](./block-reference.md) | 所有積木的使用方法 |
| [硬體連接](./hardware-setup.md) | 感測器、馬達接線 |
| [故障排除](./troubleshooting.md) | 常見問題與解決方法 |
| [常見問題](./faq.md) | 常見問題集 |

### 進階

| 文件 | 內容 |
|------|------|
| [系統架構](./architecture.md) | 系統架構與技術堆疊 |
| [本地編譯伺服器](./local-compile-server.md) | 在自己的電腦上編譯 |

---

## 支援

如遇到問題，請參考以下資源：

1. [故障排除](./troubleshooting.md)
2. [常見問題](./faq.md)
3. [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues)
