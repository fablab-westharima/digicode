# Program Upload — Common Steps

**Last updated:** 2026-05-02

DigiCode is an **ESP32-only** block programming environment. This document explains "which upload method to choose" and the underlying terminology.

---

## 🚀 Which Method? — Pick One in 30 Seconds

| Your situation | Recommended method |
|---|---|
| **First time** / **want reliable, trouble-free upload** | 🥇 **USB Direct** ([details](#1-usb-direct-upload-primary-recommended)) |
| ESP32 is in a case / plugging in USB every time is annoying / want to update many devices at once | 🥈 **WiFi OTA** ([details](./05-ota-guide.md)) |
| No WiFi available / WiFi setup is too much hassle | 🥉 **BLE Upload** ([details](./05-ota-guide.md)) |
| Out of cloud compile quota / want offline use / want speed-up | ⚡ **Local Compile + any of the above** ([details](./local-compile-server.md)) |

> 💡 **When in doubt, start with USB Direct**. WiFi OTA / BLE are optional methods that become available after a one-time "firmware upload" via USB.

---

## 4 Upload Methods — Comparison

| Method | Speed | Cable | Prerequisites | Supported boards |
|---|---|---|---|---|
| **🥇 USB Direct** | ~30 sec | Required | USB driver | All boards |
| **🥈 WiFi OTA** | ~15 sec (fastest) | Not required | Firmware upload + WiFi setup (first time only) | ESP32 series (`supportsOta: true`) |
| **🥉 BLE** | ~40 sec | Not required | Firmware upload (first time only) | BLE-capable ESP32 (`supportsBle: true`) |
| **⚡ Local Compile** | (combine with the above; speed depends on the upload method, cache HIT ~1 ms) | — | Docker | All boards (combinable) |

---

## Supported Boards

DigiCode is **ESP32-only**.

| Category | Example boards | USB | WiFi OTA | BLE |
|---|---|:---:|:---:|:---:|
| **Generic ESP32** | ESP32 / S3 / C3 / C6 | ○ | ○ | ○ |
| **M5Stack** | M5Stack Basic / M5StickC Plus / ATOM / M5Stamp etc. | ○ | ○ | ○ |
| **XIAO ESP32** | XIAO ESP32C3 / S3 / C6 | ○ | ○ | ○ |

> **Not supported:** ESP8266, Arduino Uno/Nano, and RP2040 series are out of scope.

---

## Basic Upload Flow (USB)

1. **Connect ESP32 to PC via USB cable**
2. Build your program in the block editor (or load a sample)
3. Top-right **"Upload"** button → choose **"USB"**
4. Pick the port in the browser's serial port dialog
5. After upload completes, the ESP32 auto-restarts and runs the program

📘 **For the full first-time procedure**, see [Getting Started](./getting-started.md) (driver install through LED-blink sample).

---

## Details and Concepts

### Terminology: Program Upload vs Firmware Upload

In DigiCode, "Program Upload" and "Firmware Upload" are **distinct operations**.

#### Program Upload (normal operation)

Uploading the program built with the block editor to the microcontroller.

| Item | Content |
|---|---|
| **What gets uploaded** | The program you built with blocks |
| **Upload method** | USB (primary) / WiFi OTA / BLE |
| **Frequency** | Anytime (whenever you change the program) |
| **UI location** | "Upload" button in the editor |

#### Firmware Upload (only when using WiFi OTA / BLE)

Uploading the base software (OTA receiver) needed for WiFi OTA or BLE. **Not required if you only use USB.**

| Item | Content |
|---|---|
| **What gets uploaded** | OTA base software (minimal base instructions for hardware control) |
| **Upload method** | Via USB only |
| **Frequency** | First time only when using WiFi OTA / BLE |
| **UI location** | "Firmware Upload" in the left menu |

### 4 Upload Methods — Detail

#### 1. USB Direct Upload (Primary · Recommended)

Most reliable, works in any environment. Requires a USB driver (CP2102 / CH340) installed in advance. See [Getting Started](./getting-started.md) and [ESP32 Upload Guide](./04-program-setup-esp32.md).

#### 2. WiFi OTA (Optional)

No cable, fastest, supports bulk updates of multiple devices. Requires a WiFi router. On Windows without Bonjour, use [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) as an mDNS alternative (Mac / Linux have native mDNS support). See [OTA Setup Guide](./05-ota-guide.md).

> ⚠️ **For Windows users**: WiFi OTA setup on Windows is for advanced users. Beginners should prefer USB / BLE upload. See [Local Compile Server § Windows](./local-compile-server.md#-before-anything-else-recommendation-and-prerequisites) for context.

#### 3. BLE Upload (Optional)

No cable, no WiFi needed. Requires a Web Bluetooth-capable browser (Chrome / Edge). See [OTA Setup Guide](./05-ota-guide.md).

#### 4. Local Compile Server (Speed-up option)

No cloud compile quota consumed, offline-capable. Requires Docker (or OrbStack / Rancher Desktop / Podman). Orthogonal to upload method (USB / WiFi OTA / BLE), can be combined with any. See [Local Compile Server](./local-compile-server.md).

### What You Need

#### Required
- Computer (Windows / Mac / Linux)
- Web browser (Chrome / Edge recommended)
- Compatible ESP32 board
- USB cable (data-capable)
- USB driver (CP2102 or CH340)

#### Optional
- **For WiFi OTA**: WiFi router (DigiCode Finder on Windows without Bonjour)
- **For BLE**: Web Bluetooth-capable browser (Chrome / Edge)
- **For local compile**: Docker environment

### If You Want to Use WiFi OTA / BLE

A one-time setup is required:

1. Connect ESP32 via USB
2. Go to **"Firmware Upload"** in the left menu → click **"INSTALL"**
3. (WiFi OTA only) Configure SSID and password under **"WiFi Setup"**
4. After this, you can upload via WiFi OTA / BLE without USB

→ Details: [OTA Setup Guide](./05-ota-guide.md)

---

## Common Issues and Fixes

| Symptom | Cause | Fix |
|---|---|---|
| Port doesn't appear | USB driver not installed | Install CP2102 or CH340 driver + reboot PC |
| Upload error | USB cable is charge-only | Replace with a data-capable cable |
| Timeout during upload | Unstable connection | Try a different USB port / cable |
| Can't enter BOOT mode | Board-specific procedure | Hold BOOT / BOOTSTRAP button while starting upload |
| Not detected via WiFi OTA | WiFi disconnected / firmware not flashed | Check firmware upload and WiFi setup via USB |

For more, see [Troubleshooting](./troubleshooting.md).

---

## Related Documents

- [Getting Started](./getting-started.md) — From USB to LED blink
- [ESP32 Upload Guide](./04-program-setup-esp32.md) — ESP32 upload details
- [OTA Setup Guide](./05-ota-guide.md) — WiFi OTA / BLE setup
- [Local Compile Server](./local-compile-server.md) — Compile on your own PC
- [Troubleshooting](./troubleshooting.md) — Common issues and fixes
