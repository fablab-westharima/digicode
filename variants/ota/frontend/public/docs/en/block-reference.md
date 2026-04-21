# Block Reference

A complete list of all blocks available in DigiCode and how to use them.

## Table of Contents

1. [Basic Blocks](#basic-blocks)
2. [Interrupts & Time](#interrupts--time)
3. [Data (Arrays)](#data-arrays)
4. [Sensors](#sensors)
5. [Actuators](#actuators)
6. [Display](#display)
7. [NeoPixel (LED)](#neopixel-led)
8. [Audio](#audio)
9. [Communication](#communication)
10. [Storage](#storage)
11. [Camera](#camera)
12. [Robot](#robot)
13. [Supported Boards](#supported-boards)

---

## Basic Blocks

Blocks for basic program structure and ESP32 I/O control.

### Program Structure

| Block Name | Description | Notes |
|------------|-------------|-------|
| **Setup** | Executed once at program start | Place initialization code here |
| **Loop** | Main processing executed repeatedly | Place sensor reading and control logic |

### Digital I/O

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Set Pin Mode** | Set pin input/output mode | Pin number, Mode (INPUT/OUTPUT/INPUT_PULLUP) |
| **Digital Write** | Output HIGH/LOW to pin | Pin number, Value (HIGH/LOW) |
| **Digital Read** | Read pin state | Pin number → true/false |
| **Built-in LED ON** | Turn on ESP32 built-in LED (GPIO2) | — |
| **Built-in LED OFF** | Turn off ESP32 built-in LED (GPIO2) | — |

### Analog I/O

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Analog Read** | Read analog value | Pin number (GPIO32-39 recommended) → 0-4095 |
| **PWM Output** | Output PWM signal | Pin number, Duty (0-255) |

### Time & Timing

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Wait** | Wait for specified time | Time (milliseconds) |
| **Elapsed Time** | Get time since boot (ms) | → milliseconds |

### Serial Communication

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Serial Begin** | Initialize serial communication | Baud rate (9600/57600/115200) |
| **Serial Print** | Output to serial monitor | Output value |
| **Serial Println** | Output with newline | Output value |

### Number Conversion

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Map Number** | Map a number to a different range | Value, Input Min/Max, Output Min/Max → mapped value |

### ESP32 Utilities

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Restart ESP32** | Reset the ESP32 | — |
| **Deep Sleep** | Enter deep sleep (power saving) | Seconds (restarts from beginning on wake) |
| **Light Sleep** | Enter light sleep | Seconds (continues from next line on wake) |
| **Free Memory (bytes)** | Get free heap memory | → bytes |
| **ESP Chip ID** | Get chip unique ID | → string |
| **CPU Frequency (MHz)** | Get CPU clock frequency | → MHz |
| **Play Tone** | Output sound at specified frequency | Pin number, Frequency (Hz), Duration (ms) |

---

## Interrupts & Time

Blocks for pin interrupts, periodic timers, and time retrieval.

> **Note:** Never call `delay()` or `Serial.print()` inside an interrupt handler — this will crash the ESP32. Use `volatile` variables to flag events and handle them in the main loop.

### Pin Interrupts

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Attach Interrupt** | Call handler when pin changes | Pin, Mode (RISING/FALLING/CHANGE), Handler |
| **Detach Interrupt** | Remove interrupt handler | Pin |
| **Check Interrupt** | Check interrupt flag and run handler | Place inside loop |

### Timer (Ticker)

**Supported:** ESP32 only (Ticker.h)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Ticker Start** | Repeatedly call handler at interval | Interval (ms), Handler |
| **Ticker Stop** | Stop periodic timer | — |
| **Check Ticker** | Check timer flag and run handler | Place inside loop |

### NTP Time Sync

**Supported:** WiFi-enabled boards (requires WiFi connection)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **NTP Sync** | Sync time with NTP server | Server URL, Timezone offset (sec, JST=32400) |
| **Get Unix Time** | Get current Unix timestamp | → seconds |
| **Get Formatted Time** | Get time as formatted string | Format (%Y-%m-%d %H:%M:%S etc.) → string |
| **Get Time Component** | Get year/month/day/hour/min/sec | Item selection → number |

### RTC (Real-Time Clock)

**Library:** RTClib (pre-installed in Dockerfile)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **RTC Init** | Initialize DS3231/DS1307 via I2C | Model selection |
| **RTC Set Time** | Set RTC date/time | Year/Month/Day/Hour/Min/Sec |
| **RTC Get** | Get year/month/day/hour/min/sec/unix time | Item selection → number |
| **RTC Formatted Time** | Get time as "YYYY-MM-DD HH:MM:SS" | → string |

---

## Data (Arrays)

Blocks for array operations.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Create Array** | Create 1D/2D/3D array | Variable name, Type, Dimensions, Size |
| **Set Array Element** | Set value at array index | Variable name, Index, Value |
| **Get Array Element** | Get value from array index | Variable name, Index → Value |
| **Get Array Size** | Get element count | Variable name → number |
| **Array Content** | Define initial values | Element count, Each value |

---

## Sensors

### Ultrasonic Sensor (HC-SR04)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **HC-SR04 Initialize** | Initialize ultrasonic sensor | Trig pin, Echo pin |
| **Ultrasonic Distance (cm)** | Measure distance | → cm |

**Wiring:** Trig→GPIO18 / Echo→GPIO19 / VCC→5V / GND→GND

### RUS-04 (RGB Ultrasonic Sensor)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **RUS-04 Initialize** | Initialize sensor and RGB LEDs | Trig/Echo/RGB pin, LED count |
| **RUS-04 Distance (cm)** | Measure distance | → cm |
| **RUS-04 RGB Both Eyes** | Set both eyes color | Left color, Right color |
| **RUS-04 RGB Eye** | Set one eye color | Left/Right, Color |
| **RUS-04 RGB Brightness** | Set LED brightness | 0-255 |
| **RUS-04 RGB Off** | Turn off LEDs | — |

### Temperature/Humidity Sensor (DHT11/DHT22)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **DHT Initialize** | Initialize DHT sensor | Type (DHT11/DHT22), Pin |
| **DHT Temperature (°C)** | Get temperature | → Celsius |
| **DHT Humidity (%)** | Get humidity | → percent |

### Digital Sensors

| Block Name | Description | Detects |
|------------|-------------|---------|
| **Button** | Button/Switch | Press state |
| **PIR Motion Sensor** | Infrared motion sensor | Movement |
| **Tilt Sensor** | Tilt sensor | Tilt |
| **Vibration Sensor** | Vibration/shock sensor | Vibration |
| **Magnetic Sensor** | Hall effect sensor | Magnet |
| **Photo Interrupter** | Infrared break sensor | Break |
| **IR Obstacle Sensor** | Infrared obstacle sensor | Obstacle |
| **Flame Sensor (Digital)** | Flame detection | Fire |
| **Gas Sensor (Digital)** | MQ series gas sensor | Gas |
| **Limit Switch** | Micro switch | Contact |
| **Digital Read** | Generic digital read | → HIGH/LOW |

### Analog Sensors

| Block Name | Description | Output |
|------------|-------------|--------|
| **Potentiometer** | Variable resistor | Raw/Percent/Angle |
| **Light Sensor (LDR)** | CdS light sensor | Raw/Percent |
| **Thermistor Temperature** | NTC thermistor | Celsius |
| **LM35 Temperature** | LM35 temperature sensor | Celsius |
| **Gas Sensor (Analog)** | MQ analog output | 0-4095 |
| **Soil Moisture** | Soil moisture sensor | Raw/Percent |
| **Water Level Sensor** | Water level sensor | Raw/Percent |
| **Flame Sensor (Analog)** | Flame analog output | 0-4095 |
| **IR Reflective Sensor** | IR reflective sensor | 0-4095 |
| **Joystick** | 2-axis analog stick | X-axis/Y-axis |
| **Analog Read** | Generic analog read | → 0-4095 |
| **Battery Voltage (V)** | Measure battery voltage via voltage divider | ADC pin, Divider ratio → V |
| **Battery %** | Convert voltage to percentage | Voltage, Min V, Max V → % |

### Touch Sensor (ESP32 Built-in)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Touch Sensor Initialize** | Initialize capacitive touch sensor | Pin (T0-T9), Threshold |
| **Is Touched?** | Detect touch | → true/false |
| **Touch Sensor Value** | Get raw capacitance value | → number (lower = stronger touch) |

**Supported Pins:** T0(GPIO4) / T2(GPIO2) / T3(GPIO15) etc.

### Sound Sensor

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Sound Sensor Initialize** | Initialize microphone sensor | ADC pin (GPIO32-39) |
| **Sound Level** | Get volume level | → 0-4095 |
| **Sound Detected?** | Detect sound above threshold | Threshold → true/false |

### Light Sensor (CdS)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Light Sensor Initialize** | Initialize CdS sensor | ADC pin (GPIO32-39) |
| **Light Level** | Get brightness | → 0-4095 (higher = brighter) |

### Line Sensors (QTR/TCRT)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **QTR-8A Init** | Initialize analog QTR sensor | Sensor count, Each pin |
| **QTR-8RC Init** | Initialize digital QTR sensor | Sensor count, Each pin |
| **QTR Calibrate** | Manual calibration | — |
| **QTR Auto Calibrate** | Automatic calibration | — |
| **QTR Line Position** | Get line position (0-7000) | → position value |
| **QTR Line Position (Normalized)** | Normalized -1.0 to 1.0 | → float |
| **QTR Sensor Value** | Get individual sensor value | Sensor number → value |
| **QTR Read All** | Read all sensors at once | — |
| **QTR Raw Value** | Raw value before calibration | Sensor number → value |
| **QTR Line Detected?** | Check if line is detected | → true/false |
| **QTR Is Calibrated?** | Check calibration status | → true/false |
| **QTR Emitter Control** | Turn LED emitters ON/OFF | ON/OFF |

**Generic Line Sensor (TCRT5000 etc.):**

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Line Sensor Init** | Initialize generic line sensor | Sensor count (2-8), Each pin |
| **Line Sensor Init (Simple)** | 2-sensor left/right setup | Left pin, Right pin |
| **Line Sensor Init (3-sensor)** | 3-sensor setup | Left/Center/Right pins |
| **Line Sensor Calibrate** | Run calibration | — |
| **Line Sensor Position** | Get line position | → -100 to 100 |
| **Line Sensor Value** | Read individual sensor | Sensor number → 0/1 |
| **Line Detected?** | Check if on line | → true/false |
| **Line Sensor Raw** | Raw analog value | Sensor number → value |

### Wall Sensors (Micromouse)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Wall Sensor Init** | Initialize IR wall sensors | Sensor count, Each pin |
| **Wall Present?** | Detect wall in direction | Direction (front/left/right) → true/false |
| **Wall Sensor Value** | Get raw reflection value | Sensor number → value |
| **Wall Sensor Error** | Get wall position error | → value |
| **Wall Sensor Info** | Get all sensor states | — |
| **Wall Sensor Read** | Update sensor values | — |
| **Wall Sensor Set Threshold** | Set wall detection threshold | Threshold |

### Encoders

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Encoder Init** | Initialize rotary encoder | A/B pins |
| **Encoder Distance** | Get travel distance | → mm |
| **Encoder Speed** | Get current speed | → mm/s |
| **Encoder Count** | Get pulse count | → number |
| **Encoder Reset** | Reset count | — |
| **Encoder Wait Distance** | Wait until specified distance | Distance (mm) |

### MPU6050 (Accelerometer/Gyroscope)

**Library:** Adafruit MPU6050 (pre-installed) / **Connection:** SDA/SCL

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **MPU6050 Init** | Initialize via I2C | Accel range, Gyro range |
| **MPU6050 Update** | Read sensor and update angles | Place in loop |
| **Accel** | Get acceleration (m/s²) on axis | X/Y/Z → m/s² |
| **Gyro** | Get angular velocity (rad/s) on axis | X/Y/Z → rad/s |
| **MPU6050 Temp** | Get chip temperature | → °C |
| **Get Angle** | Get Pitch/Roll (complementary filter) | Pitch/Roll → degrees |
| **MPU6050 Calibrate** | Calibrate at rest | Sample count |

### BME280 (Pressure/Temperature/Humidity) / BMP280 (Pressure/Temperature)

**Library:** Adafruit BME280 / Adafruit BMP280 (pre-installed)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **BME280 Init** | Initialize via I2C | I2C address (0x76/0x77) |
| **BME280 Read** | Get temperature/humidity/pressure | Item selection → value |
| **BMP280 Init** | Initialize via I2C (no humidity) | I2C address |
| **BMP280 Read** | Get temperature/pressure | Item selection → value |
| **BMP280 Altitude (m)** | Calculate altitude from pressure | Sea level pressure (hPa, standard: 1013.25) → m |

### VL53L0X (ToF Distance Sensor)

**Library:** Adafruit VL53L0X (pre-installed) / **Range:** 30–1200mm

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **VL53L0X Init** | Initialize ToF sensor (I2C, 0x29) | → true/false |
| **VL53L0X Distance (mm)** | Get distance | → mm (0 on error) |

### AS5600 (Magnetic Encoder)

**Library:** Seeed_Arduino_AS5600 (pre-installed) / **Connection:** SDA/SCL

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **AS5600 Init** | Initialize magnetic encoder (I2C, 0x36) | → true/false |
| **AS5600 Angle (°)** | Get absolute angle (0–360°) | → degrees (0.088° resolution) |
| **AS5600 Raw (0-4095)** | Get 12-bit raw value | → 0-4095 |

---

## Actuators

### Servo Motor

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Servo Attach** | Attach servo to pin | Pin number |
| **Servo Angle** | Rotate servo to angle | Pin, Angle (0-180°) |
| **Servo Angle (Variable)** | Set angle from variable | Pin, Angle value |
| **Servo Detach** | Detach servo (power saving) | Pin |
| **Servo Sweep** | Move from start to end angle | Pin, Start angle, End angle, Speed |

### DC Motor (L298N)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Motor Initialize** | Initialize L298N motor driver | Motor (A/B), IN1/IN2/ENA pins |
| **Motor Action** | Drive motor | Motor, Direction (Forward/Backward/Stop), Speed (0-255) |
| **Motor Speed** | Change speed only | Motor, Speed |
| **Motor Stop** | Stop motor | Motor (A/B/Both) |

### Stepper Motor (28BYJ-48)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Stepper Initialize** | Initialize 28BYJ-48 | IN1-IN4 pins |
| **Stepper Move** | Move by step count | Steps, Direction |
| **Stepper Rotate** | Rotate by angle | Angle, Direction |
| **Stepper Stop** | Stop stepper | — |

---

## Display

### OLED Display (SSD1306)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **OLED Initialize** | Initialize I2C OLED | Width (64/128), Height (32/64), SDA/SCL pins |
| **OLED Display** | Display text | Text, X/Y coords, Size (Small/Medium/Large) |
| **OLED Clear** | Clear screen | — |
| **OLED Update** | Apply display buffer | — |
| **OLED Draw Line** | Draw line | X1,Y1,X2,Y2 |
| **OLED Draw Rectangle** | Draw rectangle | X,Y,Width,Height, Fill/Outline |

### LCD Character Display (I2C 16x2)

**Library:** LiquidCrystal_I2C (pre-installed) / Common I2C addresses: 0x27 or 0x3F

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **LCD Init** | Initialize I2C LCD | Cols, Rows, I2C address |
| **LCD Print** | Print text at current cursor | Text |
| **LCD Print At** | Print at (col, row) | Col, Row, Text |
| **LCD Clear** | Clear all text, home cursor | — |
| **LCD Backlight** | Turn backlight ON/OFF | ON/OFF |

### TFT Display (ILI9341 / ST7789 / ST7735)

**Connection:** SPI (hardware SPI)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **TFT Init** | Initialize TFT | Driver, CS/DC/RST pins |
| **TFT Fill Screen** | Fill entire screen with one color | Color |
| **TFT Pixel** | Draw single pixel | X,Y, Color |
| **TFT Line** | Draw line | X1,Y1,X2,Y2, Color |
| **TFT Rect** | Draw rectangle | X,Y,Width,Height, Fill, Color |
| **TFT Circle** | Draw circle | X,Y,Radius, Fill, Color |
| **TFT Set Cursor** | Set text cursor position/size/color | X,Y, Size, Color |
| **TFT Print** | Print text at cursor position | Text |
| **TFT Color RGB** | Generate 16-bit color from R/G/B | R,G,B (0-255 each) → color value |

---

## NeoPixel (LED)

Control addressable LEDs such as WS2812B.

### Basic Operations

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **NeoPixel Ring Initialize** | Initialize LED strip | Pin, LED count |
| **Set LED Color** | Set individual LED color | Index, R/G/B (0-255) |
| **Set All LED Color** | Set all LEDs to same color | R/G/B (0-255) |
| **NeoPixel Show** | Apply colors (must call after changes) | — |
| **NeoPixel Clear** | Turn off all LEDs | — |
| **NeoPixel Brightness** | Set overall brightness | 0-255 |

### Effects

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Rainbow Effect** | Rainbow animation | Speed |
| **Bounce Effect** | Bouncing LED | Color, Speed |
| **Cycle Effect** | Rotating effect | Color, Speed |

### Simple Operations (color name)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **All LED Color (Simple)** | Set all LEDs by color name | Color (Red/Green/Blue/Yellow/Purple/Cyan/White/Off etc.) |
| **LED # Color (Simple)** | Set individual LED by color name | Index, Color |

---

## Audio

### Buzzer / Speaker

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Buzzer Tone** | Play tone | Pin, Note (C-B/custom Hz), Duration (ms) |
| **Buzzer Stop** | Stop sound | Pin |
| **Play Melody** | Play preset melody | Pin, Melody (Startup/Success/Error/Complete) |

### DFPlayer Mini (MP3 Playback)

**Wiring:** DFPlayer TX→ESP32 RX, DFPlayer RX (1kΩ resistor)→ESP32 TX

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **DFPlayer Init** | Initialize DFPlayer Mini | RX pin, TX pin |
| **DFPlayer Play** | Play specified track | Track number (1–999) |
| **DFPlayer Pause** | Pause playback | — |
| **DFPlayer Resume** | Resume from pause | — |
| **DFPlayer Stop** | Stop playback | — |
| **DFPlayer Volume** | Set volume level | 0-30 (30 = max) |

---

## Communication

### WiFi

**Supported:** WiFi-enabled boards (ESP32 series / Pico W)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **📶 Connect WiFi** | Connect to WiFi network | SSID, Password |
| **WiFi is Connected** | Check connection status | → true/false |
| **WiFi Reconnect** | Try to reconnect if disconnected | — |
| **WiFi IP Address** | Get current IP address | → string |
| **WiFi Signal Strength (RSSI)** | Get signal strength (dBm) | → dBm |

### HTTP Client

**Requires:** WiFi connection

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **HTTP GET** | Send HTTP GET request | URL → response string |
| **HTTP GET (with headers)** | GET with custom headers | URL, Header Name/Value → response |
| **HTTP POST** | Send HTTP POST request | URL, Body → response |
| **HTTP POST JSON** | POST JSON data | URL, JSON string → response |
| **HTTP PUT** | Send HTTP PUT request | URL, Body → response |
| **HTTP DELETE** | Send HTTP DELETE request | URL → response |
| **HTTP Last Status** | Get last status code | → number |
| **is success (2xx)** | Check if last response succeeded | → true/false |
| **URL Encode** | URL-encode a string | String → encoded string |
| **Build URL Base** | Build URL with query parameters | Base URL, Parameters |

### MQTT Client

**Requires:** WiFi connection. A separate MQTT broker (Mosquitto / Home Assistant etc.) is needed.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **MQTT Setup** | Configure WiFi and MQTT broker | SSID/PW, Broker, Port, Client ID |
| **Connect to MQTT Broker** | Connect to broker | Username/Password (optional) |
| **MQTT Publish Topic** | Publish message to topic | Topic, Message, Retain flag |
| **MQTT Subscribe Topic** | Subscribe to topic | Topic |
| **MQTT On Message** | Handle received message | Handler (use received-topic/message variables) |
| **MQTT Loop** | Keep MQTT connection alive (in loop) | — |
| **MQTT is Connected** | Check connection status | → true/false |
| **MQTT Disconnect** | Disconnect from broker | — |
| **MQTT Unsubscribe Topic** | Unsubscribe from topic | Topic |
| **MQTT Buffer Size** | Set receive buffer size | Bytes |
| **MQTT Keepalive** | Set keepalive interval | Seconds |
| **MQTT Last Will** | Set last will message | Topic, Message |
| **Connect to MQTT Broker (with LWT)** | Connect with last will | Username/Password |
| **MQTT Connection State** | Get connection state code | → number (-4 to 5) |
| **MQTT Publish (QoS)** | Publish with QoS setting | Topic, Message, QoS (0/1/2) |

### JSON

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **JSON Parse** | Parse JSON string | JSON string |
| **JSON Parse (with size)** | Parse with buffer size | JSON string, Buffer bytes |
| **JSON String Get** | Get string value by key | Key → string |
| **JSON Number Get** | Get number value by key | Key → number |
| **JSON Int Get** | Get integer value by key | Key → integer |
| **JSON Bool Get** | Get boolean value by key | Key → true/false |
| **JSON Nested Get** | Get nested value by path | Path, Type → value |
| **JSON Has Key** | Check if key exists | Key → true/false |
| **JSON Array Size** | Get array element count | Key → number |
| **JSON Array Get** | Get array element | Key, Index, Type → value |
| **JSON Create** | Start building JSON object | — |
| **JSON Set String** | Set string value for key | Key, Value |
| **JSON Set Number** | Set number value for key | Key, Value |
| **JSON Set Bool** | Set boolean value for key | Key, Value |
| **JSON to String** | Convert JSON to string | → string |
| **JSON to String (Pretty)** | Convert JSON to formatted string | → string |
| **Simple JSON** | Build JSON from 2 key/value pairs | Key1/Value1, Key2/Value2 → JSON string |

### Home Assistant (HA) Integration

> HA blocks require an MQTT broker and Home Assistant already configured. Set up MQTT first using MQTT blocks.

**Device Registration:**

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **HA Device Init** | Initialize as HA device | Broker, Device Name, Device ID |
| **HA Device Init (with auth)** | Initialize with auth | Broker, Device Name, ID, User/PW |
| **HA Loop** | Keep HA connection alive (in loop) | — |
| **HA is Connected** | Check HA connection | → true/false |
| **HA Report Interval** | Execute handler every N seconds | Seconds, Handler |

**Entity types:**

| Entity Type | Create Block | Command / Report |
|------------|--------------|------------------|
| **Sensor** | HA Sensor Create (Temperature/Humidity etc.) | HA Sensor Update |
| **Binary Sensor** | HA Binary Sensor Create (Motion/Door/Window etc.) | HA Binary Sensor Update |
| **Switch** | HA Switch Create | HA Switch On Command / HA Switch Set State |
| **Light (ON/OFF)** | HA Light Create | HA Light On State Change / HA Light Report State |
| **Light (RGB)** | HA Light Create (RGB) | HA Light On RGB Change / HA Light Report RGB |
| **Button** | HA Button Create | HA Button On Press |
| **Number Slider** | HA Number Create (min/max/step) | HA Number On Change / HA Number Set |
| **Fan** | HA Fan Create | HA Fan On State Change / HA Fan ON/OFF |
| **Cover** | HA Cover Create (Shutter/Blind etc.) | HA Cover On Command / HA Cover Set State |
| **Trigger** | HA Trigger Create | HA Trigger Fire |
| **Scene** | HA Scene Create | HA Scene On Execute |
| **Tag Scanner** | HA Tag Scanner Create | HA Tag Scan |

### OTA (Over-The-Air Firmware Update)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **OTA Setup** | Configure OTA | Hostname, OTA Password (optional) |
| **Simple OTA Setup** | Enable OTA with minimal config | — |
| **OTA Loop** | Handle OTA requests (in loop) | — |
| **OTA Hostname** | Get OTA hostname | → string |

### BLE (Bluetooth Low Energy)

**Supported:** ESP32 only (Pico W does not support BLE) / **Library:** NimBLE-Arduino (pre-installed)

**Nordic UART Service (NUS) — serial communication with smartphone:**

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **BLE UART Setup** | Start NUS service | Device name |
| **BLE Send** | Send string to phone | Text |
| **BLE On Receive** | Handle received data (bleMessage variable) | Handler |
| **BLE Connected?** | Check connection status | → true/false |
| **BLE Disconnect** | Disconnect and restart advertising | — |

**Custom GATT Server:**

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **BLE Init** | Initialize BLE stack | Device name |
| **Add GATT Service** | Create custom GATT service | Service UUID |
| **Add Characteristic** | Add characteristic | Service UUID, Char UUID, read/write/notify |
| **BLE Notify** | Send notification via characteristic | Char UUID, Value |
| **BLE On Write** | Handle write to characteristic | Char UUID, Handler |
| **BLE Start Advertising** | Start BLE advertising | — |

**iBeacon & Scanning:**

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **iBeacon Broadcast** | Broadcast as iBeacon | UUID, Major, Minor |
| **BLE Scan Start** | Scan for nearby BLE devices | Duration (sec) |
| **BLE On Device Found** | Handle discovered device (bleFoundName / bleFoundAddress / bleFoundRssi) | Handler |
| **BLE RSSI** | Get signal strength of connected device | → dBm |

### WebSocket Client

**Requires:** WiFi connection

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **WebSocket Connect** | Connect to WebSocket server | Host, Port, Path → true/false |
| **WebSocket Send** | Send text message | Text |
| **WebSocket On Message** | Handle received data (wsMessage variable) | Handler |
| **WebSocket Connected?** | Check connection status | → true/false |
| **WebSocket Disconnect** | Close connection | — |

### UART2/3 (Serial 2/3)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Serial2 Begin** | Initialize Serial2 (UART2) | Baud rate, RX pin, TX pin (default: RX=16, TX=17) |
| **Serial2 Print** | Send data (no newline) | Data |
| **Serial2 Println** | Send data with newline | Data |
| **Serial2 Read** | Read 1 byte | → number (-1 = no data) |
| **Serial2 Read Until** | Read until terminator character | Terminator → string |
| **Serial2 Available** | Get bytes available in receive buffer | → number |

### IR Remote

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **IR Receiver Init** | Initialize IR receiver | Pin |
| **IR Receive Code** | Get received IR code (hex string) | → string ("0" when no signal) |
| **IR Sender Init** | Initialize IR sender LED | Pin |
| **IR Send** | Send IR signal | Protocol, Code (hex) |

### RFID (MFRC522 / M5Stack RFID2 Unit)

> **Radio Regulations:** In Japan, using a non-certified MFRC522 may violate the Radio Act. For use in Japan, the **M5Stack RFID 2 Unit** (certified) is recommended.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **RFID Init (M5Stack)** | Initialize M5Stack RFID 2 Unit via I2C (certified) | — |
| **⚠️ RFID Init (Generic)** | Initialize generic MFRC522 via SPI (verify certification) | CS pin, RST pin |
| **RFID Card Present?** | Detect card/tag | → true/false |
| **RFID Read UID** | Get card UID (hex string) | → e.g. "04:A3:B5:C9" |
| **RFID Read Data** | Read 16 bytes from block (0-63) | Block number → string |
| **RFID Write Data** | Write up to 16 chars to block | Block number, Data → true/false |

### CAN Bus (ESP32-TWAI)

**Supported:** ESP32 only (built-in TWAI controller) / Requires external CAN transceiver IC (e.g. SN65HVD230)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **CAN Init** | Initialize CAN bus | TX pin, RX pin, Baud rate → true/false |
| **CAN Send** | Send CAN message | ID (integer), Data (max 8-byte string) |
| **CAN Message Available?** | Check for new CAN message | → true/false |
| **CAN Received ID** | Get last received message ID | → number |
| **CAN Received Data** | Get last received message data | → string |

### I2C / SPI Low Level

For direct access to devices not covered by higher-level sensor blocks.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **🔍 I2C Scan** | Print all connected I2C device addresses to Serial | — |
| **📡 I2C Write** | Write bytes to I2C device | Address, Data |
| **📡 I2C Read** | Read bytes from I2C device | Address, Byte count → value |
| **📡 I2C Write Register** | Write to device register | Address, Register, Value |
| **📡 I2C Read Register** | Read from device register | Address, Register → value |
| **🔌 SPI Begin** | Initialize SPI with CS pin | SCK/MOSI/MISO/CS pins |
| **🔌 SPI Transfer** | Send and receive 1 byte via SPI | Data → response byte |

---

## Storage

### NVS / Preferences (Key-Value Store)

Persistently store data in ESP32 flash memory. Data survives reboots.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Preferences Begin** | Open namespace | Namespace, Read-only flag |
| **Preferences End** | Close and release resources | — |
| **Preferences Put** | Save value by key (int/float/string) | Key, Value |
| **Preferences Get** | Retrieve value by key | Key, Default value → value |
| **Preferences Remove** | Delete a key | Key |
| **Preferences Clear** | Delete all keys in namespace | — |

### EEPROM (Address-Value Store)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **EEPROM Write** | Write 1 byte to address | Address, Value (0-255) |
| **EEPROM Read** | Read 1 byte from address | Address → value |

### SD Card

**Connection:** SPI (specify CS pin) / FAT32 format recommended

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **SD Begin** | Initialize SD card | CS pin → true/false |
| **SD Write** | Write to file | Filename, Content, Append/Overwrite |
| **SD Read** | Read file contents | Filename → string |
| **SD Exists** | Check file/directory exists | Path → true/false |
| **SD Delete** | Delete file | Filename |
| **SD CSV Append** | Append CSV data row | Filename, Col1/Col2/Col3 |

### LittleFS (ESP32 Built-in Flash)

Uses ESP32 internal flash as a filesystem — no extra hardware needed.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **LittleFS Mount** | Mount LittleFS (initialize) | — |
| **LittleFS Write** | Write to file | Filename, Content |
| **LittleFS Read** | Read file contents | Filename → string |
| **LittleFS Exists** | Check file exists | Path → true/false |
| **LittleFS Delete** | Delete file | Filename |

---

## Camera

Capture still images, send via HTTP, and stream MJPEG video.

**Supported models:**
- **ESP32-CAM** (AI-Thinker)
- **XIAO ESP32S3 Sense** (Seeed Studio)
- **M5Camera** (M5Stack — Unit Cam / Unit Cam S3 / Timer Cam)

**Requires:** WiFi connection for streaming and HTTP send

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Camera Init** | Initialize camera (auto pin config) | Board model → true/false |
| **Camera Capture** | Capture photo to internal buffer | → true/false (call save/send block next) |
| **Camera Save SD** | Save captured image as JPEG to SD card | → true/false (SD must be initialized) |
| **Camera Send HTTP** | Send captured image via HTTP POST | → true/false (WiFi required) |
| **Camera Stream Start** | Start MJPEG stream server | Port (access at http://\<IP\>:\<Port\>/stream) |

---

## Robot

### Humanoid (Biped)

Controls a 4-servo biped walking robot.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Humanoid Init** | Initialize Humanoid | Left leg/Right leg/Left ankle/Right ankle pins |
| **Humanoid Home** | Return to standing position | — |
| **Humanoid Walk** | Walk forward/backward | Steps, Direction, Speed |
| **Humanoid Turn** | Rotate left/right | Count, Direction, Speed |
| **Humanoid Jump** | Jump motion | Count, Speed |
| **Humanoid Dance** | Dance motion | Count, Speed |
| **Humanoid Swing** | Swing left and right | Count, Speed |
| **Humanoid Bend** | Lean left/right | Count, Speed |
| **Humanoid Moonwalk** | Moonwalk motion | Count, Speed |
| **Humanoid Gesture** | Express emotion with movement and sound | Gesture type (Happy/Sad/Angry etc.) |
| **Humanoid Sound** | Play sound effect | Sound type (Startup/Button etc.) |
| **Humanoid Crusaito** | Cross-legged walking | Count, Speed |
| **Humanoid Flapping** | Flapping wing motion | Count, Speed |
| **Humanoid Tiptoe Swing** | Tiptoe swinging | Count, Speed |
| **Humanoid Jitter** | Trembling motion | Count, Speed |
| **Humanoid Ascending Turn** | Rise and rotate | Count, Speed |
| **Humanoid Shake Leg** | Shake leg | Count, Speed |
| **Humanoid Updown** | Up-down motion | Count, Speed |

### Wheel Robot

Controls a 2-wheel continuous-rotation servo robot.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Wheel Init** | Initialize wheel robot | Left/Right wheel pins |
| **Wheel Forward** | Move forward | Speed (Normal/Fast/Slow) |
| **Wheel Backward** | Move backward | Speed |
| **Wheel Turn Left** | Turn left | Speed |
| **Wheel Turn Right** | Turn right | Speed |
| **Wheel Spin Left** | Spin left in place | Speed |
| **Wheel Spin Right** | Spin right in place | Speed |
| **Wheel Stop** | Stop | — |

### Transform (Ninja)

Controls a transforming robot switching between Walk (quadruped) and Roll (wheel drive) modes.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Transform Init** | Initialize Ninja | Pin setup (from preset) |
| **Ninja Mode** | Switch mode only (Walk/Roll) | Mode selection |
| **Ninja Transform** | Physically transform | Walk↔Roll |
| **Ninja Align** | Adjust servo angles | — |
| **Ninja Calibrate** | Adjust left/right offset | — |
| **Ninja Home** | Return to upright position | — |
| **Ninja Walk** | Walk in Walk mode | Direction, Speed, Count |
| **Ninja Walk (Power)** | Walk with power percentage | Direction, Speed (%), Count |
| **Ninja Roll** | Drive in Roll mode | Direction, Speed, Duration |
| **Ninja Roll (Power)** | Drive with power percentage | Direction, Speed (%) |
| **Ninja Roll Rotate** | Rotate in Roll mode | Direction, Speed |
| **Ninja Turn** | Rotate in Walk mode | Direction, Speed |
| **Ninja Stop** | Stop specified mode | Mode |
| **Ninja Trot** | Fast walk | Direction, Speed |
| **Ninja Pushup** | Push-up motion | Count, Speed |
| **Ninja Lateral** | Move sideways | Direction, Speed |
| **Ninja Dance** | Dance | Speed |

### PID Control

PID controller for line following, wall control, speed control, and more.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **PID Control Init** | Create PID controller | Name, Purpose (Line Follow/Wall Control/Speed/Angle) |
| **PID** | Calculate output from error | Error → output |
| **Set Gains** | Set Kp/Ki/Kd | Kp, Ki, Kd |
| **Reset** | Reset integrator and state | — |
| **Line Trace PID Calc** | Calculate motor speeds from sensor position | Base speed, Line position → Left/Right speed |
| **PID Motor Speed Calc (Left)** | Calculate left motor speed | Base speed, PID error → speed |
| **PID Motor Speed Calc (Right)** | Calculate right motor speed | Base speed, PID error → speed |
| **PID Calculated Motor Speed** | Get calculated speed | Left/Right → speed |

### Differential Drive

High-level control for differential drive robot using two L298N motor drivers.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Differential Drive Init** | Initialize differential drive | Left/Right Motor IN1 pins, Track width (mm) |
| **Set Speed** | Set individual wheel speeds | Left speed, Right speed |
| **Forward** | Move forward | Speed |
| **Backward** | Move backward | Speed |
| **Stop** | Stop (coast) | — |
| **Brake** | Hard stop | — |
| **Free** | Release motors | — |
| **Spin in Place** | Rotate in place | Direction, Speed |
| **Curve** | Curve with curvature control | Speed, Curvature (0-100%) |
| **Forward Distance** | Move forward specific distance | Distance (mm), Speed |
| **Rotate** | Rotate specific angle | Angle (degrees), Direction |
| **Line Trace** | Line tracing with PID correction | Base speed, Sensor error, PID correction |
| **Current Speed** | Get current wheel speed | Left/Right → mm/s |

---

## Supported Boards

DigiCode is an ESP32-focused block coding editor. Blocks are automatically shown or hidden based on your selected board's capabilities.

| Flag | Meaning | Example boards |
|------|---------|----------------|
| `supportsWifi` | WiFi blocks, HTTP, MQTT, and HA are available | All ESP32 series, Pico W, Nano RP2040 Connect |
| `supportsOta` | WiFi OTA firmware upload (DigiCode OTA) is available | ESP32 series (not RP2040) |
| `supportsBle` | BLE blocks (NimBLE) are available | ESP32 series only (not Pico W) |

> **Note:** Pico W supports WiFi but not BLE. RFID, CAN, and Camera blocks are ESP32-only.

---

## Related Documents

- [Getting Started](./getting-started.md)
- [Hardware Setup Guide](./hardware-setup.md)
- [Troubleshooting](./troubleshooting.md)
- [Recommended Hardware](./recommended-hardware.md)
