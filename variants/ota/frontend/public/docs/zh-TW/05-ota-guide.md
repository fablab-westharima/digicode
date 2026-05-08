# OTA 設定指南 (選用)

**最後更新:** 2026-05-08

> ⚠️ **BLE / WiFi OTA 為 Beta 功能。** 基本燒錄與更新已驗證正常,但在邊緣情況可能發生斷線 / 重試。對穩定運作要求較高的環境建議使用 USB 燒錄。

> **本指南為選用功能。** DigiCode **只需 USB 線即可開始使用**。先透過 [開始使用](./getting-started.md) 中的 USB 流程熟悉操作,再視需要參閱本指南。

---

## 🚀 4 步驟完成 OTA 燒錄

啟用 WiFi OTA 的整體概況。第一次設定約 10 分鐘。

1. **韌體燒錄** (透過 USB,約 1 分鐘) → [詳細](#步驟-1-燒錄韌體)
2. **WiFi 設定** (透過 USB,輸入 SSID + 密碼,約 1 分鐘) → [詳細](#步驟-2-連接-esp32-到-wifi)
3. **裝置偵測** (Mac / Linux 標準 mDNS 自動 / Windows 需要 Bonjour 或 DigiCode Finder) → [詳細](#步驟-3-偵測裝置)
4. **WiFi OTA 燒錄** (~15 秒,之後不需連接線) → [詳細](#步驟-4-透過-wifi-ota-燒錄程式)

> 💡 **沒有 WiFi 環境 / 設定 WiFi 太麻煩** 時推薦 **[BLE 燒錄](#ble-燒錄-選用)** (僅需 FW 燒錄一次,不需 WiFi 設定)。

---

## ⚠️ Windows 使用者請注意

WiFi OTA 在 Windows 上屬於 **進階功能** (需安裝 Bonjour + 設定網路 / 防火牆)。Windows 初學者建議:

- **USB 燒錄** (DigiCode 內建 GUI 引導,無需額外安裝)
- **Bluetooth (BLE) OTA** (不需 USB 線,無需額外安裝,適合初學者)

Mac / Linux 使用者可以較順利地嘗試 WiFi OTA。

---

## WiFi OTA 是什麼 — 優缺點

WiFi OTA (Over-The-Air) 是透過 WiFi 無線燒錄程式的方式。一旦設定完成,不需要 USB 線就能更新程式。

| 觀點 | 評價 |
|---|---|
| ✅ 不需連接線 | 不需要每次插拔 USB |
| ✅ 最快速 (~15 秒) | 比 USB (~30 秒) 更快 |
| ✅ 批次更新 | 教室全體更新很有效 |
| ✅ 放入外殼的裝置 OK | 可更新成品 |
| ❌ 需要初始設定 | FW 燒錄 + WiFi 設定 (~10 分鐘) |
| ❌ 需要 WiFi 環境 | 電腦和 ESP32 需要在同 LAN |
| ❌ 需要 Bonjour / mDNS | Windows 需額外安裝 |
| ❌ 類比腳位限制 | WiFi 運作中 ADC2 (GPIO 0/2/4/12-15/25-27) 不可用,僅 ADC1 (GPIO 32-39) 可用 |
| ❌ 復原需要 USB | WiFi 設定遺失時需透過 USB 重新設定 |

> **建議中階以上使用**: WiFi OTA 發生問題時,可能需要透過 USB 重新燒錄韌體。

> ⚠️ **使用 WiFi OTA 時的類比腳位限制 (ESP32)**
>
> ESP32 在 WiFi 運作中無法使用 ADC2。使用 WiFi OTA 時,類比輸入 (電位器 / 光線感測器 / 距離感測器等) 請限制使用 **ADC1 (GPIO 32-39)**。
>
> - ✅ **可用 (ADC1)**: GPIO 32, 33, 34, 35, 36, 39
> - ❌ **不可用 (ADC2)**: GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27
> - 參考: Espressif 官方文件 [ADC Limitations](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/adc.html)
>
> 透過 USB 燒錄時 ADC2 完全可用。若你的專案需要的類比輸入超過 ADC1 的 6 個腳位,請考慮改用 USB 燒錄。

---

## 前提條件

1. **ESP32 開發板** (支援 WiFi OTA,`supportsOta: true`)
2. **WiFi 路由器** (ESP32 可連接的網路,與電腦同 LAN)
3. **裝置偵測工具** (依環境,後述)

---

## 步驟 1: 燒錄韌體

要使用 WiFi OTA / BLE,需要透過 USB 燒錄一次 **韌體** (OTA receiver)。

1. 透過 USB 線連接 ESP32 到電腦
2. 點擊左側選單的 **「韌體燒錄」**
3. 點擊 **「INSTALL」**
4. 選擇序列埠
5. 等待完成 (~1 分鐘)

> 💡 韌體燒錄一次後,通常不需要重新燒錄。執行全 Flash 清除後需要重新燒錄。

---

## 步驟 2: 連接 ESP32 到 WiFi

1. 透過 USB 連接 ESP32 (與韌體燒錄相同的連接)
2. 點擊左側選單的 **「WiFi 設定」**
3. 選擇序列埠並點擊 **「連接」**
4. 在 WiFi 設定對話框中輸入:
   - **SSID**: 連接目標 WiFi 的網路名稱
   - **密碼**: WiFi 密碼
5. 點擊 **「連線測試」**
6. 成功後顯示固定 IP 位址

> ⚠️ 連線測試失敗時設定不會儲存。請確認正確的 SSID 和密碼。

---

## 步驟 3: 偵測裝置

電腦取得 ESP32 IP 位址的方式。所需方式因 OS 而異。

### Mac / Linux

標準支援 mDNS,**不需額外安裝**。DigiCode 的 WiFi OTA 對話框自動偵測裝置。

### Windows (2 種方式)

#### A. 安裝 Bonjour (推薦)

Windows 標準不支援 mDNS,所以需安裝 Apple 的 Bonjour Print Services:

1. 從 https://support.apple.com/en-us/106380 下載 `BonjourPSSetup.exe`
2. 安裝 → 重新啟動電腦
3. 之後 DigiCode 標準 mDNS 偵測就能運作

#### B. DigiCode Finder (無法安裝 Bonjour / 受限環境)

[DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder/releases) 是 Windows 未安裝 Bonjour 環境的 mDNS 替代方案桌面應用程式。

| OS | 下載檔案 |
|---|---|
| Windows | `.exe` |
| (Mac / Linux 版本也有但標準 mDNS 已足夠) | `.dmg` / `.AppImage` |

**使用方法**:
1. 啟動 DigiCode Finder
2. 同網路上的 DigiCode 裝置自動偵測
3. 顯示裝置名稱、IP 位址、韌體版本
4. 點擊目標裝置的 **「選擇」** 按鈕 → IP 位址複製到剪貼簿
5. 多台裝置請勾選後點擊 **「選擇」** → JSON 格式複製多個 IP

---

## 步驟 4: 透過 WiFi OTA 燒錄程式

### 單台裝置

1. 在積木編輯器中建立程式
2. **「燒錄」** → **「WiFi OTA」**
3. 在裝置選擇對話框中:
   - mDNS 自動偵測有效的環境 → 從清單選擇
   - 否則 → 輸入 IP 位址 (從 DigiCode Finder 複製的值貼上)
4. 點擊 **「開始燒錄」** (~15 秒)

### 批次燒錄多台裝置

1. 在 DigiCode Finder 中選擇多台裝置並 JSON 複製
2. **「燒錄」** → **「WiFi OTA」**
3. 在裝置選擇對話框中顯示多台裝置
4. 勾選更新目標後點擊 **「開始批次燒錄」**

教室全台一斉更新很方便。

---

## BLE 燒錄 (選用)

藍牙低功耗的燒錄方式。沒有 WiFi 環境的地方、放入外殼的裝置更新、Windows 初學者代替方案。

### BLE 的優缺點

| 觀點 | 評價 |
|---|---|
| ✅ 不需 WiFi 環境 | 不需路由器 / 設定 |
| ✅ 不需連接線 | 不需要每次接 USB |
| ✅ Windows 也不需額外安裝 | Web Bluetooth 是 Chrome / Edge 標準 |
| ✅ 放入外殼的裝置 OK | 可更新成品 |
| ❌ 比 WiFi OTA 慢 (~40 秒) | 比 USB / WiFi OTA 慢 |
| ❌ FW 燒錄必要 | 與 WiFi OTA 同樣第一次需 USB |
| ❌ 配對距離限制 | 需要在數公尺內 |

### 前提條件

- 韌體燒錄完成 (與 [步驟 1](#步驟-1-燒錄韌體) 相同)
- 支援 Web Bluetooth 的瀏覽器 (Chrome / Edge)
- 支援開發板: 支援 BLE 的 ESP32 (`supportsBle: true`)

### 步驟

1. 在積木編輯器中建立程式
2. **「燒錄」** → **「BLE」**
3. 點擊 **「搜尋裝置」**
4. 在瀏覽器藍牙選擇對話框中選擇 **「DigiCode-XXXXXX」**
5. 點擊 **「配對」**
6. 開始燒錄 (~40 秒)

### BLE 故障排除

| 症狀 | 解決方法 |
|---|---|
| 找不到裝置 | 重新啟動 ESP32、重新啟動瀏覽器 |
| 配對失敗 | 靠近些、中斷其他 BLE 連接 |
| 燒錄中途停止 | 重新啟動 ESP32 後重試 |

---

## 詳細・運用

### 設定裝置名稱

管理多台裝置時很有用。

1. 透過 USB 連接開啟 **「WiFi 設定」**
2. 在 **「裝置名稱」** 欄位輸入新名稱
3. 點擊 **「儲存」**

**推薦命名規則:**
```
DigiCode-[用途]-[編號]
例: DigiCode-robot-001, DigiCode-class-02
```

### 重置 WiFi 設定

想初始化 WiFi 設定時:

1. 開啟 **「韌體燒錄」**
2. 執行 **「清除整個 Flash (偵錯用)」**
3. 重新燒錄韌體
4. 重新設定 WiFi

### 安全性注意事項

- 僅在信任的網路環境下使用
- 不推薦在公共 WiFi 上使用
- 生產環境請考慮使用 VPN 或隔離的網路

---

## 故障排除

### 未偵測到裝置

| 原因 | 解決方法 |
|---|---|
| 未連接 WiFi | 透過 USB 確認 WiFi 設定 |
| 不同網路 | 確認電腦和 ESP32 連接到相同 WiFi |
| 未安裝 Bonjour (Windows) | 安裝 Bonjour Print Services 或使用 DigiCode Finder |
| 防火牆 | 允許 mDNS (埠 5353) |

### 燒錄中途停止

| 原因 | 解決方法 |
|---|---|
| WiFi 訊號弱 | 將 ESP32 靠近路由器 |
| 網路擁塞 | 暫停其他大量通訊 |
| 逾時 | 重新啟動 ESP32 後重試 |

### 燒錄後裝置未回應

| 原因 | 解決方法 |
|---|---|
| 程式錯誤 | 透過 USB 重新燒錄韌體 |
| WiFi 設定遺失 | 透過 USB 重新設定 WiFi |

更多請參閱 [故障排除](./troubleshooting.md)。

---

## 相關文件

- [開始使用](./getting-started.md) — USB 基本流程
- [共通步驟](./01-program-setup-common.md) — 術語定義、燒錄方式概述
- [ESP32 燒錄指南](./04-program-setup-esp32.md) — ESP32 特定設定
- [故障排除](./troubleshooting.md) — 問題解決指南
- [DigiCode Finder GitHub](https://github.com/fablab-westharima/DigiCode-Finder) — Windows 用 mDNS 替代方案
