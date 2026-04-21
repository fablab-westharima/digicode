# Block Reference

A complete list of all blocks available in DigiCode and how to use them.

## Table of Contents

1. [Basic Blocks](#basic-blocks)
2. [Data (Arrays)](#data-arrays)
3. [Sensors](#sensors)
4. [Actuators](#actuators)
5. [Display (OLED)](#display-oled)
6. [NeoPixel (LED)](#neopixel-led)
7. [Audio](#audio)
8. [Robot](#robot)

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
| **Set Pin Mode** | Set pin input/output mode | Pin number (0-39), Mode (INPUT/OUTPUT/INPUT_PULLUP) |
| **Digital Write** | Output HIGH/LOW to pin | Pin number, Value (HIGH/LOW) |
| **Digital Read** | Read pin state | Pin number → true/false |
| **Built-in LED ON** | Turn on ESP32 built-in LED (GPIO2) | - |
| **Built-in LED OFF** | Turn off ESP32 built-in LED (GPIO2) | - |

### Analog I/O

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Analog Read** | Read analog value (0-4095) | Pin number (GPIO32-39 recommended) |
| **PWM Output** | Output PWM signal | Pin number, Value (0-255) |

### Time & Timing

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Wait** | Wait for specified time | Time (milliseconds) |
| **Elapsed Time** | Get time since boot | → milliseconds |

### Serial Communication

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Serial Begin** | Initialize serial communication | Baud rate (9600/57600/115200) |
| **Serial Print** | Output to serial monitor | Output value |
| **Serial Println** | Output with newline | Output value |

### Other

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Play Tone** | Output sound at specified frequency | Pin number, Frequency (Hz) |

---

## Data (Arrays)

Blocks for array operations.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Create Array** | Create 1D/2D/3D array | Variable name, Type, Dimensions, Size |
| **Set Array Element** | Set value to array element | Variable name, Index, Value |
| **Get Array Element** | Get array element | Variable name, Index → Value |
| **Get Array Size** | Get element count | Variable name → Number |
| **Array Content** | Define initial values | Element count, Each element's value |

---

## Sensors

### Ultrasonic Sensor (HC-SR04)

Distance measurement sensor.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **HC-SR04 Initialize** | Initialize ultrasonic sensor | Trig pin, Echo pin |
| **Ultrasonic Distance (cm)** | Measure distance | → Value in cm |

**Wiring Example:**
- Trig → GPIO18
- Echo → GPIO19
- VCC → 5V
- GND → GND

### RUS-04 (RGB Ultrasonic Sensor)

Ultrasonic sensor with built-in RGB LEDs for robots.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **RUS-04 Initialize** | Initialize sensor and RGB LEDs | Trig pin, Echo pin, RGB pin, LED count |
| **RUS-04 Distance (cm)** | Measure distance | → Value in cm |
| **RUS-04 RGB Both Eyes** | Set color for both eyes | Left color, Right color |
| **RUS-04 RGB Eye** | Set color for one eye | Left/Right, Color |
| **RUS-04 RGB Brightness** | Set LED brightness | 0-255 |
| **RUS-04 RGB Off** | Turn off LEDs | - |

### Temperature/Humidity Sensor (DHT11/DHT22)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **DHT Initialize** | Initialize DHT sensor | Type (DHT11/DHT22), Pin |
| **DHT Temperature (°C)** | Get temperature | → Celsius |
| **DHT Humidity (%)** | Get humidity | → Percent |

### Touch Sensor

ESP32 built-in capacitive touch sensor.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Touch Sensor Initialize** | Initialize touch sensor | Pin (T0-T9), Threshold |
| **Is Touched?** | Detect touch | → true/false |
| **Touch Sensor Value** | Get raw value | → Number (lower = stronger touch) |

**Supported Pins:** T0(GPIO4), T2(GPIO2), T3(GPIO15), etc.

### Sound Sensor

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Sound Sensor Initialize** | Initialize microphone sensor | ADC pin (GPIO32-39) |
| **Sound Level** | Get volume level | → 0-4095 |
| **Sound Detected?** | Detect sound above threshold | Threshold → true/false |

### Light Sensor

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Light Sensor Initialize** | Initialize CdS sensor | ADC pin (GPIO32-39) |
| **Light Level** | Get brightness | → 0-4095 (higher = brighter) |

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
| **Flame Sensor** | Flame detection sensor | Fire |
| **Gas Sensor** | MQ series gas sensor | Gas |
| **Limit Switch** | Micro switch | Contact |

### Analog Sensors

| Block Name | Description | Output Mode |
|------------|-------------|-------------|
| **Potentiometer** | Variable resistor | Raw/Percent/Angle |
| **Light Sensor (LDR)** | CdS light sensor | Raw/Percent |
| **Thermistor Temperature** | NTC thermistor | Celsius |
| **LM35 Temperature** | LM35 temperature sensor | Celsius |
| **Soil Moisture** | Soil moisture sensor | Raw/Percent |
| **Water Level Sensor** | Water level sensor | Raw/Percent |
| **Joystick** | 2-axis analog stick | X-axis/Y-axis |

### Line Sensor

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Generic Line Sensor Initialize** | Initialize QTR/TCRT sensor | Sensor count (2-8), Each pin |

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

### Stepper Motor

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Stepper Initialize** | Initialize 28BYJ-48 | IN1-IN4 pins |
| **Stepper Rotate** | Rotate by steps | Step count, Direction, Speed |

---

## Display (OLED)

### OLED Display (SSD1306)

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **OLED Initialize** | Initialize I2C OLED | Width (64/128), Height (32/64), SDA/SCL pins |
| **OLED Display** | Display text | Text, X coord, Y coord, Size (1-3) |
| **OLED Clear** | Clear screen | - |
| **OLED Update** | Update display | - |
| **OLED Draw Line** | Draw line | X1, Y1, X2, Y2 |
| **OLED Draw Rectangle** | Draw rectangle | X, Y, Width, Height, Fill |

---

## NeoPixel (LED)

Control addressable LEDs like WS2812B.

### Basic Operations

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **NeoPixel Ring Initialize** | Initialize LED strip | Pin, LED count |
| **Set LED Color** | Set individual LED color | Index, R/G/B (0-255) |
| **Set All LED Color** | Set all LEDs to same color | R/G/B (0-255) |
| **NeoPixel Show** | Apply colors | - |
| **NeoPixel Clear** | Turn off all LEDs | - |
| **NeoPixel Brightness** | Set overall brightness | 0-255 |

### Effects

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Rainbow Effect** | Rainbow animation | Speed |
| **Bounce Effect** | Bouncing LED | Color, Speed |
| **Cycle Effect** | Rotating effect | Color, Speed |

### Simple Operations

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **All LED Color (Simple)** | Set all LEDs by color name | Color (Red/Green/Blue/Yellow/Purple/Cyan/White/Off) |
| **LED # Color (Simple)** | Set individual LED by color name | Index, Color |

---

## Audio

Control buzzers and speakers.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Buzzer Tone** | Play tone | Pin, Note/Frequency, Duration (ms) |
| **Buzzer Stop** | Stop sound | Pin |
| **Play Melody** | Preset melody | Pin, Melody (Startup/Success/Error/Complete) |

---

## Robot

### Humanoid (Biped)

Control 4-servo biped walking robot.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Humanoid Initialize** | Initialize Humanoid | Left leg/Right leg/Left ankle/Right ankle pins |
| **Humanoid Home Position** | Return to standing pose | - |
| **Humanoid Walk** | Walk forward/backward | Steps, Direction, Speed |
| **Humanoid Turn** | Rotate left/right | Count, Direction, Speed |
| **Humanoid Side Step** | Step sideways | Steps, Direction, Speed |
| **Humanoid Jump** | Jump motion | Count, Speed |
| **Humanoid Bow** | Bow motion | Count, Speed |
| **Humanoid Shake** | Shake body | Count, Speed |

### Wheel Robot

Control 2-wheel continuous rotation servo robot.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Wheel Initialize** | Initialize wheel robot | Left/Right wheel pins |
| **Wheel Move** | Move forward/backward/rotate | Direction, Speed, Time |
| **Wheel Stop** | Stop | - |

### Transform (Ninja)

Control transforming robot.

| Block Name | Description | Parameters |
|------------|-------------|------------|
| **Transform Initialize** | Initialize Ninja | Each servo pin |
| **Transform Mode** | Switch mode | Mode (Biped/Quadruped/Car) |
| **Transform Action** | Execute action | Action type |

---

## Supported Languages

All blocks support the following language:

- **Arduino C++** - ESP32 Arduino framework

When you place blocks, corresponding code is auto-generated.

---

## Related Documents

- [Getting Started](./getting-started.md)
- [Hardware Setup Guide](./hardware-setup.md)
- [Troubleshooting](./troubleshooting.md)
