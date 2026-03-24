# 程式燒錄 - RP2040

**最後更新:** 2025-12-28

---

## 支援的開發板

- Raspberry Pi Pico
- Pimoroni Tiny 2040
- 其他 RP2040 系列開發板

---

## RP2040 特性

RP2040 是 Raspberry Pi 基金會開發的低成本微控制器：

- **Bootloader:** 固定在 ROM 中（始終可啟動）
- **連接方式:** 僅 USB（虛擬序列埠）
- **燒錄格式:** UF2（USB Flashing Format）
- **特別準備:** 無（Bootloader 始終可用）

---

## 燒錄步驟（USB 連接）

### 準備工作

1. **進入 Boot 模式**
   - 將 RP2040 從 PC 斷開
   - 按住 BOOTSEL 按鈕同時連接到 PC
   - 會出現名為 `RPI-RP2` 的磁碟機

   ```bash
   # 在 Mac 上驗證：
   ls /Volumes/
   ```

   範例輸出：
   ```
   Macintosh HD
   RPI-RP2
   ```

   在 Windows 上，在檔案總管中確認 `RPI-RP2` 磁碟機

2. **在 DigiCode 生成 UF2 檔案**
   - 前往 [DigiCode](https://digicode-frontend.pages.dev)
   - 登入
   - 開發板選擇：選擇 **RP2040**
   - 語言：選擇 **Arduino C++**
   - 建立您的程式（在 Blockly 中排列積木）
   - 點選**編譯**按鈕
   - 出現**下載**按鈕 → 點選它
   - `*.uf2` 檔案已下載

3. **將 UF2 檔案複製到 RP2040**
   ```bash
   # 在 Mac 上
   cp ~/Downloads/*.uf2 /Volumes/RPI-RP2/

   # 在 Linux 上
   cp ~/Downloads/*.uf2 /media/<使用者名稱>/RPI-RP2/
   ```

   在 Windows 上，拖放到檔案總管的 `RPI-RP2` 磁碟機

4. **燒錄完成**
   - 複製後，RP2040 會自動重置
   - `RPI-RP2` 磁碟機消失（程式開始執行）
   - 在序列監視器中確認輸出

---

## 使用序列監視器驗證運作

透過序列監視器確認 RP2040 程式輸出。

### 使用 Arduino IDE

1. 開啟 Arduino IDE
2. **工具 → 開發板** → 選擇 **Raspberry Pi Pico**
3. **工具 → 序列埠** → 選擇 RP2040 連接埠
4. **工具 → 序列監視器**

### 命令列

```bash
# 在 Mac 上
ls -la /dev/tty.usbmodem*
screen /dev/tty.usbmodem12301 115200

# 在 Linux 上
ls -la /dev/ttyACM*
screen /dev/ttyACM0 115200

# 在 Windows 上（PowerShell）
Get-WmiObject Win32_SerialPort
```

退出：`Ctrl+A` → `Ctrl+X`（GNU screen）

---

## Boot 模式無回應時

### 驗證步驟

1. **確認開發板上的 LED**
   - LED 閃爍/亮起 → 韌體正在執行
   - LED 熄滅 → 在 Boot 模式等待

2. **確認 BOOTSEL 按鈕位置**
   - Raspberry Pi Pico：開發板頂部的黑色按鈕
   - Pimoroni Tiny 2040：小按鈕（使用放大鏡）

3. **重置並重試**
   ```bash
   # 斷開 RP2040，等待3秒
   # 按住 BOOTSEL 同時連接
   ```

### RP2040 完全無回應時

1. **嘗試其他 USB 線**
   - 使用高品質的資料傳輸線
   - 確認不是充電專用線

2. **嘗試其他電腦**
   - 在另一台電腦上測試以驗證 Boot 模式

3. **重新下載 UF2**
   - 在 DigiCode 生成新的 UF2 檔案

---

## 故障排除

| 症狀 | 原因 | 解決方法 |
|------|------|----------|
| RPI-RP2 磁碟機未顯示 | BOOTSEL 未按下 | 連接時按住按鈕 |
| 複製 UF2 後無回應 | UF2 檔案損壞 | 重新下載 |
| 序列輸出無顯示 | 波特率錯誤 | 確認是 115200 bps |
| 無法進入 Boot 模式 | 硬體故障 | 嘗試其他 RP2040 |

---

## 參考資料

- [Raspberry Pi Pico 官方文件](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html)
- [UF2 格式](https://github.com/microsoft/uf2)

---

## 相關文件

- [共通步驟](./01-program-setup-common.md)
- [Arduino 燒錄指南](./03-program-setup-arduino.md)
- [ESP32 燒錄指南](./04-program-setup-esp32.md)
