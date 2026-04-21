# Frequently Asked Questions (FAQ)

**Last Updated:** 2026-04-21

Common questions and answers about DigiCode.

## Table of Contents

1. [Account & Login](#account--login)
2. [Editor & Blocks](#editor--blocks)
3. [Program Upload](#program-upload)
4. [WiFi OTA / BLE](#wifi-ota--ble)
5. [Hardware](#hardware)
6. [Project Management](#project-management)
7. [Class Feature](#class-feature)
8. [Plans & Pricing](#plans--pricing)

---

## Account & Login

### Q: Is account registration required?

**A:** No, **you can create and upload programs as a guest**. However, an account is required to save projects to the cloud (available from the Free plan).

### Q: I forgot my password

**A:** From the login screen, click the "Forgot your password?" link to send a reset link to your registered email address.

### Q: Can I login from multiple devices?

**A:** Yes, you can login from multiple devices with the same account. Projects are stored in the cloud and accessible from any device.

---

## Editor & Blocks

### Q: I can't find a block

**A:** Please check the following:

1. **Robot mode** — Have you selected the right mode? DigiCode has 7 modes:
   - Humanoid (biped)
   - Wheel (wheeled robot)
   - Transform (transforming robot)
   - Home Assistant (IoT integration)
   - Generic (general purpose)
   - All Blocks (all blocks)
   - Custom

2. **Category** — Expand each category in the toolbox

3. **Board compatibility** — Some blocks are hidden depending on the selected board
   - Example: BLE blocks are hidden for Pico W (no BLE support)

### Q: I can't connect blocks

**A:** Blocks have specific connector shapes:

- **Notch/bump shapes** — blocks that connect vertically (execution order)
- **Round holes** — value input blocks (numbers, strings, etc.)
- **Triangle shapes** — condition input blocks (boolean)

Blocks with incompatible shapes cannot be connected.

### Q: Blocks disappeared when I switched boards

**A:** Switching boards may remove unsupported blocks from the workspace (e.g., BLE blocks on Pico W). Save your project before switching.

### Q: Japanese text is garbled

**A:** Garbled text can occur when using Japanese in serial communication. Check that the baud rate in the serial monitor matches (typically 115200).

---

## Program Upload

### Q: What is the difference between "Program Upload" and "Firmware Upload"?

**A:**

| Operation | Description | Frequency |
|-----------|-------------|-----------|
| **Program Upload** | Upload the program created in the block editor | Every time (USB / WiFi OTA / BLE) |
| **Firmware Upload** | Upload the base software required for WiFi OTA / BLE | **First time only** when using WiFi OTA or BLE |

**Firmware Upload is not needed if you only use USB upload.**

### Q: Which upload method is recommended?

**A:** **Direct USB upload** is the most reliable and recommended for beginners and typical development. Once you're comfortable and want to update without a cable, set up WiFi OTA or BLE.

### Q: Compilation fails

**A:** Common causes and solutions:

| Error | Cause | Fix |
|-------|-------|-----|
| Library not found | Required library not installed | Automatically installed on the server. Retry |
| Syntax error | Block connection error | Check for disconnected blocks |
| Out of memory | Program too large | Remove unnecessary blocks |
| Compile quota exceeded | Plan limit reached | Upgrade plan or use Local Compile Server |

### Q: ESP32 is not recognized

**A:** Check the following in order:

1. **USB cable** — Is it data-capable? (charging-only cables won't work)
2. **Driver** — Is the CP2102 / CH340 driver installed?
3. **Port** — Try a different USB port
4. **Browser** — Are you using Chrome / Edge? (Web Serial API required)

### Q: Error during upload

**A:** Common errors and fixes:

- **"A fatal error occurred: Failed to connect"**
  → Hold the BOOT button on the ESP32 while starting the upload
- **"Timed out waiting for packet header"**
  → Try lowering the baud rate and retry
- **"No serial data received"**
  → Check USB cable and port

### Q: Compilation takes a long time

**A:** The first compilation can take 30 seconds to 1 minute. For faster builds, use the [Local Compile Server](./local-compile-server.md) (Pro plan or higher recommended).

---

## WiFi OTA / BLE

### Q: Device not found (WiFi OTA)

**A:** Check the following:

1. **Same WiFi network** — Are the PC and ESP32 on the same network?
2. **Firewall** — Is mDNS (port 5353) being blocked?
3. **Bonjour** (Windows only) — Is Bonjour Print Services installed?
4. **ESP32 WiFi connection** — Can you see the IP address in the serial monitor?

### Q: BLE device not found

**A:**

1. **Browser support** — Are you using Chrome / Edge? (Web Bluetooth required)
2. **Board support** — ESP32-S2 does not support BLE; RP2040 Pico W also does not support BLE
3. **macOS** — macOS BLE cache may show an outdated device name (OS-level issue). Works correctly on Windows; Mac may be affected.

### Q: OTA update stops midway

**A:**

1. Run the update in an area with a strong WiFi signal
2. Place the ESP32 close to the router
3. Temporarily disconnect other WiFi devices
4. Restart the router

---

## Hardware

### Q: Which ESP32 board should I use?

**A:** DigiCode is exclusively for ESP32-based boards. The following boards have been confirmed working:

- **ESP32-DevKitC** — most common
- **M5StampS3A** — DigiCode recommended board (dedicated breakout board in development)
- **ESP32-S3** — high performance
- **XIAO ESP32S3** — camera-capable

See [Recommended Hardware](./recommended-hardware.md) for details.

### Q: Servo doesn't move

**A:**

1. **Power** — Servos draw significant current; USB power (500 mA) may be insufficient. Use an external power supply (5V/2A or more)
2. **Pin number** — Check that the pin configuration is correct
3. **Initialization** — Make sure you have placed a servo-connect block

### Q: Sensor values are wrong

**A:**

1. **Wiring** — Check that VCC / GND / signal lines are correctly connected
2. **Voltage** — Verify the sensor's operating voltage (3.3V / 5V)
3. **Analog pins** — Use ADC-compatible pins (GPIO32–39)

### Q: Humanoid robot doesn't walk properly

**A:**

1. **Calibration** — Use the home-position block to check the upright stance
2. **Servo pulse width** — Adjust pulse width in the pin settings page (500–2400 µs)
3. **Speed** — Lower the speed to improve stability
4. **Center of gravity** — Adjust the battery position

---

## Project Management

### Q: I can't save my project

**A:**

1. Are you logged in? (Guests can only save locally)
2. Have you entered a project name?
3. Is the network connection working?

### Q: My project disappeared

**A:**

1. Are you logged in with the correct account?
2. Search the project list
3. Accidentally deleted projects cannot be restored

### Q: Can I share a project?

**A:** With the Class Feature, teachers can distribute assignments to students and students can submit their work (Enterprise plan). A general project-sharing feature is planned for future development.

### Q: Can I edit sample projects?

**A:** Loading a sample project automatically creates a copy. The original sample is not modified.

---

## Class Feature

### Q: What is the Class Feature?

**A:** A class management feature for schools and educational institutions (**Enterprise plan**).

| Role | Capabilities |
|------|-------------|
| **Teacher** | Create classes, distribute assignments, review submissions, duplicate classes |
| **Student** | Join classes (via Invitation URL), submit assignments, view submission history |

### Q: Do students need to register an account?

**A:** Yes, students also need a DigiCode account. Joining a class via the Invitation URL sent by the teacher grants Enterprise-level permissions (provided by Fablab Nishiharima).

### Q: Which plan includes the Class Feature?

**A:** The Class Feature is exclusive to the **Enterprise plan**. It is not available on individual Free / Lite / Pro plans.

### Q: Where is the Blockly XML for assignments stored?

**A:** Assignment and submission Blockly XML is stored on the class server (`class.digital-fab.jp`) running on HPE ML30. Only basic management data (class IDs, members, etc.) is stored in D1.

### Q: What happens if the class server goes down?

**A:** Class features (assignment distribution, submission) become unavailable, but normal DigiCode program creation and upload continue to work. The system is designed to limit impact to assignment/submission operations only.

---

## Plans & Pricing

### Q: Can I use it for free?

**A:** Yes, the **Free plan** lets you use basic features at no cost.

| Plan | Best for | Monthly | Cloud Compile | Class Feature |
|------|----------|:-------:|:-------------:|:-------------:|
| **Free** | Trying out / Local Compile | ¥0 | 50/month | — |
| **Lite** | Individual hobbyists | — | 250/month | — |
| **Pro** | Developers / Makers | — | 500/month | — |
| **Enterprise** | Educational institutions / Teams | — | Unlimited | ✓ |

For current pricing, see the [Plan page](/plan).

### Q: How do I change my plan?

**A:** Go to the account menu (top right) → "Plan & Billing". You can change plans, update billing info, or cancel via the Stripe Customer Portal.

### Q: What is an Invited Account?

**A:** An account granted Enterprise-level permissions by Fablab Nishiharima. You do not need to subscribe to a plan yourself. However, you can also subscribe to a higher plan on your own (in that case, the invited permissions are removed).

### Q: Is there an educational license?

**A:** The **Enterprise plan** provides class management features for educational institutions. For bulk licensing or special arrangements, please contact [Fablab Nishiharima](https://fablab-westharima.com/).

### Q: Does using the Local Compile Server consume cloud compile quota?

**A:** No, using the Local Compile Server does not consume cloud compile quota. Ideal for unlimited, high-speed builds on Pro / Enterprise plans. → [Local Compile Server](./local-compile-server.md)

---

## Other

### Q: Which browsers are supported?

**A:**

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✓ Recommended | Web Serial / Web Bluetooth supported |
| Edge | ✓ | Web Serial / Web Bluetooth supported |
| Firefox | △ | USB / BLE upload not supported |
| Safari | △ | USB / BLE upload not supported |

Use Chrome or Edge for USB / BLE upload.

### Q: Can I use it on a smartphone?

**A:** The block editor works on smartphones, but USB upload is not supported. WiFi OTA upload is possible from a smartphone.

### Q: Can I use it offline?

**A:** An internet connection is currently required. With the Local Compile Server, compilation itself can run offline.

### Q: I found a bug

**A:** Please report it on [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues) with the following information:

- Browser and version
- OS
- Plan in use
- Steps to reproduce
- Error message (if any)

---

## Related Documents

- [Getting Started](./getting-started.md)
- [Block Reference](./block-reference.md)
- [Hardware Setup Guide](./hardware-setup.md)
- [Troubleshooting](./troubleshooting.md)
