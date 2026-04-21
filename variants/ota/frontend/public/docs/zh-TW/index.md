# DigiCode 文件

**最後更新:** 2026-04-21

DigiCode 是一款使用積木輕鬆為 ESP32 機器人和 IoT 裝置進行程式設計的視覺化開發環境。

---

## 整體流程

DigiCode **只需 USB 線即可開始使用**。不需要任何特殊設定。

| 步驟 | 內容 | 頻率 |
|------|------|------|
| **1. 準備** | 準備 ESP32 開發板、USB 線、USB 驅動程式 | 僅第一次 |
| **2. 建立程式** | 在積木編輯器中建立程式 | 每次 |
| **3. USB 燒錄** | 連接 USB 線並燒錄 | 每次 |

之後只需重複相同步驟即可。WiFi OTA / BLE 是不使用連接線就能燒錄的額外選項。

→ 詳細: [開始使用](./getting-started.md)

---

## WiFi OTA / BLE（選用）

想要不用連接線就能更新程式時設定。初次只需透過 USB 燒錄**韌體**（OTA 基礎軟體）一次。

> **什麼是韌體？** WiFi OTA / BLE 所需的程式。包含直接控制並驅動硬體所需的最小化基礎指令。**如果只使用 USB 燒錄，則不需要燒錄韌體。**

| 方式 | 特色 | 適合用途 |
|------|------|---------|
| **WiFi OTA** | 最快速・不需連接線 | 批次更新多台裝置、日常開發（中階以上） |
| **BLE** | 不需連接線・不需 WiFi | 更新放入外殼的裝置 |

→ 詳細: [OTA 設定指南](./05-ota-guide.md)

---

## 支援的開發板

DigiCode 是**僅限 ESP32 系列**的積木編輯器。

### Generic ESP32 系列

| 開發板 | WiFi OTA | BLE | 備注 |
|--------|:--------:|:---:|------|
| ESP32 | ○ | ○ | 最普通 |
| ESP32-S3 | ○ | ○ | 高效能 |
| ESP32-C3 | ○ | ○ | 低功耗・RISC-V |
| ESP32-C6 | ○ | ○ | 支援 Matter |

### M5Stack 系列

| 開發板 | WiFi OTA | BLE | 備注 |
|--------|:--------:|:---:|------|
| M5Stack Basic/Gray/Fire | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | 小巧 |
| ATOM Lite / Matrix | ○ | ○ | 超小型 |
| M5Stamp Pico | ○ | ○ | — |
| M5Stamp C3/C3U | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | **DigiCode 推薦開發板（專用擴展板開發中）** |

### Seeed XIAO 系列

| 開發板 | WiFi OTA | BLE | 備注 |
|--------|:--------:|:---:|------|
| XIAO ESP32C3 | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | 支援鏡頭 |
| XIAO ESP32C6 | ○ | ○ | — |

→ 詳細: [推薦硬體](./recommended-hardware.md)

---

## 所需軟體

| 軟體 | 用途 | 需要的情況 |
|------|------|-----------|
| **網頁瀏覽器**（Chrome/Edge） | DigiCode 主程式 | 必要 |
| **USB 驅動程式**（CP2102 或 CH340） | USB 燒錄 | 必要 |
| **DigiCode Finder** | WiFi 裝置偵測 | 僅使用 WiFi OTA 時 |
| **Docker** | 本地編譯加速 | 僅使用本地伺服器時 |

### 下載 DigiCode Finder

WiFi OTA 燒錄所需的桌面應用程式。

**下載:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| 作業系統 | 檔案 |
|---------|------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

---

## 方案

DigiCode 提供免費方案。

| 方案 | 適合對象 | 雲端編譯 | 班級功能 |
|------|---------|:-------:|:-------:|
| **Free** | 試用・本地編譯 | 每月 50 次 | — |
| **Lite** | 個人愛好者 | 每月 250 次 | — |
| **Pro** | 開發者・Maker | 每月 500 次 | — |
| **Enterprise** | 教育機構・團隊 | 無限制 | ○ |

> **訪客使用:** 不需註冊帳號即可建立和燒錄程式（僅本地儲存）。

---

## 班級功能（Enterprise 方案）

學校和教育機構的班級管理功能。

| 角色 | 功能 |
|------|------|
| **教師** | 建立班級・發布作業・查看作業 |
| **學生** | 加入班級・提交作業・查看提交記錄 |

→ 詳細: [FAQ（班級功能）](./faq.md)

---

## 文件清單

### 入門

| 文件 | 內容 |
|------|------|
| [開始使用](./getting-started.md) | 初始設定和第一個程式 |
| [推薦硬體](./recommended-hardware.md) | 已驗證的裝置清單 |

### 燒錄指南

| 文件 | 內容 |
|------|------|
| [共通步驟](./01-program-setup-common.md) | 術語定義・燒錄方式概述 |
| [ESP32 系列](./04-program-setup-esp32.md) | ESP32 燒錄詳細說明 |
| [OTA 設定（選用）](./05-ota-guide.md) | WiFi OTA / BLE 設定 |

### 參考資料

| 文件 | 內容 |
|------|------|
| [積木參考](./block-reference.md) | 所有積木的使用方法 |
| [硬體連接](./hardware-setup.md) | 感測器・馬達接線 |
| [故障排除](./troubleshooting.md) | 常見問題與解決方法 |
| [FAQ](./faq.md) | 常見問題 |

### 進階

| 文件 | 內容 |
|------|------|
| [架構](./architecture.md) | 系統架構和技術堆疊 |
| [本地編譯伺服器](./local-compile-server.md) | 在自己的電腦上編譯（加速） |

---

## 支援

如果遇到問題，請參考：

1. [故障排除](./troubleshooting.md)
2. [FAQ](./faq.md)
3. [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues)
