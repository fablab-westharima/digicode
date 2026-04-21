# Recommended Hardware List

**Last Updated:** 2026-04-21

List of verified devices for DigiCode. We recommend purchasing from trusted retailers for stable operation.

---

## Important Notice

> **About Cheap Copies/Clones**
>
> Inexpensive clones sold on AliExpress, Wish, Temu, etc. have reported issues:
> - Different pin layouts
> - Voltage/current specs differ from label
> - Different driver ICs (incompatible)
> - Large quality variations
>
> We cannot provide support for these, so please purchase from recommended retailers.

---

## Recommended Retailers

| Retailer | Features | URL |
|----------|----------|-----|
| **Akizuki Denshi** | Long-established electronics parts, wide selection | https://akizukidenshi.com/ |
| **Switch Science** | Maker-focused, Japanese documentation | https://www.switch-science.com/ |
| **Sengoku Densho** | Akihabara storefront, in-store purchase available | https://www.sengoku.co.jp/ |
| **Marutsu Online** | Corporate support, quality guarantee | https://www.marutsu.co.jp/ |
| **M5Stack Official Store** | Primary source for M5Stack series | https://m5stack.com/ |
| **Seeed Studio Official** | Primary source for XIAO series | https://www.seeedstudio.com/ |
| **DigiKey** | Authorized international distributor | https://www.digikey.jp/ |
| **Mouser** | Authorized international distributor | https://www.mouser.jp/ |

---

## ESP32 Boards

DigiCode is a block editor **exclusively for ESP32-based boards**.

### Generic ESP32

