# Hardware Setup Guide

How to connect sensors and actuators to ESP32.

> **Recommended:** Check [Recommended Hardware List](./recommended-hardware.md) for verified devices. Using tested parts helps avoid issues.

## ESP32 Pin Layout

ESP32 development boards come in various types, but common pin layout is as follows:

### GPIO (General Purpose I/O)
- **GPIO 0-39**: Digital input/output
- **GPIO 32-39**: Analog input only (ADC1)
- **GPIO 0, 2**: Built-in LED (varies by board)

### Special Pins
- **GPIO 1, 3**: UART (serial) - avoid (used for programming)
- **GPIO 6-11**: Flash memory only - cannot use
- **GPIO 34-39**: Input only (no pull-up resistor)

### Power
- **3.3V**: Power for sensors and motors
- **5V**: 5V via USB (some boards only)
- **GND**: Ground (common ground)

## Sensor Connections

### Ultrasonic Distance Sensor (HC-SR04)

**Pin Layout:**
```
HC-SR04    ESP32
--------   ------
VCC    →   3.3V or 5V
GND    →   GND
Trig   →   GPIO 5
Echo   →   GPIO 18
```

**Note:** When connecting 5V sensors to ESP32 (3.3V), add voltage divider to Echo pin

### Temperature/Humidity Sensor (DHT11/DHT22)

**Pin Layout:**
```
DHT11      ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

**Note:** Connect 10kΩ pull-up resistor between DATA pin and VCC

### QTR Line Sensor (8ch)

**Pin Layout Example:**
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

**Pin Layout (I2C):**
```
MPU6050    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Address is 0x68 (AD0=LOW) or 0x69 (AD0=HIGH). Multiple units can share the same I2C bus

### Pressure / Temperature / Humidity Sensor (BME280 / BMP280)

**Pin Layout (I2C):**
```
BME280     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Default address 0x76 (SDO=LOW) or 0x77 (SDO=HIGH). BMP280 measures temperature and pressure only; BME280 also measures humidity

### ToF Distance Sensor (VL53L0X)

**Pin Layout (I2C):**
```
VL53L0X    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Address 0x29. When using multiple units, use XSHUT pin to boot each individually and change its address

### Magnetic Encoder (AS5600)

**Pin Layout (I2C):**
```
AS5600     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
DIR    →   GND (clockwise positive) or 3.3V (counter-clockwise positive)
```

**Note:** Fixed address 0x36. Mount magnet centered above shaft; keep sensor distance 0.5–3mm

## Actuator Connections

### Servo Motor (SG90, etc.)

**Pin Layout:**
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

**L298N Motor Driver Example:**
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

**Pin Layout:**
```
NeoPixel   ESP32
--------   ------
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

**Note:** External 5V power recommended for many LEDs

## Communication Module Connections

### I2C LCD Display (PCF8574 I2C Adapter + 16x2 LCD)

**Pin Layout (I2C):**
```
I2C LCD    ESP32
--------   ------
VCC    →   5V (recommended) or 3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Note:** Set I2C address via jumper on PCF8574 adapter (default 0x27). 5V power recommended for LCD (3.3V may result in dim display)

### TFT Display (SPI — ST7789 / ILI9341)

**Pin Layout (Hardware SPI):**
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

**Note:** Select driver IC (ST7789 / ILI9341 / ST7735) in the block. Change CS pin if sharing SPI bus with RFID

### RFID Reader (RC522, SPI)

**Pin Layout (Hardware SPI):**
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

**Note:** RC522 is 3.3V only (do not connect 5V). Change CS pin if sharing SPI bus with TFT. See [Recommended Hardware List](./recommended-hardware.md) for radio law notes

### IR Receiver Module (VS1838B)

**Pin Layout:**
```
VS1838B    ESP32
--------   ------
VCC    →   3.3V or 5V
GND    →   GND
OUT    →   GPIO 14
```

**Note:** OUT pin has pull-up built into the module. Uses IRremoteESP8266 library (also works on ESP32)

### DFPlayer Mini (MP3, UART)

**Pin Layout:**
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

**Note:** Always add 1kΩ series resistor to DFPlayer RX pin. Uses SoftwareSerial (ESP32 RX=14, TX=12). Place MP3 files on microSD as `/01/001.mp3`

## Camera Module Connections

ESP32 camera modules have built-in pin configurations. Simply select the board type in the block and no manual pin setup is needed.

### ESP32-CAM (AI-Thinker)

Camera connector is built into the board. Connect OV2640 camera module separately.

**Programming Notes:**
- Short IO0 to GND with a jumper before writing via USB-UART adapter
- Remove jumper and power cycle after writing
- ESP32-CAM has no USB port — USB-UART adapter (3.3V) is required

**Power:** 5V (via USB) or external 5V. Direct 3.3V pin supply is not recommended as camera current demand may cause instability

### XIAO ESP32S3 Sense

Camera (OV2640) and microphone are built into the board. Connect camera via the dedicated flexible cable. No additional external wiring needed.

## CAN Bus Connection (TWAI)

Uses the ESP32 built-in TWAI controller. An external CAN transceiver IC (e.g. SN65HVD230) is required.

**Pin Layout:**
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

**Note:** Connect 120Ω termination resistors at both ends of the CAN bus. SN65HVD230 operates at 3.3V. See [Recommended Hardware List](./recommended-hardware.md) for regulatory notes

## Wiring Best Practices

### 1. Power Management
- Use 3.3V for sensors, external power for motors
- Always connect GNDs together
- Check power capacity (ESP32 3.3V pin max ~200mA)

### 2. Noise Prevention
- Keep distance between motors and ESP32
- Add capacitor to motor power
- Keep wiring as short as possible

### 3. Safety
- Verify wiring before powering on to prevent shorts
- Use appropriate fuses and protection circuits for overcurrent
- Take special care with high voltage (12V+)

## Troubleshooting

### Sensor Not Working
1. Re-check wiring (VCC, GND, Signal)
2. Verify voltage level (3.3V/5V)
3. Check if pull-up/pull-down resistor is needed

### Motor Not Running
1. Verify external power is supplied
2. Check GND connection
3. Verify motor driver wiring

## References

- [Recommended Hardware List](./recommended-hardware.md) - Verified device list
- [ESP32 Official Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [Sensor Datasheets](Each sensor manufacturer's website)
