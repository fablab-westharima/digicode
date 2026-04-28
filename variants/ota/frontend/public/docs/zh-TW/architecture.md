# DigiCode 架構概覽

**最後更新：** 2026-04-29

說明 DigiCode 系統的整體架構與技術堆疊。

## 系統架構

| 元件 | 技術 | 部署位置 |
|------|------|---------|
| **前端** | React 19 + Blockly | Cloudflare Pages |
| **後端 API** | Hono + Cloudflare Workers | Cloudflare Workers |
| **班級伺服器** | Hono + better-sqlite3 | HPE ML30（`class.digital-fab.jp`） |
| **編譯伺服器** | Node.js + Hono + PlatformIO Core | HPE ML30（Docker 容器） |
| **資料庫** | Cloudflare D1（SQLite） | Cloudflare |
| **檔案儲存** | Cloudflare R2 | Cloudflare（Bucket 已建立，目前未使用） |
| **金流** | Stripe Billing | Stripe（正式上線中） |

---

## 技術堆疊

### 前端

- **框架：** React 19 + TypeScript
- **建置工具：** Vite 7
- **UI：** Tailwind CSS + shadcn/ui
- **積木編輯器：** Blockly 10.4
- **狀態管理：** Zustand
- **路由：** React Router 7
- **裝置燒錄：** esp-web-tools、esptool-js
- **國際化：** i18next（日語 / 英語 / 西班牙語 / 葡萄牙語 / 繁體中文，共 5 種語言）

### 後端 API

- **執行環境：** Cloudflare Workers
- **框架：** Hono
- **資料庫：** Cloudflare D1（users、classes、class_members、compile_usage、subscriptions 等）
- **認證：** JWT
- **金流：** Stripe Billing（Phase D-1，2026-04-18 正式上線）

### 班級伺服器（獨立）

- **儲存庫：** `fablab-westharima/digicode-class-server`（私有）
- **執行環境：** Node.js + Hono + better-sqlite3
- **用途：** 管理作業（assignments）與答案（submissions）。大型 Blockly XML 存放於 SQLite 而非 D1
- **部署位置：** HPE ML30（`https://class.digital-fab.jp`）

### 編譯伺服器

- **原始碼：** DigiCode monorepo `compile-api/`（proprietary）
- **執行環境：** Node.js + Hono
- **編譯器：** PlatformIO Core
- **目標平台：** ESP32 + RP2040（Arduino framework）
- **部署位置：** HPE ML30（Docker 容器，雲端編譯）/ 使用者環境（Docker，本地編譯）
- **映像：** `ghcr.io/fablab-westharima/digicode-compile-api:latest`（雲端與本地共用）

### ESP32 韌體

- **語言：** Arduino C++
- **OTA：** ArduinoOTA / WiFi OTA
- **mDNS：** ESP32 mDNS
- **函式庫：** DigiCodeHumanoid / DigiCodeTransform / DigiCodeWheel（自製實作）

---

## 資料流程

### 程式燒錄流程（USB）

```
積木編輯器 → 編譯伺服器 → 產生二進位檔 → 瀏覽器 Web Serial API → ESP32
```

### 程式燒錄流程（WiFi OTA）

```
積木編輯器 → 編譯伺服器 → 產生二進位檔 → HTTP POST 至 ESP32 OTA 端點
```

### 班級功能流程

```
教師：瀏覽器 → 後端 API（D1）→ 班級伺服器（ML30 SQLite）
學生：瀏覽器 → 後端 API → 取得作業／提交答案 → 班級伺服器
```

---

## 目錄結構

### 前端

```
variants/ota/frontend/
├── public/
│   ├── firmware/         # 韌體二進位檔
│   └── docs/             # 說明文件（5 種語言）
├── src/
│   ├── blocks/           # Blockly 積木定義（arduino/ + common/）
│   ├── components/       # React 元件
│   │   ├── editor/       # 編輯器 / 模式選擇器
│   │   ├── serial/       # 序列埠監視器
│   │   ├── device/       # 裝置管理
│   │   ├── settings/     # 設定 / 方案
│   │   └── ui/           # UI 元件（shadcn）
│   ├── pages/            # 頁面元件
│   ├── services/         # API 服務
│   ├── stores/           # Zustand 狀態
│   ├── i18n/             # 多語言（5 種語言）
│   └── data/             # 範例專案等
```

### 後端 API

```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # 進入點
│   ├── routes/           # API 路由
│   ├── middleware/       # 認證等
│   └── db/               # D1 結構描述
└── wrangler.toml         # Cloudflare Workers 設定
```

---

## 安全性

### 認證與授權
- 以 JWT 權杖管理工作階段
- 所有 API 請求均附帶權杖
- 依方案限制功能（Stripe 整合）

### CORS
- 允許來自前端的請求
- 允許來自 ESP32 裝置的請求（用於 OTA）

### 資料保護
- 密碼雜湊後儲存
- 正式環境使用 HTTPS
- XSS 防護（React 的跳脫機制）

---

## 測試

- **單元測試：** vitest 環境已建立（測試實作待完成）
- **E2E 測試：** 尚未實作

---

## 擴充性

### 水平擴充
- Cloudflare Workers：自動擴充
- Cloudflare D1：自動複製
- 編譯伺服器：ML30（Docker 容器，單機）

### 效能最佳化
- 前端：Vite 高速建置與程式碼分割
- 後端：Workers 邊緣部署
- 資料庫：索引最佳化

---

## 參考資料

- [React 文件](https://react.dev/)
- [Blockly 文件](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
