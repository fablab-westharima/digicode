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
