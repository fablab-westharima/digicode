# 硬體連接指南

如何將感測器和致動器連接到 ESP32。

> **建議：** 請參考[推薦硬體清單](./recommended-hardware.md)查看已驗證的裝置。使用經過測試的零件有助於避免問題。

## ESP32 腳位配置

ESP32 開發板有各種類型，但常見的腳位配置如下：

### GPIO（通用輸入/輸出）
- **GPIO 0-39**：數位輸入/輸出
- **GPIO 32-39**：僅類比輸入（ADC1）
- **GPIO 0, 2**：內建 LED（因開發板而異）

### 特殊腳位
- **GPIO 1, 3**：UART（序列）- 避免使用（用於燒錄）
- **GPIO 6-11**：僅 Flash 記憶體使用 - 無法使用
- **GPIO 34-39**：僅輸入（無上拉電阻）

### 電源
- **3.3V**：感測器和馬達的電源
- **5V**：透過 USB 的 5V（僅部分開發板）
- **GND**：接地（共同接地）

## 感測器連接

### 超音波距離感測器（HC-SR04）

**腳位配置：**
```
HC-SR04    ESP32
--------   ------
VCC    →   3.3V 或 5V
GND    →   GND
Trig   →   GPIO 5
Echo   →   GPIO 18
```

**注意：** 將 5V 感測器連接到 ESP32（3.3V）時，請在 Echo 腳位加裝分壓電路

### 溫濕度感測器（DHT11/DHT22）

**腳位配置：**
```
DHT11      ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

**注意：** 在 DATA 腳位和 VCC 之間連接 10kΩ 上拉電阻

### QTR 循跡感測器（8通道）

**腳位配置範例：**
```
QTR-8A     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
1      →   GPIO 36
2      →   GPIO 39
3      →   GPIO 34
4      →   GPIO 35
5      →   GPIO 32
6      →   GPIO 33
7      →   GPIO 25
8      →   GPIO 26
```

### 加速度計/陀螺儀（MPU6050）

**腳位配置（I2C）：**
```
MPU6050    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**注意：** 位址為 0x68（AD0=LOW）或 0x69（AD0=HIGH）。可在同一 I2C 匯流排上連接多個裝置

### 氣壓/溫濕度感測器（BME280 / BMP280）

**腳位配置（I2C）：**
```
BME280     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**注意：** 預設位址 0x76（SDO=LOW）或 0x77（SDO=HIGH）。BMP280 僅測量溫度和氣壓；BME280 另可測量濕度

### ToF 距離感測器（VL53L0X）

**腳位配置（I2C）：**
```
VL53L0X    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**注意：** 位址 0x29。使用多個裝置時，透過 XSHUT 腳位逐一啟動並修改位址

### 磁性編碼器（AS5600）

**腳位配置（I2C）：**
```
AS5600     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
DIR    →   GND（順時針為正方向）或 3.3V（逆時針為正方向）
```

**注意：** 固定位址 0x36。磁鐵置於軸心正上方，感測器與磁鐵距離保持 0.5–3mm

## 致動器連接

### 伺服馬達（SG90 等）

**腳位配置：**
```
Servo      ESP32
--------   ------
VCC    →   5V（建議使用外部電源）
GND    →   GND
Signal →   GPIO 13
```

**注意：**
- 使用多個伺服時請使用外部 5V 電源
- 將 ESP32 GND 和外部電源 GND 連接在一起

### 直流馬達（透過馬達驅動器）

**L298N 馬達驅動器範例：**
```
L298N      ESP32
--------   ------
IN1    →   GPIO 16
IN2    →   GPIO 17
ENA    →   GPIO 25（PWM）
GND    →   GND
```

**電源：**
- 將外部電源（7-12V）連接到 L298N VCC
- 將 L298N GND 和 ESP32 GND 連接在一起

### NeoPixel LED（WS2812B）

**腳位配置：**
```
NeoPixel   ESP32
--------   ------
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

**注意：** 使用多個 LED 時建議使用外部 5V 電源

## 通訊模組連接

### I2C LCD 顯示器（PCF8574 I2C 轉接板 + 16x2 LCD）

**腳位配置（I2C）：**
```
I2C LCD    ESP32
--------   ------
VCC    →   5V（建議）或 3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**注意：** 透過 PCF8574 轉接板上的跳線設定 I2C 位址（預設 0x27）。建議使用 5V 供電（3.3V 可能導致顯示亮度不足）

### TFT 顯示器（SPI — ST7789 / ILI9341）

