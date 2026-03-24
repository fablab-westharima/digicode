# Program Upload - RP2040

**Last updated:** 2025-12-28

---

## Supported Boards

- Raspberry Pi Pico
- Pimoroni Tiny 2040
- Other RP2040-based boards

---

## RP2040 Features

RP2040 is a low-cost microcontroller developed by Raspberry Pi Foundation:

- **Bootloader:** Fixed in ROM (always bootable)
- **Connection method:** USB (virtual serial port) only
- **Upload format:** UF2 (USB Flashing Format)
- **Special preparation:** None (bootloader always available)

---

## Upload Steps (USB Connection)

### Preparation

1. **Enter Boot Mode**
   - Disconnect RP2040 from PC
   - Hold BOOTSEL button while connecting to PC
   - A drive named `RPI-RP2` appears

   ```bash
   # On Mac, verify with:
   ls /Volumes/
   ```

   Example output:
   ```
   Macintosh HD
   RPI-RP2
   ```

   On Windows, check `RPI-RP2` drive in File Explorer

2. **Generate UF2 File in DigiCode**
   - Access [DigiCode](https://digicode-frontend.pages.dev)
   - Login
   - Board selection: Select **RP2040**
   - Language: Select **Arduino C++**
   - Create your program (arrange blocks in Blockly)
   - Click **Compile** button
   - **Download** button appears → Click it
   - `*.uf2` file is downloaded

3. **Copy UF2 File to RP2040**
   ```bash
   # On Mac
   cp ~/Downloads/*.uf2 /Volumes/RPI-RP2/

   # On Linux
   cp ~/Downloads/*.uf2 /media/<username>/RPI-RP2/
   ```

   On Windows, drag and drop to `RPI-RP2` drive in File Explorer

4. **Upload Complete**
   - After copying, RP2040 automatically resets
   - `RPI-RP2` drive disappears (program starts running)
   - Check output in serial monitor

---

## Verify Operation with Serial Monitor

Check RP2040 program output via serial monitor.

### Using Arduino IDE

1. Open Arduino IDE
2. **Tools → Board** → Select **Raspberry Pi Pico**
3. **Tools → Serial Port** → Select RP2040 port
4. **Tools → Serial Monitor**

### Command Line

```bash
# On Mac
ls -la /dev/tty.usbmodem*
screen /dev/tty.usbmodem12301 115200

# On Linux
ls -la /dev/ttyACM*
screen /dev/ttyACM0 115200

# On Windows (PowerShell)
Get-WmiObject Win32_SerialPort
```

Exit: `Ctrl+A` → `Ctrl+X` (GNU screen)

---

## If Boot Mode Doesn't Respond

### Verification Steps

1. **Check LED on Board**
   - LED blinking/lit → Firmware running
   - LED off → Waiting in boot mode

2. **Verify BOOTSEL Button Location**
   - Raspberry Pi Pico: Black button on top of board
   - Pimoroni Tiny 2040: Small button (use magnifier)

3. **Reset and Retry**
   ```bash
   # Disconnect RP2040, wait 3 seconds
   # Hold BOOTSEL while connecting
   ```

### If RP2040 Doesn't Respond at All

1. **Try Different USB Cable**
   - Use high-quality data-capable cable
   - Verify it's not a charging-only cable

2. **Try Different Computer**
   - Test on another machine to verify boot mode

3. **Re-download UF2**
   - Generate new UF2 file in DigiCode

---

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| RPI-RP2 drive not shown | BOOTSEL not pressed | Hold button while connecting |
| No response after UF2 copy | Corrupted UF2 file | Retry download |
| No serial output | Wrong baud rate | Verify 115200 bps |
| Can't enter boot mode | Hardware failure | Try different RP2040 |

---

## References

- [Raspberry Pi Pico Official Documentation](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html)
- [UF2 Format](https://github.com/microsoft/uf2)

---

## Related Documents

- [Common Steps](./01-program-setup-common.md)
- [Arduino Upload Guide](./03-program-setup-arduino.md)
- [ESP32 Upload Guide](./04-program-setup-esp32.md)
