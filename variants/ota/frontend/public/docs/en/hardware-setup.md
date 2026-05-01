# Hardware Setup Guide

**Last updated:** 2026-05-02

How to connect ESP32 to sensors and actuators, organized by component.

> **Recommended:** Check [Recommended Hardware List](./recommended-hardware.md) for verified devices. Using tested parts helps avoid issues.

---

## 🚀 Find by Component

| Component | Category | Jump |
|---|---|---|
| Ultrasonic distance (HC-SR04) | Sensor (digital) | [→](#ultrasonic-distance-sensor-hc-sr04) |
| Temperature/humidity (DHT11 / DHT22) | Sensor (1-wire) | [→](#temperaturehumidity-sensor-dht11-dht22) |
| Line tracking (QTR-8) | Sensor (analog) | [→](#qtr-line-sensor-8ch) |
| Accelerometer / gyro (MPU6050) | Sensor (I2C) | [→](#accelerometer-gyroscope-mpu6050) |
| Pressure / T+H (BME280 / BMP280) | Sensor (I2C) | [→](#pressure-temperature-humidity-sensor-bme280-bmp280) |
| ToF distance (VL53L0X) | Sensor (I2C) | [→](#tof-distance-sensor-vl53l0x) |
| Magnetic encoder (AS5600) | Sensor (I2C) | [→](#magnetic-encoder-as5600) |
| Servo (SG90, etc.) | Actuator | [→](#servo-motor-sg90-etc) |
| DC motor (via L298N) | Actuator | [→](#dc-motor-via-motor-driver) |
| NeoPixel (WS2812B) | Actuator | [→](#neopixel-led-ws2812b) |
| LCD (16x2 + PCF8574) | Comm module (I2C) | [→](#i2c-lcd-display) |
| TFT (ST7789 / ILI9341) | Comm module (SPI) | [→](#tft-display-spi) |
| RFID (RC522) | Comm module (SPI) | [→](#rfid-reader-rc522) |
| IR receiver (VS1838B) | Comm module | [→](#ir-receiver-module-vs1838b) |
| DFPlayer Mini (MP3) | Comm module (UART) | [→](#dfplayer-mini-mp3) |
| ESP32-CAM / XIAO Sense | Camera | [→](#camera-module-connections) |
| CAN Bus (SN65HVD230) | Comm | [→](#can-bus-connection-twai) |

---

## ESP32 Pin Quick Reference

ESP32 development boards vary, but the common essentials:

| Pin | Use | Note |
|---|---|---|
| **GPIO 0-39** | Digital I/O | — |
| **GPIO 32-39** | Analog input only (ADC1) | ADC2 conflicts when WiFi is in use |
| **GPIO 0, 2** | Built-in LED (board-dependent) | — |
| **GPIO 1, 3** | UART (serial) | Used for programming, avoid |
| **GPIO 6-11** | Flash memory only | Cannot use |
| **GPIO 34-39** | Input only | No pull-up resistor |
| **3.3V** | Sensor power | Max ~200mA |
| **5V** | USB 5V (some boards) | Use external power for motors |
| **GND** | Ground | Common ground required |

> 💡 **I2C default pins**: SDA = GPIO 21, SCL = GPIO 22 (ESP32 default)
> 💡 **SPI default pins**: SCK = GPIO 18, MOSI = GPIO 23, MISO = GPIO 19 (hardware SPI)

---

## Sensor Connections

### Ultrasonic Distance Sensor (HC-SR04)

```
HC-SR04    ESP32
--------   ------
VCC    →   3.3V or 5V
GND    →   GND
Trig   →   GPIO 5
Echo   →   GPIO 18
```

**Note:** When connecting 5V sensors to ESP32 (3.3V), add a voltage divider on the Echo pin.

### Temperature/Humidity Sensor (DHT11 / DHT22)

```
DHT11      ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

**Note:** Connect a 10kΩ pull-up resistor between DATA and VCC.

### QTR Line Sensor (8ch)

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

### Accelerometer / Gyroscope (MPU6050)

```
MPU6050    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Address is 0x68 (AD0=LOW) or 0x69 (AD0=HIGH). Multiple units can share the same I2C bus.

### Pressure / Temperature / Humidity Sensor (BME280 / BMP280)

```
BME280     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Default address 0x76 (SDO=LOW) or 0x77 (SDO=HIGH). BMP280 measures temperature and pressure only; BME280 also measures humidity.

### ToF Distance Sensor (VL53L0X)

```
VL53L0X    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Address 0x29. When using multiple units, use the XSHUT pin to boot each individually and change its address.

### Magnetic Encoder (AS5600)

```
AS5600     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
DIR    →   GND (clockwise positive) or 3.3V (counter-clockwise positive)
```

**Note:** Fixed address 0x36. Mount magnet centered above shaft; keep sensor distance 0.5–3mm.

---

## Actuator Connections

### Servo Motor (SG90, etc.)

```
Servo      ESP32
--------   ------
VCC    →   5V (external power recommended)
GND    →   GND
Signal →   GPIO 13
```

**Notes:**
- Use external 5V power when using multiple servos
- Connect ESP32 GND and external power GND together

### DC Motor (via Motor Driver)

**L298N motor driver example:**

```
L298N      ESP32
--------   ------
IN1    →   GPIO 16
IN2    →   GPIO 17
ENA    →   GPIO 25 (PWM)
GND    →   GND
```

**Power:**
- Connect external power (7-12V) to L298N VCC
- Connect L298N GND and ESP32 GND together

### NeoPixel LED (WS2812B)

```
NeoPixel   ESP32
--------   ------
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

**Note:** External 5V power recommended for many LEDs.

---

## Communication Module Connections

### I2C LCD Display

PCF8574 I2C adapter + 16x2 LCD.

```
I2C LCD    ESP32
--------   ------
VCC    →   5V (recommended) or 3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Set I2C address via the jumper on the PCF8574 adapter (default 0x27). 5V power recommended for LCD (3.3V may result in dim display).

### TFT Display (SPI)

ST7789 / ILI9341 etc., hardware SPI.

```
TFT        ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
CS     →   GPIO 5
DC     →   GPIO 2
RST    →   GPIO 4
SCK    →   GPIO 18 (SPI CLK)
MOSI   →   GPIO 23 (SPI MOSI)
MISO   →   GPIO 19 (SPI MISO, optional)
BL     →   3.3V or backlight control pin
```

**Note:** Select driver IC (ST7789 / ILI9341 / ST7735) in the block. Change CS pin if sharing SPI bus with RFID.

### RFID Reader (RC522)

Hardware SPI.

```
RC522      ESP32
--------   ------
3.3V   →   3.3V
GND    →   GND
CS     →   GPIO 5
SCK    →   GPIO 18 (SPI CLK)
MOSI   →   GPIO 23 (SPI MOSI)
MISO   →   GPIO 19 (SPI MISO)
RST    →   GPIO 22
IRQ    →   Not connected (not needed for polling)
```

**Note:** RC522 is 3.3V only (do not connect 5V). Change CS pin if sharing SPI bus with TFT. See [Recommended Hardware List](./recommended-hardware.md) for radio law notes.

### IR Receiver Module (VS1838B)

```
VS1838B    ESP32
--------   ------
VCC    →   3.3V or 5V
GND    →   GND
OUT    →   GPIO 14
```

**Note:** OUT pin has pull-up built into the module. Uses IRremoteESP8266 library (also works on ESP32).

### DFPlayer Mini (MP3)

UART connection.

```
DFPlayer   ESP32
--------   ------
VCC    →   5V
GND    →   GND
RX     →   GPIO 12 (via 1kΩ resistor)
TX     →   GPIO 14
SPK+   →   Speaker (+)
SPK−   →   Speaker (−)
```

**Note:** Always add a 1kΩ series resistor on DFPlayer's RX pin. Uses SoftwareSerial (ESP32 RX=14, TX=12). Place MP3 files on microSD as `/01/001.mp3`.

---

## Camera Module Connections

ESP32 camera modules have built-in pin configurations. Simply select the board type in the block — no manual pin setup is needed.

### ESP32-CAM (AI-Thinker)

The camera connector is built into the board. Connect the OV2640 camera module separately.

**Programming notes:**
- Short IO0 to GND with a jumper before writing via USB-UART adapter
- Remove jumper and power cycle after writing
- ESP32-CAM has no USB port — USB-UART adapter (3.3V) is required

**Power:** 5V (via USB) or external 5V. Direct supply via the 3.3V pin is not recommended (camera current demand can cause instability).

### XIAO ESP32S3 Sense

Camera (OV2640) and microphone are built into the board. Connect camera via the dedicated flexible cable. No additional external wiring needed.

---

## CAN Bus Connection (TWAI)

Uses the ESP32 built-in TWAI controller. An external CAN transceiver IC (e.g. SN65HVD230) is required.

```
SN65HVD230  ESP32
----------  ------
VCC     →   3.3V
GND     →   GND
D (TXD) →   GPIO 5 (TX)
R (RXD) →   GPIO 4 (RX)
CANH    →   CANH line of CAN bus
CANL    →   CANL line of CAN bus
```

**Note:** Connect 120Ω termination resistors at both ends of the CAN bus. SN65HVD230 operates at 3.3V. See [Recommended Hardware List](./recommended-hardware.md) for regulatory notes.

---

## Details and Operations

### Wiring Best Practices

#### 1. Power Management

- Use 3.3V for sensors, external power for motors
- Always connect GNDs together
- Check power capacity (ESP32 3.3V pin max ~200mA)

#### 2. Noise Prevention

- Keep distance between motors and ESP32
- Add a capacitor on motor power
- Keep wiring as short as possible

#### 3. Safety

- Verify wiring before powering on to prevent shorts
- Use appropriate fuses and protection circuits for overcurrent
- Take special care with high voltage (12V+)

### Troubleshooting

#### Sensor Not Working

1. Re-check wiring (VCC, GND, signal)
2. Verify voltage level (3.3V / 5V)
3. Check if pull-up / pull-down resistor is needed

#### Motor Not Running

1. Verify external power is supplied
2. Check GND is commonly grounded
3. Verify motor driver wiring

For more, see [Troubleshooting](./troubleshooting.md).

---

## References

- [Recommended Hardware List](./recommended-hardware.md) — Verified device list
- [Getting Started](./getting-started.md) — From USB to LED blink
- [ESP32 Upload Guide](./04-program-setup-esp32.md) — Upload methods detail
- [Troubleshooting](./troubleshooting.md) — Problem solving guide
- [ESP32 Official Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
