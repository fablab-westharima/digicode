# Program Upload - Arduino

**Last updated:** 2025-12-28

---

## Supported Boards

- Arduino Uno
- Arduino Nano
- Arduino Nano (Old Bootloader)
- Arduino Leonardo
- Other ATmega328P / ATmega32U4 boards

---

## Arduino Features

Arduino is a standard development board using AVR microcontrollers:

- **Language:** Arduino C++ (C/C++) only
- **Connection method:** USB (virtual serial port) or FTDI serial adapter
- **Bootloader:** Fixed in ROM (usually no replacement needed)
- **Upload format:** Intel HEX or Binary

---

## Upload Steps

### Method 1: USB Wired Connection

**Supported Boards:**
- Arduino Uno (USB native)
- Arduino Nano (USB native)
- Arduino Leonardo (ATmega32U4)

#### Preparation

1. **Connect to PC**
   - Connect Arduino to PC via USB cable
   - Verify serial port in Arduino IDE or `dmesg`

   ```bash
   # On Mac
   ls -la /dev/tty.usbmodem*
   # or
   ls -la /dev/tty.usbserial*

   # On Linux
   ls -la /dev/ttyUSB*
   # or
   ls -la /dev/ttyACM*
   ```

2. **Generate Binary in DigiCode**
   - Access [DigiCode](https://digicode-frontend.pages.dev)
   - Login
   - Board selection: Select **Arduino Uno** or **Arduino Nano**
   - Language: Select **Arduino C++**
   - Create your program
   - Click **Compile**
   - `*.hex` or `*.bin` file becomes downloadable

3. **Upload with avrdude (Command Line)**

   ```bash
   # Arduino Uno
   avrdude -p atmega328p -c arduino -P /dev/tty.usbmodem14201 -b 115200 -D -U flash:w:program.hex:i

   # Arduino Nano (standard bootloader)
   avrdude -p atmega328p -c arduino -P /dev/tty.usbserial-14101 -b 57600 -D -U flash:w:program.hex:i

   # Arduino Nano (Old Bootloader)
   avrdude -p atmega328p -c arduino -P /dev/tty.usbserial-14101 -b 115200 -D -U flash:w:program.hex:i
   ```

   **Parameter descriptions:**
   - `-p atmega328p`: MCU type (Uno / Nano)
   - `-c arduino`: Board type
   - `-P`: Serial port (adjust for your environment)
   - `-b`: Baud rate (Uno: 115200, Nano: 57600)
   - `-D`: Skip EEPROM erase
   - `-U flash:w:`: Write to flash memory

4. **Upload Complete**
   ```
   avrdude: safemode: Fuses OK (E:00, H:00, L:FF)
   avrdude done.  Thank you.
   ```

#### Upload with Arduino IDE (GUI)

1. Open Arduino IDE
2. **Tools → Board** → Select your board
3. **Tools → Serial Port** → Select connected port
4. **Sketch → Upload with Binary** (with HEX file prepared)
5. Or press Ctrl+U for direct code upload

---

### Method 2: Via FTDI Serial Adapter

**Supported:**
- Arduino Nano (TX/RX via FTDI)
- Arduino compatible boards (TX/RX pins exposed)
- **Not recommended:** USB native boards (Uno / Leonardo)

#### Preparation

1. **Connect FTDI Adapter**
   ```
   FTDI GND  → Arduino GND
   FTDI TX   → Arduino RX (pin 0)
   FTDI RX   → Arduino TX (pin 1)
   FTDI 5V   → Arduino 5V
   ```

   **Note:** Always verify voltage (3.3V / 5V)

2. **Generate Binary in DigiCode**
   - (Same as Method 1)

3. **Upload with avrdude**
   ```bash
   # Using FTDI
   avrdude -p atmega328p -c ftdi -P /dev/tty.usbserial-FT3JHQ2H -b 115200 -D -U flash:w:program.hex:i
   ```

   **Parameter changes:**
   - `-c ftdi`: Change board type to FTDI
   - `-P`: FTDI serial port
   - `-b`: Usually 115200 bps

4. **Verify FTDI Driver**
   - Mac / Linux: Usually pre-installed
   - Windows: Install [FTDI Driver](https://ftdichip.com/drivers/)

#### Verify Circuit

```bash
# Check if FTDI board is recognized
dmesg | grep FTDI

# or
ls -la /dev/tty.usbserial*
```

---

## Verify Operation with Serial Monitor

Using Arduino IDE:

1. **Tools → Serial Monitor**
2. Baud rate: **9600 bps** (if program uses `Serial.begin(9600)`)
3. Output from Arduino is displayed

Command line:

```bash
# On Mac
screen /dev/tty.usbmodem14201 9600

# On Linux
screen /dev/ttyACM0 9600
```

Exit: `Ctrl+A` → `Ctrl+X`

---

## Identifying Board/Bootloader

For Arduino Nano, version verification is important:

### Identification Methods

1. **Older boards without A4-A5 jumper**
   → Likely Old Bootloader

2. **Auto-detect with avrdude**
   ```bash
   # Identify by -b parameter during upload
   # 57600 bps  : Standard bootloader
   # 115200 bps : Old Bootloader
   ```

3. **Check in DigiCode**
   - Can select `Arduino Nano (Old Bootloader)` in board selection
   - Generates binary for 115200 bps

---

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Serial port not shown | USB driver missing | Check driver in Arduino IDE (Windows) |
| `avrdude: ser_open(): can't open device` | Wrong port name | Verify with `ls /dev/tty.*` |
| `avrdude: stk500_recv(): programmer is not responding` | Wrong baud rate | Check Old Bootloader setting |
| Program doesn't run after upload | Bootloader corrupted | Flash bootloader with Arduino IDE |
| No response after FTDI connection | TX/RX reversed | Verify cable wiring |

---

## Installing avrdude

### Mac

```bash
brew install avrdude
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install avrdude
```

### Windows

- [AVRDUDE Download](https://www.nongnu.org/avrdude/)
- Or bundled with Arduino IDE

---

## References

- [Arduino Official Documentation](https://docs.arduino.cc/)
- [AVRDUDE Manual](https://www.nongnu.org/avrdude/user-manual/avrdude_4.html)
- [ATmega328P Datasheet](https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-UART-Automotive-Microcontroller-ATmega328P_Datasheet.pdf)

---

## Related Documents

- [Common Steps](./01-program-setup-common.md)
- [ESP32 Upload Guide](./04-program-setup-esp32.md)
- [OTA Setup Guide](./05-ota-guide.md) (for ESP32 OTA upload)
