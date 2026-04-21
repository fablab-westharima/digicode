# Getting Started

**Last updated:** 2026-04-21

DigiCode is a visual programming environment that makes it easy to program ESP32-based robots and IoT devices using blocks.

This guide explains the **basic USB workflow**. For WiFi OTA / BLE setup, see the [OTA Setup Guide](./05-ota-guide.md).

---

## What You Need

### Hardware

- **ESP32 development board** — see [Recommended Hardware](./recommended-hardware.md)
- **USB cable** (Type-C or Micro-USB, data-capable)
- Sensors and motors (depending on what you're making)

### Software

- **Web browser** (Chrome or Edge recommended)
- **USB driver** (CP2102 or CH340 — see below)

---

## Create an Account (Optional)

**You can create and upload programs as a guest.** Create an account if you want to save programs to the cloud.

1. Go to DigiCode
2. Click "Login" → "Register"
3. Enter your email and password

> **About plans:** Start with Guest (Free) to try it out. → [Plan Overview](./index.md#plans)

---

## Step 1: Install USB Driver

You need a USB driver before connecting your ESP32 to your PC.

| Chip | Example boards | Download |
|------|---------------|---------|
| **CP2102** | ESP32-DevKitC, M5StampS3A, etc. | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Many generic ESP32 boards | http://www.wch.cn/downloads/CH341SER_ZIP.html |

> Check your board's product description to find the chip type. Restart your PC after installing.

---

## Step 2: Create a Program (LED Blink)

1. Open the DigiCode editor
2. Place the following blocks from the toolbox:

**Setup block:**
```
Setup:
  Set Pin Mode [2] to [OUTPUT]
```

**Loop block:**
```
Repeat forever:
  Digital Write [2] HIGH
  Wait [1000] ms
  Digital Write [2] LOW
  Wait [1000] ms
```

> GPIO2 is the ESP32 built-in LED.

---

## Step 3: Upload via USB

1. **Connect ESP32 to PC via USB cable**
2. Click the **"Upload"** button in the editor
3. Select **"USB"**
4. Choose the ESP32 port in the browser's serial port dialog (e.g., COM3, /dev/ttyUSB0)
5. Upload starts → ESP32 auto-restarts after completion

**Verify:** The ESP32 built-in LED (GPIO2) blinks at 1-second intervals.

### If the port doesn't appear

The USB driver may not be installed correctly. Go back to Step 1 and install the driver.

---

## Step 4: Try Sample Projects

1. Click the **"Samples"** button in the editor
2. Choose from categories:
   - **Basic** — LED blink, serial communication
   - **Sensors** — ultrasonic sensor, temperature/humidity
   - **Competition** — line tracing, micromouse
3. Load the sample
4. Adjust pin numbers as needed
5. Upload via USB and verify

---

## Difference Between Program Upload and Firmware Upload

| Operation | Content | When |
|-----------|---------|------|
| **Program Upload** | Upload the program made with blocks | Every time (USB / WiFi OTA / BLE) |
| **Firmware Upload** | Upload base software for WiFi OTA / BLE | **First time only, only if using WiFi OTA / BLE** |

**If you only use USB, firmware upload is not required.**

---

## Optional: Upload Without a Cable

If connecting a USB cable every time is inconvenient, you can set up WiFi OTA / BLE.

- **WiFi OTA** — fastest wireless upload (supports bulk updates)
- **BLE** — Bluetooth-based (no WiFi needed, great for cased devices)

A one-time USB setup is required: **Firmware Upload** + WiFi configuration (~5 min).

> **Intermediate+ recommended:** WiFi OTA requires network configuration and troubleshooting can be complex. We recommend getting comfortable with USB first before switching.

→ Details: [OTA Setup Guide](./05-ota-guide.md)

---

## Using Classes (Enterprise Plan)

- **Teachers:** Create a class and share the invitation URL with students
- **Students:** Join the class via the invitation URL and complete assignments

→ Details: [FAQ (Class Feature)](./faq.md)

---

## Next Steps

- [Recommended Hardware](./recommended-hardware.md) — Verified device list
- [Block Reference](./block-reference.md) — How to use all blocks
- [Hardware Setup Guide](./hardware-setup.md) — Sensor and motor wiring
- [Troubleshooting](./troubleshooting.md) — Common issues and solutions
- [OTA Setup Guide](./05-ota-guide.md) — WiFi OTA / BLE configuration
- [Local Compile Server](./local-compile-server.md) — Compile on your own PC (advanced)

---

## Support

If you encounter issues, check [Troubleshooting](./troubleshooting.md) or file a GitHub Issue.
