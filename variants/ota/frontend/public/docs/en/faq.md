# Frequently Asked Questions (FAQ)

Common questions and answers about DigiCode.

## Table of Contents

1. [Account & Login](#account--login)
2. [Editor & Blocks](#editor--blocks)
3. [Compile & Upload](#compile--upload)
4. [WiFi OTA Update](#wifi-ota-update)
5. [Hardware](#hardware)
6. [Project Management](#project-management)
7. [Pricing & Plans](#pricing--plans)

---

## Account & Login

### Q: Is account registration required?

**A:** Yes, account registration is required to save projects and use compile features. Basic features are available with a free plan.

### Q: I forgot my password

**A:** Password reset feature is currently under development. Please contact us via the contact form.

### Q: Can I login from multiple devices?

**A:** Yes, you can login from multiple devices with the same account. Projects are stored in the cloud, so you can access them from any device.

---

## Editor & Blocks

### Q: I can't find a block

**A:** Please check the following:

1. **Robot mode** - Have you selected the appropriate mode for your robot?
   - OTTO Biped → OTTO blocks shown
   - OTTO Wheel → Wheel blocks shown
   - Custom → All blocks shown

2. **Category** - Expand each category in the toolbox

3. **Board selection** - Available blocks change based on selected microcontroller board

### Q: I can't connect blocks

**A:** Blocks have specific shapes that determine connections:

- **Notch shape** - Blocks that connect vertically (execution order)
- **Round hole** - Value input blocks (numbers, strings, etc.)
- **Triangle** - Condition input blocks (boolean values)

Blocks with incompatible shapes cannot be connected.

### Q: Blocks disappeared when switching boards

**A:** Switching microcontroller boards may remove incompatible blocks from the workspace. Save your project before switching.

### Q: Japanese characters are garbled

**A:** Character encoding issues can occur with serial communication. Verify baud rate matches in serial monitor (usually 115200).

---

## Compile & Upload

### Q: Compilation fails

**A:** Common causes and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Library not found | Required library not installed | Auto-installed on server. Retry. |
| Syntax error | Block connection mistake | Check for unconnected blocks |
| Out of memory | Program too large | Remove unnecessary blocks |

### Q: ESP32 is not recognized

**A:** Check the following in order:

1. **USB cable** - Are you using a data-capable cable? (Charging-only won't work)
2. **Driver** - Is CP2102/CH340 driver installed?
3. **Port** - Try a different USB port
4. **Browser** - Are you using Chrome/Edge? (Web Serial API required)

### Q: Error during upload

**A:** Common errors and solutions:

- **"A fatal error occurred: Failed to connect"**
  → Hold BOOT button while starting upload

- **"Timed out waiting for packet header"**
  → Lower baud rate and retry (115200 → 57600)

- **"No serial data received"**
  → Check USB cable and port

### Q: Compilation takes a long time

**A:** First compilation may take 30 seconds to 1 minute. Subsequent compilations are faster due to caching.

---

## WiFi OTA Update

### Q: Device is not found

**A:** Check the following:

1. **Same WiFi network** - Are PC and ESP32 on the same network?
2. **Firewall** - Is mDNS (port 5353) blocked?
3. **ESP32 WiFi connection** - Can you see IP address in serial monitor?

### Q: OTA update stops midway

**A:** Try the following:

1. Run in a location with strong WiFi signal
2. Place ESP32 close to power source
3. Temporarily disconnect other WiFi devices
4. Restart router

### Q: What's the difference between OTA and USB upload?

**A:**

| Method | Advantage | Disadvantage |
|--------|-----------|--------------|
| **USB upload** | Stable, fast | Cable required |
| **WiFi OTA** | Wireless, remote update possible | Initial setup needed, depends on WiFi |

It's convenient to upload OTA firmware via USB first, then update via OTA.

---

## Hardware

### Q: Which ESP32 board should I use?

**A:** The following boards are verified:

- **ESP32-DevKitC** - Most common, recommended
- **ESP32-WROOM-32** - Standard module
- **ESP32-S3** - Some feature limitations

### Q: Servo doesn't move

**A:** Check the following:

1. **Power** - Servo current draw is high, USB power may not be enough. Use external power (5V/2A+)
2. **Pin number** - Verify pin settings are correct
3. **Initialization** - Have you placed the servo attach block?

### Q: Sensor values are wrong

**A:** Check the following:

1. **Wiring** - Are VCC/GND/signal wires correctly connected?
2. **Voltage** - Check sensor operating voltage (3.3V/5V)
3. **Analog pin** - Are you using ADC-capable pins (GPIO32-39)?

### Q: OTTO robot doesn't walk properly

**A:** Try the following:

1. **Calibration** - Check upright posture with home position block
2. **Servo pulse width** - Adjust pulse width in pin settings page (500-2400μs)
3. **Speed** - Lower speed to check stability
4. **Center of gravity** - Adjust battery position

---

## Project Management

### Q: Can't save project

**A:** Check the following:

1. Are you logged in?
2. Have you entered a project name?
3. Is your network connection working?

### Q: Project disappeared

**A:** Projects are stored in the cloud. Check:

1. Are you logged in with the correct account?
2. Search in project list
3. If accidentally deleted, it cannot be recovered

### Q: Can I share projects?

**A:** Project sharing feature is currently under development. Please wait for future updates.

### Q: Can I edit sample projects?

**A:** When you load a sample project, a copy is automatically created. The original sample is not modified.

---

## Pricing & Plans

### Q: Is it free to use?

**A:** Yes, basic features are free.

**Included in free plan:**
- Basic blocks
- Project storage (limited)
- Compile & upload
- Sample projects

### Q: What are premium features?

**A:** Currently, all features are free. The following may become premium in the future:

- Advanced sensor blocks
- PID tuning features
- Unlimited project storage
- Priority support

### Q: Are there educational licenses?

**A:** Special plans for educational institutions are being prepared. Please contact us.

---

## Other

### Q: What browsers are supported?

**A:** The following browsers are verified:

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ○ Recommended | Web Serial API supported |
| Edge | ○ | Web Serial API supported |
| Firefox | △ | USB upload not supported |
| Safari | △ | USB upload not supported |

Use Chrome or Edge for USB upload functionality.

### Q: Can I use on smartphone?

**A:** Block editor can be used on smartphones, but USB upload is not available. WiFi OTA update is possible from smartphones.

### Q: Can I use offline?

**A:** Currently, online connection is required. Offline version is planned for future development.

### Q: I found a bug

**A:** Please report on GitHub Issues:
https://github.com/fablab-westharima/DigiCode/issues

Please include:
- Browser and version
- OS
- Steps to reproduce
- Error message (if any)

---

## Related Documents

- [Getting Started](./getting-started.md)
- [Block Reference](./block-reference.md)
- [Hardware Setup](./hardware-setup.md)
- [Troubleshooting](./troubleshooting.md)
