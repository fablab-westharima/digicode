# DigiCode 架構概覽

介紹 DigiCode 系統的整體架構與技術堆疊。

## 系統架構

![系統架構圖](/docs/images/system-architecture.svg)

## 技術堆疊

### 前端
- **框架:** React 19 + TypeScript
- **建置工具:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **積木編輯器:** Blockly 10.4
- **狀態管理:** Zustand
- **路由:** React Router 7
- **裝置燒錄:** esp-web-tools, esptool-js

### 後端 API
- **執行環境:** Cloudflare Workers
- **框架:** Hono
- **資料庫:** Cloudflare D1 (SQLite)
- **認證:** JWT
- **檔案儲存:** Cloudflare R2

### 編譯伺服器
- **執行環境:** Node.js
- **框架:** Express
- **編譯器:** Arduino CLI 1.3.1
- **目標平台:** ESP32 Arduino Core 3.3.4

### ESP32 韌體
- **語言:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **通訊:** HTTP Server, WebSocket（計畫中）

## 資料流程

### 1. 程式建立流程

![程式建立流程](/docs/images/flow-program-creation.svg)

### 2. 認證流程

![認證流程](/docs/images/flow-auth.svg)

### 3. WiFi OTA 更新流程

![WiFi OTA 更新流程](/docs/images/flow-ota.svg)

## 目錄結構

### 前端
```
esp32-blockly-frontend/
├── public/
│   └── firmware/         # 韌體二進位檔
├── src/
│   ├── blocks/           # Blockly 積木定義
│   ├── components/       # React 元件
│   │   ├── editor/       # 編輯器相關
│   │   ├── serial/       # 序列監視器
│   │   ├── device/       # 裝置管理
│   │   └── ui/           # UI 元件（shadcn）
│   ├── pages/            # 頁面元件
│   ├── services/         # API 服務
│   ├── stores/           # Zustand 儲存
│   └── data/             # 範例專案等
├── e2e/                  # E2E 測試（Playwright）
└── playwright.config.ts
```

### 後端 API
```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # 進入點
│   ├── routes/           # API 路由
│   ├── middleware/       # 認證等
│   └── db/               # D1 結構
└── wrangler.toml         # Cloudflare Workers 設定
```

### 編譯伺服器
```
arduino-compile-server/
├── server.js             # Express 伺服器
├── templates/            # 程式碼生成範本
├── temp/                 # 暫存檔案
└── build/                # 建置輸出
```

## 安全性

### 認證與授權
- 使用 JWT 令牌進行會話管理
- 令牌儲存在本地儲存空間
- 所有 API 請求附帶令牌

### CORS
- 允許來自前端（localhost:5173）的請求
- 允許來自 ESP32 裝置的請求（OTA 用）

### 資料保護
- 密碼雜湊後儲存
- HTTPS 通訊（正式環境）
- XSS 防護（React 的跳脫功能）

## 可擴展性

### 水平擴展
- Cloudflare Workers: 自動擴展
- Cloudflare D1: 自動複製
- 編譯伺服器: 可透過 VPS 擴展

### 效能優化
- 前端: Vite 快速建置、程式碼分割
- 後端: Workers 的邊緣運算
- 資料庫: 索引優化

## 未來擴展

### 短期
- 單元測試、E2E 測試擴充
- CI/CD 流程建置
- 錯誤處理強化

### 中期
- WebSocket 即時通訊
- 裝置韌體自動更新
- 雲端專案分享功能

### 長期
- 裝置間協調控制
- 教育內容擴充
- 多語言支援（國際化）

## 參考資料

- [React Documentation](https://react.dev/)
- [Blockly Documentation](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
