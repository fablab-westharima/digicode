# Getting Started

**Last updated:** 2026-05-02

DigiCode is a visual programming environment for ESP32-based robots and IoT devices using blocks. This guide walks you through **blinking an LED via USB** in the shortest possible path.

---

## 🚀 Run It in 5 Minutes — Shortest Path

1. **Install the USB driver** (CP2102 or CH340 — only if not installed yet, see below)
2. **Open DigiCode** → top-left **"Samples"** → select **"LED Blink"**
3. **Connect ESP32 to your PC via USB cable**
4. Top-right **"Upload"** button → choose **"USB"** → pick the ESP32 port in the browser dialog
5. **After upload completes, the ESP32 built-in LED (GPIO2) blinks at 1-second intervals** ✅

That's it. You now have a working DigiCode environment.

> 💡 **Guest access works**: account creation is optional. Register only if you want to save programs to the cloud ([details](#guest-access-and-accounts)).

---

## 🟡 Before You Start

| Item | Details |
|---|---|
| **Hardware** | ESP32 development board ([recommended list](./recommended-hardware.md)) + USB cable (Type-C or Micro-USB, **data-capable** — charge-only cables won't work) |
| **Software** | Web browser (Chrome / Edge recommended — Web Serial API required) |
| **Driver** | CP2102 or CH340 depending on the USB-serial chip on your board (see table below) |

---

## 5 Steps to Done

### Step 1: Install the USB Driver

Install a USB-serial driver before connecting the ESP32 to your PC.

| Chip | Example boards | Download |
|---|---|---|
| **CP2102** | ESP32-DevKitC, M5StampS3A, etc. | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Many generic ESP32 boards | http://www.wch.cn/downloads/CH341SER_ZIP.html |

Check your board's product description for the chip type. Restart your PC after installation so the OS picks up the new driver.

> 💡 **Most M5Stack boards use CP2102**. Generic low-cost ESP32 boards usually use CH340.

### Step 2: Open DigiCode

Visit [DigiCode](https://digital-fab.jp) and open the editor. **You can use it as a guest** — no signup required.

### Step 3: Load the "LED Blink" Sample

1. Click **"Samples"** at the top-left
2. Choose the **"Basic"** category → **"LED Blink"**
3. Blocks are auto-placed into the workspace

> ✨ **Success-first approach**: confirming "it works" with a sample before learning the block mechanics has higher retention. If you want to place blocks yourself, see [below](#placing-blocks-yourself-reference).

### Step 4: Connect ESP32 via USB and Upload

1. Connect the ESP32 to your PC via USB cable
2. Click the **"Upload"** button at the top-right of the editor
3. Choose **"USB"**
4. Pick the ESP32 port in the browser's serial port dialog (e.g., `COM3`, `/dev/ttyUSB0`, `/dev/cu.usbserial-XXXX`)
5. Upload starts → the ESP32 auto-restarts when complete

### Step 5: Verify

Success: the ESP32 built-in LED (GPIO2) blinks at **1-second intervals**.

---

## Trouble: Port Doesn't Appear

### No device shows up in the browser's port dialog

Most common cause is missing USB driver:

1. **Step 1 driver** not installed / no reboot after install → install + reboot
2. Verify the **USB cable supports data** (charge-only cables won't make the ESP32 visible to the PC)
3. Unplug + replug the ESP32 → click "Upload" again

Still stuck? See [Troubleshooting](./troubleshooting.md).

---

## Details and Concepts

### Program Upload vs Firmware Upload

| Operation | Content | When |
|---|---|---|
| **Program Upload** | Upload the program built with blocks to the ESP32 | Every time (USB / WiFi OTA / BLE) |
| **Firmware Upload** | Upload base software for WiFi OTA / BLE | **First time only, only if using WiFi OTA / BLE** |

**If you only use USB, firmware upload is not needed.**

### Guest Access and Accounts

- **Guest**: program creation, upload, and samples all work. Saving is file download only.
- **Account (Free)**: cloud-save programs, plus access to AI block generation, feedback submission, and other extras → [plan overview](./index.md#plans)

To register, click **"Login" → "Register"** and enter your email and password.

### Placing Blocks Yourself (reference)

For those who prefer to assemble blocks instead of using a sample. Minimal LED-blink code:

**Setup:**
```
Set Pin Mode [2] to [OUTPUT]
```

**Loop:**
```
Repeat forever:
  Digital Write [2] HIGH
  Wait [1000] ms
  Digital Write [2] LOW
  Wait [1000] ms
```

GPIO2 is the ESP32 built-in LED. For block details, see the [Block Reference](./block-reference.md).

### Sample Categories

| Category | Contents |
|---|---|
| **Basic** | LED blink, serial communication, button input |
| **Sensors** | Ultrasonic, temperature/humidity, light, accelerometer |
| **Motors** | Servo, DC motor, stepper |
| **Robots** | Humanoid, wheeled, transform |
| **IoT** | WiFi, MQTT, Home Assistant |
| **Competition** | Line tracing, micromouse |

---

## What's Next

### Upload Without a Cable (intermediate+)

If plugging in USB every time is inconvenient, you can set up wireless upload:

- **WiFi OTA** — fastest wireless upload (supports bulk updates of multiple devices)
- **BLE** — Bluetooth-based (no WiFi needed, great for cased devices)

A one-time USB setup is required: **Firmware Upload** + WiFi configuration (~5 min).

> 📘 **Details**: [OTA Setup Guide](./05-ota-guide.md)

### Class Feature (Enterprise plan)

- **Teachers**: create a class and share the invite URL with students
- **Students**: join via the invite URL and complete assignments

→ Details: [FAQ (Class Feature)](./faq.md)

### High-Frequency Compilation (advanced)

If you exceed the cloud compile quota, you can run a local compile server on your own PC.

→ Details: [Local Compile Server](./local-compile-server.md)

---

## Next Steps

- [Recommended Hardware](./recommended-hardware.md) — verified device list
- [Block Reference](./block-reference.md) — how to use every block
- [Hardware Setup Guide](./hardware-setup.md) — sensor and motor wiring
- [Troubleshooting](./troubleshooting.md) — common issues and fixes
- [OTA Setup Guide](./05-ota-guide.md) — WiFi OTA / BLE configuration
- [Local Compile Server](./local-compile-server.md) — compile on your own PC (advanced)

---

## Support

If you run into issues, check [Troubleshooting](./troubleshooting.md) or file a GitHub Issue.