| Product | Approx. Price | Notes | Link |
|---------|---------------|-------|------|
| **ESP32 NodeMCU (with expansion board)** | ¥1,782 | Versatile beginner setup. DC jack (6.5–16V) included | [Switch Science](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1,480+ | Standard dev board, TELEC certified | [Akizuki](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) |
| **ESP32-DevKitC-VE** | ¥1,770+ | 8MB Flash/RAM, large capacity | [Akizuki](https://akizukidenshi.com/catalog/g/g115674/) |
| **ESPr Developer 32** | ¥2,200 | Japanese design, TELEC certified | [Switch Science](https://www.switch-science.com/products/3210) |

### M5Stack Series

| Product | Approx. Price | Notes | Link |
|---------|---------------|-------|------|
| **M5StampS3A + Dedicated Breakout Board** | — | **DigiCode recommended main MCU (dedicated breakout board in development; details to be added at launch)** | [M5Stack Official](https://shop.m5stack.com/) |
| **M5StickC Plus2** | ¥4,400 | Compact, with display | [Switch Science](https://www.switch-science.com/products/9426) |
| **ATOM Lite** | ¥1,815 | Ultra-compact, 1 NeoPixel | [Switch Science](https://www.switch-science.com/products/6262) |
| **ATOM Matrix** | ¥2,420 | 5×5 NeoPixel matrix | [Switch Science](https://www.switch-science.com/products/6260) |
| **M5Camera / Unit Cam S3 / Timer Cam** | ¥3,000+ | Camera-capable modules (BP7 compatible) | [M5Stack Official](https://shop.m5stack.com/) |

### Seeed XIAO Series

| Product | Approx. Price | Notes | Link |
|---------|---------------|-------|------|
| **XIAO ESP32S3** | ¥1,100 | Ultra-compact, USB-C | [Switch Science](https://www.switch-science.com/products/8887) |
| **XIAO ESP32S3 Sense** | ¥2,530 | Built-in camera + microphone (BP7 compatible) | [Switch Science](https://www.switch-science.com/products/8868) |
| **XIAO ESP32C3** | ¥980 | Low power, RISC-V | [Switch Science](https://www.switch-science.com/products/8363) |
| **XIAO ESP32C6** | ¥1,280 | Matter compatible | [Seeed Studio](https://www.seeedstudio.com/Seeed-XIAO-ESP32C6-p-5884.html) |

### Supported with Limitations

| Product | Limitation |
|---------|------------|
| ESP32-CAM (OV2640) | Few available pins; not suitable for servo control (use as camera only) |

### Not Supported by DigiCode

| Product | Reason |
|---------|--------|
| Arduino Uno / Nano | DigiCode is ESP32-exclusive; not supported |
| Raspberry Pi Pico (base) | No WiFi; functionality is severely limited |
| ESP8266 | DigiCode does not support ESP8266 |
| Other MCUs (Renesas / STM, etc.) | No support planned |

---

## Servo Motors

### Recommended Servos (180°)

| Product | Approx. Price | Use Case | Link |
|---------|---------------|----------|------|
| **SG90** | ¥440 | Standard biped robot servo, light load | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1,240 | Metal gear, medium load | [Akizuki](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | High torque | [Akizuki](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1,480 | High torque, large robots | [Akizuki](https://akizukidenshi.com/catalog/g/g112534/) |

### Recommended Servos (Continuous Rotation / 360°)

| Product | Approx. Price | Use Case | Link |
|---------|---------------|----------|------|
| **FS90R** | ¥500 | Continuous rotation, for Wheel robots | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |

### Servo Usage Notes

```
⚠️ Important power notes
- Servo motors are unstable on USB power (500 mA)
- Use external power (5V/2A or more) when running multiple servos
- Do NOT power servos from the ESP32's 3.3V pin (5V required)
```

---

## Sensors

### Ultrasonic Sensors

| Product | Approx. Price | Use Case | Link |
|---------|---------------|----------|------|
| **HC-SR04** | ¥300+ | Standard ultrasonic sensor | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) / [Switch Science](https://www.switch-science.com/products/6080) |
| **VL53L0X ToF Sensor** | ¥1,500+ | High-accuracy distance measurement (30–1200 mm) | [Switch Science](https://www.switch-science.com/products/7385) |

### Temperature, Humidity & Environmental Sensors

| Product | Approx. Price | Accuracy | Link |
|---------|---------------|----------|------|
| **DHT11** | ¥550 | Temp ±2°C, Humidity ±5% | [Akizuki](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22 (AM2302)** | ¥1,160 | Temp ±0.5°C, Humidity ±2% | [Akizuki](https://akizukidenshi.com/catalog/g/g107002/) |
| **BME280 Module** | ¥1,380+ | Temp + humidity + pressure (high accuracy) | [Akizuki](https://akizukidenshi.com/catalog/g/g109421/) |
| **BMP280 Module** | ¥550+ | Temp + pressure (no humidity) | [Akizuki](https://akizukidenshi.com/catalog/g/g109058/) |

### Motion & Orientation Sensors

| Product | Approx. Price | Use Case | Link |
|---------|---------------|----------|------|
| **MPU6050 Module** | ¥500+ | Accelerometer + gyro (inverted pendulum, micromouse) | [Akizuki](https://akizukidenshi.com/catalog/g/g109026/) |
| **AS5600 Magnetic Encoder Module** | ¥600+ | Absolute angle sensor | [Switch Science](https://www.switch-science.com/products/9069) |

### HC-SR04 Usage Notes

```
⚠️ Voltage level note
- HC-SR04 operates at 5V; ESP32 operates at 3.3V
- Echo pin may output 5V
- Use a voltage divider (1kΩ + 2kΩ) on the Echo pin
```

---

## Displays

### OLED (SSD1306)

| Product | Size | Approx. Price | Link |
|---------|------|---------------|------|
| **0.96" OLED (White)** | 128×64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g112031/) |
| **0.96" OLED (Blue)** | 128×64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g115870/) |

### Character LCD (I2C 16×2)

| Product | Approx. Price | Notes | Link |
|---------|---------------|-------|------|
| **I2C 16×2 Character LCD** | ¥800+ | Via PCF8574, inexpensive and popular | [Akizuki](https://akizukidenshi.com/catalog/g/g109109/) |

### TFT (ILI9341 / ST7789 / ST7735)

| Product | Size | Approx. Price | Notes |
|---------|------|---------------|-------|
| **ST7789 1.3" TFT** | 240×240 | ¥1,500+ | SPI, color |
| **ILI9341 2.4" TFT** | 240×320 | ¥1,800+ | SPI, large screen |

---

## NeoPixel (WS2812B)

| Product | LEDs | Approx. Price | Link |
|---------|------|---------------|------|
| **NeoPixel Ring 12LED** | 12 | ¥1,078 | [Switch Science](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1,287 | [Switch Science](https://www.switch-science.com/products/1537) |
| **WS2812B 8LED Stick** | 8 | ¥350 | [Akizuki](https://akizukidenshi.com/catalog/g/g114307/) |
| **WS2812B Module (single)** | 1 | ¥70 | [Akizuki](https://akizukidenshi.com/catalog/g/g108414/) |

### Power Notes

```
⚠️ Current consumption
- Up to 60 mA per LED (white, full brightness)
- 8 LEDs = up to 480 mA
- 16 LEDs = up to 960 mA
- Large LED arrays require external power (5V)
```

---

## Motor Drivers

| Product | Current Rating | Approx. Price | Link |
|---------|---------------|---------------|------|
| **L298N 2A Dual Motor Controller** | 2A/ch | ¥2,180 | [Akizuki](https://akizukidenshi.com/catalog/g/g106680/) |
| **DRV8835 Motor Driver Module** | 1.2A/ch | ¥550 | [Akizuki](https://akizukidenshi.com/catalog/g/g109848/) |
| **TB6612FNG Dual DC Motor Drive Kit** | 1.2A/ch | ¥450 | [Akizuki](https://akizukidenshi.com/catalog/g/g111219/) / [Switch Science](https://www.switch-science.com/products/236) |

---

## Buzzers & Audio

| Product | Type | Approx. Price | Link |
|---------|------|---------------|------|
| **Piezo Speaker (Passive)** | Passive | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **DFPlayer Mini (MP3 Player)** | MP3 | ¥600+ | [Akizuki](https://akizukidenshi.com/catalog/g/g113277/) |

**DigiCode recommends passive buzzers** (melody playback supported)

---

## Robot-Specific

### Recommended Build (Humanoid Biped)

| Part | Recommended | Qty | Unit Price | Link |
|------|-------------|-----|------------|------|
| ESP32 Board | ESP32 NodeMCU (with expansion board) | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Servo | SG90 | 4 | ¥440 | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| Ultrasonic sensor | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| Buzzer | Piezo speaker | 1 | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **Total** | | | **¥3,882** | |

> Once the M5StampS3A + dedicated breakout board becomes available, a more compact build will be recommended.

### Recommended Build (Wheel Robot)

| Part | Recommended | Qty | Unit Price | Link |
|------|-------------|-----|------------|------|
| ESP32 Board | ESP32 NodeMCU (with expansion board) | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Continuous rotation servo | FS90R | 2 | ¥500 | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |
| Ultrasonic sensor | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| **Total** | | | **¥3,082** | |

---

## Related Documents

- [Hardware Setup Guide](./hardware-setup.md)
- [Troubleshooting](./troubleshooting.md)
- [Getting Started](./getting-started.md)
