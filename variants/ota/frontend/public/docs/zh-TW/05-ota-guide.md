# OTA 設定指南（選用）

**最後更新:** 2026-04-21

> **本指南為選用功能。** DigiCode **只需 USB 線即可開始使用**。先透過 [開始使用](./getting-started.md) 中的 USB 流程熟悉操作，再視需要參閱本指南。

---

## WiFi OTA 是什麼？

WiFi OTA（Over-The-Air）是透過 WiFi 無線燒錄程式的方式。一旦設定完成，不需要 USB 線就能更新程式。

### 優點

- 不需 USB 線即可燒錄
- 最快速（約 15 秒）
- 可同時批次更新多台裝置
- 可更新放入外殼的裝置

### 缺點・注意事項

- 需要一次性設定（韌體燒錄＋WiFi 設定）
- 需要 WiFi 連線
- 電腦和 ESP32 需要在相同網路
- 需要 Bonjour/mDNS（Windows 需額外安裝）
- WiFi 故障或網路變更時無法燒錄

> **建議中階以上使用:** WiFi OTA 發生問題時，可能需要透過 USB 重新燒錄韌體。

---

## 前提條件

1. **ESP32 開發板**（支援 WiFi OTA，supportsOta: true）
2. **WiFi 路由器**（ESP32 可連接的網路）
3. **DigiCode Finder**（推薦）
   - https://github.com/fablab-westharima/DigiCode-Finder/releases

---

## 步驟 1: 燒錄韌體

要使用 WiFi OTA / BLE，需要透過 USB 燒錄一次**韌體**（OTA 用基礎軟體）。

1. 透過 USB 線連接 ESP32
2. 點擊左側選單的「**韌體燒錄**」
3. 點擊「INSTALL」
4. 選擇序列埠
5. 等待完成（約 1 分鐘）

> 韌體燒錄一次後，通常不需要重新燒錄。執行全 Flash 清除後需要重新燒錄。

---

## 步驟 2: 連接 ESP32 到 WiFi

1. 透過 USB 連接 ESP32（與韌體燒錄相同的連接）
2. 點擊左側選單的「**WiFi 設定**」
3. 選擇序列埠並點擊「連接」
4. 在 WiFi 設定對話框中輸入：
   - **SSID**: 連接目標 WiFi 的網路名稱
   - **密碼**: WiFi 密碼
5. 點擊「連線測試」
6. 成功後顯示固定 IP 位址

> 連線測試失敗時設定不會儲存。請確認正確的 SSID 和密碼。

---

## 步驟 3: 用 DigiCode Finder 偵測裝置

### DigiCode Finder 是什麼？

透過 mDNS 自動偵測網路上 DigiCode 裝置的桌面應用程式（v1.4.1）。

### 安裝

**下載:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| 作業系統 | 檔案 |
|---------|------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

### Windows 使用者: 安裝 Bonjour

如果啟動 DigiCode Finder 後未偵測到裝置，需要 Bonjour。

1. DigiCode Finder 選單「Help」→「Install Bonjour (Windows)」
2. 從 Apple 官方網站下載 Bonjour Print Services
3. 安裝後重新啟動電腦

### 偵測裝置

1. 啟動 DigiCode Finder
2. 相同網路上的 DigiCode 裝置自動列出
3. 顯示裝置名稱、IP 位址、韌體版本

### 複製 IP 位址

1. 點擊目標裝置的「選擇」按鈕
2. IP 位址複製到剪貼簿

### 選擇多台裝置

1. 勾選多台裝置
2. 點擊「選擇」（以 JSON 格式複製多個 IP）

---

## 步驟 4: 透過 WiFi OTA 燒錄程式

### 單台裝置

1. 在積木編輯器中建立程式
2. 點擊「**燒錄**」→「**WiFi OTA**」
3. 在裝置選擇對話框中貼上 IP 位址
4. 點擊「開始燒錄」（約 15 秒）

### 批次燒錄多台裝置

1. 在 DigiCode Finder 中選擇多台裝置並複製
2. 點擊「燒錄」→「WiFi OTA」
3. 在裝置選擇對話框中顯示多台裝置
4. 勾選更新目標後點擊「開始批次燒錄」

---

## BLE 燒錄（選用）

藍牙低功耗的燒錄方式。適合沒有 WiFi 的地方或更新放入外殼的裝置。

### BLE 的優點・缺點

**優點:**
- 不需 WiFi
- 不需連接線
- 可更新放入外殼的裝置

**缺點:**
- 比 WiFi OTA 慢（約 40 秒）
- 需要支援 Web Bluetooth 的瀏覽器
- 需要韌體燒錄前提（與 WiFi OTA 相同）

### 前提條件

- 韌體燒錄完成（與步驟 1 相同）
- 支援 Web Bluetooth 的瀏覽器（Chrome、Edge）

### 支援開發板

所有支援 BLE（supportsBle: true）的 ESP32 系列開發板。

### 步驟

1. 建立程式
2. 點擊「**燒錄**」→「**BLE**」
3. 點擊「搜尋裝置」
4. 在瀏覽器藍牙選擇對話框中選擇「DigiCode-XXXXXX」
5. 點擊「配對」
6. 開始燒錄（約 40 秒）

### BLE 故障排除

| 症狀 | 解決方法 |
|------|---------|
| 找不到裝置 | 重新啟動 ESP32、重新啟動瀏覽器 |
| 配對失敗 | 靠近些、中斷其他 BLE 連接 |
| 燒錄中途停止 | 重新啟動 ESP32 後重試 |

---

## 設定裝置名稱

管理多台裝置時很有用。

1. 透過 USB 連接開啟「WiFi 設定」
2. 在「裝置名稱」欄位輸入新名稱
3. 點擊「儲存」

**推薦命名規則:**
```
DigiCode-[用途]-[編號]
例: DigiCode-robot-001, DigiCode-class-02
```

---

## 故障排除

### 未偵測到裝置

| 原因 | 解決方法 |
|------|---------|
| 未連接 WiFi | 透過 USB 確認 WiFi 設定 |
| 不同網路 | 確認電腦和 ESP32 連接到相同 WiFi |
| 未安裝 Bonjour（Windows） | 安裝 Bonjour Print Services |
| 防火牆 | 允許 mDNS（埠 5353） |

### 燒錄中途停止

| 原因 | 解決方法 |
|------|---------|
| WiFi 訊號弱 | 將 ESP32 靠近路由器 |
| 網路擁塞 | 暫停其他大量通訊 |
| 逾時 | 重新啟動 ESP32 後重試 |

### 燒錄後裝置未回應

| 原因 | 解決方法 |
|------|---------|
| 程式錯誤 | 透過 USB 重新燒錄韌體 |
| WiFi 設定遺失 | 透過 USB 重新設定 WiFi |

---

## 重置 WiFi 設定

想初始化 WiFi 設定時：

1. 開啟「韌體燒錄」
2. 執行「清除整個 Flash（偵錯用）」
3. 重新燒錄韌體
4. 重新設定 WiFi

---

## 安全性注意事項

- 僅在信任的網路環境下使用
- 不推薦在公共 WiFi 上使用
- 生產環境請考慮使用 VPN 或隔離的網路

---

## 相關文件

| 文件 | 內容 |
|------|------|
| [開始使用](./getting-started.md) | USB 基本流程 |
| [共通步驟](./01-program-setup-common.md) | 術語定義、燒錄方式概述 |
| [ESP32 燒錄指南](./04-program-setup-esp32.md) | ESP32 特定設定 |
| [故障排除](./troubleshooting.md) | 問題解決指南 |
