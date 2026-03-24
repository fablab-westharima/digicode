# 程式燒錄 - Arduino

**最後更新:** 2025-12-28

---

## 支援的開發板

- Arduino Uno
- Arduino Nano
- Arduino Nano（舊版 Bootloader）
- Arduino Leonardo
- 其他 ATmega328P / ATmega32U4 開發板

---

## Arduino 特性

Arduino 是使用 AVR 微控制器的標準開發板：

- **語言:** 僅 Arduino C++（C/C++）
- **連接方式:** USB（虛擬序列埠）或 FTDI 序列轉接器
- **Bootloader:** 固定在 ROM 中（通常不需要更換）
- **燒錄格式:** Intel HEX 或 Binary

---

## 燒錄步驟

### 方法1：USB 有線連接

**支援的開發板：**
- Arduino Uno（原生 USB）
- Arduino Nano（原生 USB）
- Arduino Leonardo（ATmega32U4）

#### 準備工作

1. **連接到 PC**
   - 使用 USB 線將 Arduino 連接到 PC
   - 在 Arduino IDE 或 `dmesg` 中確認序列埠

   ```bash
   # 在 Mac 上
   ls -la /dev/tty.usbmodem*
   # 或
   ls -la /dev/tty.usbserial*

   # 在 Linux 上
   ls -la /dev/ttyUSB*
   # 或
   ls -la /dev/ttyACM*
   ```

2. **在 DigiCode 生成 Binary**
   - 前往 [DigiCode](https://digicode-frontend.pages.dev)
   - 登入
   - 開發板選擇：選擇 **Arduino Uno** 或 **Arduino Nano**
   - 語言：選擇 **Arduino C++**
   - 建立您的程式
   - 點選**編譯**
   - `*.hex` 或 `*.bin` 檔案可供下載

3. **使用 avrdude 燒錄（命令列）**

   ```bash
   # Arduino Uno
   avrdude -p atmega328p -c arduino -P /dev/tty.usbmodem14201 -b 115200 -D -U flash:w:program.hex:i

   # Arduino Nano（標準 bootloader）
   avrdude -p atmega328p -c arduino -P /dev/tty.usbserial-14101 -b 57600 -D -U flash:w:program.hex:i

   # Arduino Nano（舊版 Bootloader）
   avrdude -p atmega328p -c arduino -P /dev/tty.usbserial-14101 -b 115200 -D -U flash:w:program.hex:i
   ```

   **參數說明：**
   - `-p atmega328p`：MCU 類型（Uno / Nano）
   - `-c arduino`：開發板類型
   - `-P`：序列埠（根據您的環境調整）
   - `-b`：波特率（Uno：115200、Nano：57600）
   - `-D`：跳過 EEPROM 清除
   - `-U flash:w:`：寫入 flash 記憶體

4. **燒錄完成**
   ```
   avrdude: safemode: Fuses OK (E:00, H:00, L:FF)
   avrdude done.  Thank you.
   ```

#### 使用 Arduino IDE 燒錄（GUI）

1. 開啟 Arduino IDE
2. **工具 → 開發板** → 選擇您的開發板
3. **工具 → 序列埠** → 選擇已連接的連接埠
4. **草稿碼 → 使用 Binary 燒錄**（已準備 HEX 檔案）
5. 或按 Ctrl+U 直接上傳程式碼

---

### 方法2：透過 FTDI 序列轉接器

**支援：**
- Arduino Nano（透過 FTDI 的 TX/RX）
- Arduino 相容開發板（TX/RX 腳位外露）
- **不建議：** 原生 USB 開發板（Uno / Leonardo）

#### 準備工作

1. **連接 FTDI 轉接器**
   ```
   FTDI GND  → Arduino GND
   FTDI TX   → Arduino RX（腳位 0）
   FTDI RX   → Arduino TX（腳位 1）
   FTDI 5V   → Arduino 5V
   ```

   **注意：** 務必確認電壓（3.3V / 5V）

2. **在 DigiCode 生成 Binary**
   -（與方法1相同）

3. **使用 avrdude 燒錄**
   ```bash
   # 使用 FTDI
   avrdude -p atmega328p -c ftdi -P /dev/tty.usbserial-FT3JHQ2H -b 115200 -D -U flash:w:program.hex:i
   ```

   **參數變更：**
   - `-c ftdi`：將開發板類型變更為 FTDI
   - `-P`：FTDI 序列埠
   - `-b`：通常為 115200 bps

4. **確認 FTDI 驅動程式**
   - Mac / Linux：通常已預先安裝
   - Windows：安裝 [FTDI 驅動程式](https://ftdichip.com/drivers/)

#### 確認電路

```bash
# 確認 FTDI 板是否被識別
dmesg | grep FTDI

# 或
ls -la /dev/tty.usbserial*
```

---

## 使用序列監視器驗證運作

使用 Arduino IDE：

1. **工具 → 序列監視器**
2. 波特率：**9600 bps**（如果程式使用 `Serial.begin(9600)`）
3. 顯示 Arduino 的輸出

命令列：

```bash
# 在 Mac 上
screen /dev/tty.usbmodem14201 9600

# 在 Linux 上
screen /dev/ttyACM0 9600
```

退出：`Ctrl+A` → `Ctrl+X`

---

## 識別開發板/Bootloader

對於 Arduino Nano，版本確認很重要：

### 識別方法

1. **沒有 A4-A5 跳線的舊開發板**
   → 可能是舊版 Bootloader

2. **使用 avrdude 自動偵測**
   ```bash
   # 透過燒錄時的 -b 參數識別
   # 57600 bps：標準 bootloader
   # 115200 bps：舊版 Bootloader
   ```

3. **在 DigiCode 中確認**
   - 可以在開發板選擇中選擇 `Arduino Nano（舊版 Bootloader）`
   - 生成 115200 bps 的 binary

---

## 故障排除

| 症狀 | 原因 | 解決方法 |
|------|------|----------|
| 序列埠未顯示 | USB 驅動程式缺失 | 在 Arduino IDE 中確認驅動程式（Windows） |
| `avrdude: ser_open(): can't open device` | 連接埠名稱錯誤 | 使用 `ls /dev/tty.*` 確認 |
| `avrdude: stk500_recv(): programmer is not responding` | 波特率錯誤 | 確認舊版 Bootloader 設定 |
| 燒錄後程式無法執行 | Bootloader 損壞 | 使用 Arduino IDE 刷入 bootloader |
| FTDI 連接後無回應 | TX/RX 接反 | 確認傳輸線接線 |

---

## 安裝 avrdude

### Mac

```bash
brew install avrdude
```

### Linux（Ubuntu/Debian）

```bash
sudo apt-get install avrdude
```

### Windows

- [AVRDUDE 下載](https://www.nongnu.org/avrdude/)
- 或與 Arduino IDE 一起安裝

---

## 參考資料

- [Arduino 官方文件](https://docs.arduino.cc/)
- [AVRDUDE 手冊](https://www.nongnu.org/avrdude/user-manual/avrdude_4.html)
- [ATmega328P 規格書](https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-UART-Automotive-Microcontroller-ATmega328P_Datasheet.pdf)

---

## 相關文件

- [共通步驟](./01-program-setup-common.md)
- [ESP32 燒錄指南](./04-program-setup-esp32.md)
- [OTA 設定指南](./05-ota-guide.md)（ESP32 OTA 燒錄用）
