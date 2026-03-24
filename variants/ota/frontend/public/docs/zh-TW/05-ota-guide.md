# OTA 設定指南

**最後更新:** 2025-12-28

---

## 簡介

OTA（Over-The-Air）燒錄是透過 WiFi 將程式燒錄到 ESP32 的方法。無需 USB 線即可無線更新程式。

---

## 術語定義

| 術語 | 說明 |
|------|------|
| **韌體** | DigiCode 的基礎程式。僅首次透過 USB 燒錄 |
| **程式** | 在積木編輯器中建立的使用者程式。可透過 WiFi OTA 多次更新 |

詳細請參考 [程式燒錄_共通步驟](./01-program-setup-common.md)。

---

## OTA 的優點與限制

### 優點
- 不需要 USB 線（僅透過 WiFi 更新）
- 可同時更新多台
- 即使裝置在外殼中也能更新

### 限制
- 首次需透過 USB 燒錄韌體
- 需要 WiFi 連接環境
- ESP32 和 PC 需連接到相同網路

---

## 前提條件

1. **已燒錄韌體**
   - 已透過左側選單「韌體燒錄」以 USB 完成初次燒錄

2. **可使用 WiFi 路由器**
   - ESP32 可連接的 WiFi 網路

3. **DigiCode Finder（推薦）**
   - 裝置偵測用桌面應用程式
   - https://github.com/fablab-westharima/DigiCode-Finder/releases

---

## 步驟1：將 ESP32 連接到 WiFi

### 透過 USB 連接設定 WiFi

1. 使用 USB 線將 ESP32 連接到 PC
2. 點選左側選單的「**WiFi 設定**」（或「韌體燒錄」→「WiFi 設定」）
3. 選擇序列埠並「連接」
4. 在 WiFi 設定對話框輸入以下資訊：
   - **SSID**：連接目標 WiFi 的網路名稱
   - **密碼**：WiFi 密碼
5. 點選「連接測試」
6. 連接成功後會顯示固定 IP 位址

> **注意：** WiFi 連接測試未成功則設定不會儲存。請輸入正確的 SSID 和密碼。

### 確認設定內容

連接成功後會顯示以下資訊：
- 裝置名稱
- 分配的 IP 位址
- 連接目標 SSID

---

## 步驟2：使用 DigiCode Finder 偵測裝置

### 什麼是 DigiCode Finder

使用 mDNS 自動偵測網路上 DigiCode 裝置的桌面應用程式。

### 安裝

1. 前往 https://github.com/fablab-westharima/DigiCode-Finder/releases
2. 下載適合您作業系統的檔案：
   - **Windows**：`.exe` 檔案
   - **macOS**：`.dmg` 檔案
   - **Linux**：`.AppImage` 檔案
3. 安裝並啟動

### Windows 使用者注意事項

**需要安裝 Bonjour。**

啟動 DigiCode Finder 後如果沒有偵測到裝置：
1. 點選選單「Help」→「Install Bonjour (Windows)」
2. 從 Apple 官方網站下載 Bonjour Print Services
3. 安裝後重新啟動 PC

### 裝置偵測

1. 啟動 DigiCode Finder
2. 同一網路上的 DigiCode 裝置會自動列出
3. 偵測到的裝置會顯示以下資訊：
   - 裝置名稱
   - IP 位址
   - 韌體版本

### 複製 IP 位址

1. 點選目標裝置的「選擇」按鈕
2. IP 位址會複製到剪貼簿
3. 在 DigiCode（瀏覽器）進行「WiFi OTA」燒錄時貼上

### 選擇多台裝置

也可以一次選擇多台裝置：
1. 勾選多台裝置
2. 點選「選擇」按鈕
3. 多個 IP 位址會以 JSON 格式複製

---

## 步驟3：透過 WiFi OTA 燒錄程式

### 燒錄到單一裝置

1. 在 DigiCode（瀏覽器）中建立程式
2. 點選「**燒錄**」按鈕
3. 選擇「**WiFi OTA**」
4. 顯示裝置選擇對話框
5. 如果有從 DigiCode Finder 複製的裝置資訊，會自動顯示
6. 選擇裝置並「開始燒錄」
7. 顯示進度條，等待完成

### 批次燒錄到多台裝置

在教室等需要同時更新多台裝置時：

1. 在 DigiCode Finder 中選擇多台裝置並複製
2. 在 DigiCode（瀏覽器）選擇「燒錄」→「WiFi OTA」
3. 在裝置選擇對話框中顯示多台裝置
4. 勾選要更新的對象（也可全選）
5. 點選「開始批次燒錄」
6. 顯示各裝置的進度

---

## 步驟4：確認運作

燒錄完成後，ESP32 會自動重新啟動並執行程式。

### 確認方法

1. **運作確認**：確認程式實際運作
2. **序列監視器**：USB 連接時可透過序列輸出確認
3. **DigiCode Finder**：重新偵測到裝置表示正常

---

## 裝置名稱設定

管理多台裝置時，裝置名稱很重要。

### 變更裝置名稱的方法

1. 透過 USB 連接開啟「WiFi 設定」
2. 在「裝置名稱」欄輸入新名稱
3. 點選「儲存」

### 建議的命名規則

```
DigiCode-[用途]-[編號]

範例：
- DigiCode-robot-001
- DigiCode-sensor-lab-a
- DigiCode-class-02
```

---

## 故障排除

### 裝置未被偵測

| 原因 | 對策 |
|------|------|
| WiFi 未連接 | 透過 USB 連接確認 WiFi 設定 |
| 不同網路 | 確認 PC 和 ESP32 是否連接到相同 WiFi |
| Bonjour 未安裝（Windows） | 安裝 Bonjour Print Services |
| 防火牆 | 允許 mDNS（連接埠 5353） |

### 燒錄中途停止

| 原因 | 對策 |
|------|------|
| WiFi 訊號弱 | 將 ESP32 移近路由器 |
| 網路壅塞 | 暫停其他大流量通訊 |
| 逾時 | 重新啟動 ESP32 後重試 |

### 燒錄後裝置無回應

| 原因 | 對策 |
|------|------|
| 程式錯誤 | 透過 USB 連接重新燒錄韌體 |
| WiFi 設定遺失 | 透過 USB 連接重新設定 WiFi |

---

## 重設 WiFi 設定

如要初始化 WiFi 設定：

1. 開啟「韌體燒錄」
2. 執行「清除整個 Flash（除錯用）」
3. 重新燒錄韌體
4. 重新設定 WiFi

---

## 安全注意事項

- 請僅在可信任的網路環境中使用
- 不建議在公共 WiFi 上使用
- 在正式環境中請考慮使用 VPN 或隔離的網路

---

## 相關文件

| 文件 | 內容 |
|------|------|
| [開始使用](./getting-started.md) | 初始設定步驟 |
| [程式燒錄_共通步驟](./01-program-setup-common.md) | 術語定義、所有微控制器共通步驟 |
| [程式燒錄_ESP32](./04-program-setup-esp32.md) | ESP32 特有設定 |
| [故障排除](./troubleshooting.md) | 問題解決指南 |
