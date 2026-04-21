# Recommended Hardware List

List of verified devices for DigiCode. We recommend purchasing from trusted retailers for stable operation.

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
| **Sengoku Densho** | Akihabara store, in-store purchase | https://www.sengoku.co.jp/ |
| **Marutsu Online** | Corporate support, quality guarantee | https://www.marutsu.co.jp/ |
| **DigiKey** | Authorized international distributor | https://www.digikey.jp/ |
| **Mouser** | Authorized international distributor | https://www.mouser.jp/ |

---

## ESP32 Boards

| Product | Price (approx) | Notes | Link |
|---------|----------------|-------|------|
| **ESP32 NodeMCU (with expansion board)** | ¥1,782 | **Most recommended**. DC jack (6.5-16V) convenient for electronics projects | [Switch Science](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1,480~ | Standard development board. TELEC certified | [Akizuki](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) / [Mouser](https://www.mouser.jp/ProductDetail/Espressif-Systems/ESP32-DevKitC-32E?qs=GedFDFLaBXFpgD0kAZWDrQ%3D%3D) |
| **ESP32-DevKitC-VE** | ¥1,770~ | 8MB Flash/RAM, larger capacity | [Akizuki](https://akizukidenshi.com/catalog/g/g115674/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-VE/12091812) / [Mouser](https://www.mouser.jp/ProductDetail/Espressif-Systems/ESP32-DevKitC-VE?qs=vmHwEFxEFR%2BnPxzX%2FBK62A%3D%3D) |
| **ESPr Developer 32** | ¥2,200 | Japanese design, TELEC certified | [Switch Science](https://www.switch-science.com/products/3210) |

### Not Recommended Boards

| Product | Reason |
|---------|--------|
| NodeMCU-32S (cheap versions) | May have different pin layout |
| ESP32-CAM (OV2640) | Few pins, not suitable for servo control |
| ESP32-S2 | Different GPIO layout, some features unsupported |
| ESP32-C3 | Different ADC/touch sensor specifications |

---

## Servo Motors

### Recommended Servos (180 degrees)

| Product | Price (approx) | Use | Link |
|---------|----------------|-----|------|
| **SG90** | ¥440 | Humanoid standard, light load | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1,240 | Metal gear, medium load | [Akizuki](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | High torque | [Akizuki](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1,480 | High torque, large robots | [Akizuki](https://akizukidenshi.com/catalog/g/g112534/) |

### Recommended Servos (Continuous Rotation/360 degrees)

| Product | Price (approx) | Use | Link |
|---------|----------------|-----|------|
| **FS90R** | ¥500 | Continuous rotation, Wheel robot | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |

### Servo Power Notes

```
⚠️ Important Power Information
- Servos are unstable on USB power (500mA)
- External power (5V/2A+) required for multiple servos
- Cannot power servo from ESP32's 3.3V pin (needs 5V)
```

---

## Ultrasonic Sensors

| Product | Price (approx) | Use | Link |
|---------|----------------|-----|------|
| **HC-SR04** | ¥300~ | Standard ultrasonic sensor | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) / [Switch Science](https://www.switch-science.com/products/6080) / [Mouser](https://www.mouser.jp/ProductDetail/OSEPP-Electronics/HC-SR04?qs=wNBL%252BABd93PqZEhuhHkuOw%3D%3D) |

### HC-SR04 Notes

```
⚠️ Voltage Level Warning
- HC-SR04 operates at 5V, ESP32 at 3.3V
- Echo pin may output 5V
- Voltage divider recommended (1kΩ + 2kΩ)
```

---

## Temperature/Humidity Sensors

| Product | Price (approx) | Accuracy | Link |
|---------|----------------|----------|------|
| **DHT11** | ¥550 | Temp ±2°C, Humidity ±5% | [Akizuki](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22 (AM2302)** | ¥1,160 | Temp ±0.5°C, Humidity ±2% | [Akizuki](https://akizukidenshi.com/catalog/g/g107002/) |
| **SHT31 Module** | ¥1,280 | High precision I2C | [Akizuki](https://akizukidenshi.com/catalog/g/g112125/) / [Switch Science](https://www.switch-science.com/products/2853) |
| **BME280 Module** | ¥1,380~ | Temp+Humidity+Pressure | [Akizuki](https://akizukidenshi.com/catalog/g/g109421/) / [Switch Science](https://www.switch-science.com/products/2236) |

---

## Displays (OLED)

| Product | Size | Price (approx) | Link |
|---------|------|----------------|------|
| **0.96" OLED (White)** | 128x64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g112031/) |
| **0.96" OLED (Blue)** | 128x64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g115870/) |
| **Grove 0.96" OLED** | 128x64 | ¥1,247 | [Switch Science](https://www.switch-science.com/products/7002) |

---

## NeoPixel (WS2812B)

| Product | LED Count | Price (approx) | Link |
|---------|-----------|----------------|------|
| **NeoPixel Ring 12LED** | 12 | ¥1,078 | [Switch Science](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1,287 | [Switch Science](https://www.switch-science.com/products/1537) |
| **WS2812B 8LED Stick** | 8 | ¥350 | [Akizuki](https://akizukidenshi.com/catalog/g/g114307/) |
| **WS2812B Module (Single)** | 1 | ¥70 | [Akizuki](https://akizukidenshi.com/catalog/g/g108414/) |

### Power Notes

```
⚠️ Current Consumption
- Max 60mA per LED (white full brightness)
- 8 LEDs = max 480mA
- 16 LEDs = max 960mA
- External power (5V) required for many LEDs
```

---

## Motor Drivers

| Product | Current Rating | Price (approx) | Link |
|---------|----------------|----------------|------|
| **L298N 2A Dual Motor Controller** | 2A/ch | ¥2,180 | [Akizuki](https://akizukidenshi.com/catalog/g/g106680/) |
| **DRV8835 Motor Driver Module** | 1.2A/ch | ¥550 | [Akizuki](https://akizukidenshi.com/catalog/g/g109848/) |
| **TB6612FNG Dual DC Motor Driver Kit** | 1.2A/ch | ¥450 | [Akizuki](https://akizukidenshi.com/catalog/g/g111219/) / [Switch Science](https://www.switch-science.com/products/236) |

---

## Buzzers & Speakers

| Product | Type | Price (approx) | Link |
|---------|------|----------------|------|
| **Piezo Speaker** | Passive | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |

**DigiCode recommends "Passive Buzzer"** (supports melody playback)

---

## Robot Parts

### Recommended Configuration (Humanoid Biped)

| Part | Recommended | Qty | Unit Price | Link |
|------|-------------|-----|------------|------|
| ESP32 Board | ESP32 NodeMCU (with expansion board) | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Servo | SG90 | 4 | ¥440 | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| Ultrasonic Sensor | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| Buzzer | Piezo Speaker | 1 | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **Total** | | | **¥3,882** | |

### Recommended Configuration (Wheel Robot)

| Part | Recommended | Qty | Unit Price | Link |
|------|-------------|-----|------------|------|
| ESP32 Board | ESP32 NodeMCU (with expansion board) | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Continuous Servo | FS90R | 2 | ¥500 | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |
| Ultrasonic Sensor | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| **Total** | | | **¥3,082** | |

---

## Related Documents

- [Hardware Setup Guide](./hardware-setup.md)
- [Troubleshooting](./troubleshooting.md)
- [Getting Started](./getting-started.md)