**腳位配置（硬體 SPI）：**
```
TFT        ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
CS     →   GPIO 5
DC     →   GPIO 2
RST    →   GPIO 4
SCK    →   GPIO 18（SPI CLK）
MOSI   →   GPIO 23（SPI MOSI）
MISO   →   GPIO 19（SPI MISO，可省略）
BL     →   3.3V 或背光控制腳位
```

**注意：** 在積木中選擇驅動 IC（ST7789 / ILI9341 / ST7735）。若與 RFID 共用 SPI 匯流排，請更改 CS 腳位

### RFID 讀卡機（RC522，SPI）

**腳位配置（硬體 SPI）：**
```
RC522      ESP32
--------   ------
3.3V   →   3.3V
GND    →   GND
CS     →   GPIO 5
SCK    →   GPIO 18（SPI CLK）
MOSI   →   GPIO 23（SPI MOSI）
MISO   →   GPIO 19（SPI MISO）
RST    →   GPIO 22
IRQ    →   不連接（輪詢方式不需要）
```

**注意：** RC522 僅支援 3.3V（禁止連接 5V）。若與 TFT 共用 SPI 匯流排，請更改 CS 腳位。無線電法相關注意事項請參閱[推薦硬體清單](./recommended-hardware.md)

### IR 接收模組（VS1838B）

**腳位配置：**
```
VS1838B    ESP32
--------   ------
VCC    →   3.3V 或 5V
GND    →   GND
OUT    →   GPIO 14
```

**注意：** OUT 腳位已在模組端內建上拉電阻。使用 IRremoteESP8266 函式庫（也適用於 ESP32）

### DFPlayer Mini（MP3 播放，UART）

**腳位配置：**
```
DFPlayer   ESP32
--------   ------
VCC    →   5V
GND    →   GND
RX     →   GPIO 12（串聯 1kΩ 電阻）
TX     →   GPIO 14
SPK+   →   喇叭（+）
SPK−   →   喇叭（−）
```

**注意：** DFPlayer RX 腳位必須串聯 1kΩ 保護電阻。使用 SoftwareSerial（ESP32 RX=14，TX=12）。MP3 檔案請以 `/01/001.mp3` 格式存放於 microSD 卡

## 攝影機模組連接

ESP32 攝影機模組已內建腳位配置，只需在積木中選擇開發板類型即可完成設定，無需手動配置腳位。

### ESP32-CAM（AI-Thinker）

基板上已內建攝影機連接器，請另行連接 OV2640 攝影機模組。

**燒錄注意事項：**
- 燒錄前請用跳線將 IO0 短接至 GND，透過 USB-UART 轉接板燒錄
- 燒錄完成後移除跳線並重新上電
- ESP32-CAM 無 USB 埠，需使用 USB-UART 轉接板（3.3V）

**電源：** 5V（USB 供電）或外部 5V。直接連接 3.3V 腳位不建議（攝影機運作時電流需求大，易導致不穩定）

### XIAO ESP32S3 Sense

攝影機（OV2640）和麥克風已內建於基板。透過專用軟排線連接攝影機即可使用，無需額外外部接線。

## CAN Bus 連接（TWAI）

使用 ESP32 內建 TWAI 控制器。需要外部 CAN 收發器 IC（如 SN65HVD230）。

**腳位配置：**
```
SN65HVD230  ESP32
----------  ------
VCC     →   3.3V
GND     →   GND
D（TXD） →  GPIO 5（TX）
R（RXD） →  GPIO 4（RX）
CANH    →   CAN 匯流排 CANH 線
CANL    →   CAN 匯流排 CANL 線
```

**注意：** 在 CAN 匯流排兩端各連接 120Ω 終端電阻。SN65HVD230 為 3.3V 工作電壓。法規相關注意事項請參閱[推薦硬體清單](./recommended-hardware.md)

## 接線最佳實務

### 1. 電源管理
- 感測器使用 3.3V，馬達使用外部電源
- 務必將 GND 連接在一起
- 確認電源容量（ESP32 3.3V 腳位最大約 200mA）

### 2. 雜訊預防
- 保持馬達和 ESP32 之間的距離
- 在馬達電源上加裝電容
- 接線盡可能短

### 3. 安全
- 通電前確認接線以防止短路
- 對過電流使用適當的保險絲和保護電路
- 高電壓（12V+）要特別小心

## 故障排除

### 感測器無法運作
1. 重新確認接線（VCC、GND、Signal）
2. 確認電壓等級（3.3V/5V）
3. 確認是否需要上拉/下拉電阻

### 馬達無法運轉
1. 確認是否供應外部電源
2. 確認 GND 連接
3. 確認馬達驅動器接線

## 參考資料

- [推薦硬體清單](./recommended-hardware.md) - 已驗證裝置清單
- [ESP32 官方文件](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [感測器規格書](各感測器製造商網站)
