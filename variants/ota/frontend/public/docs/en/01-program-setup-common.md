# Program Upload — Common Steps

**Last updated:** 2026-04-21

DigiCode is an **ESP32-only** block programming environment. This document defines terminology and provides an overview of upload methods.

---

## Terminology

DigiCode distinguishes between "Program Upload" and "Firmware Upload."

### Program Upload (Normal operation)

Uploading the program you built with blocks to your microcontroller.

| Item | Content |
|------|---------|
| **What is uploaded** | The program you made with blocks |
| **Upload method** | **USB** (primary) / WiFi OTA / BLE |
| **Frequency** | Any time (whenever you change the program) |
| **UI location** | "Upload" button in the editor |

### Firmware Upload (Only for WiFi OTA / BLE users)

Uploading the base software needed for WiFi OTA or BLE. **Not required if you only use USB upload.**

| Item | Content |
|------|---------|
| **What is uploaded** | OTA base software (minimal base instructions that directly control and drive the hardware) |
| **Upload method** | Via USB only |
| **Frequency** | First time only when using WiFi OTA / BLE |
| **UI location** | "Firmware Upload" in the left menu |

---

## Supported Boards

DigiCode is ESP32-only.

| Category | Example boards | USB | WiFi OTA | BLE |
|---------|---------------|:---:|:--------:|:---:|
| **Generic ESP32** | ESP32 / S3 / C3 / C6 | ○ | ○ | ○ |
| **M5Stack** | M5Stack Basic / M5StickC Plus / ATOM / M5Stamp etc. | ○ | ○ | ○ |
| **XIAO ESP32** | XIAO ESP32C3 / S3 / C6 | ○ | ○ | ○ |

> **Not supported:** ESP8266, Arduino Uno/Nano, and RP2040 series are outside DigiCode's support scope.

---

## 4 Upload Methods

### 1. USB Direct Upload (Primary · Recommended)

| Item | Content |
|------|---------|
| **Feature** | Most reliable · works in any environment |
| **Speed** | Fast (~30 sec) |
| **Cable** | Required |
| **Prerequisites** | Install USB driver |
| **Supported boards** | All boards |

### 2. WiFi OTA (Optional)

| Item | Content |
|------|---------|
| **Feature** | No cable · fastest · bulk update multiple devices |
| **Speed** | Fastest (~15 sec) |
| **Cable** | Not required |
| **Prerequisites** | Firmware upload + WiFi setup (first time only) |
| **Supported boards** | ESP32 series (supportsOta: true) |
| **Required** | WiFi router, DigiCode Finder |

### 3. BLE (Optional)

| Item | Content |
|------|---------|
| **Feature** | No cable · no WiFi needed |
| **Speed** | Medium (~40 sec) |
| **Cable** | Not required |
| **Prerequisites** | Firmware upload (first time only) |
| **Supported boards** | BLE-capable ESP32 (supportsBle: true) |
| **Required** | Web Bluetooth-compatible browser (Chrome, Edge) |

### 4. Local Compile Server (Speed-up option)

| Item | Content |
|------|---------|
| **Feature** | No cloud compile quota used · offline capable |
| **Required** | Docker (or OrbStack, Rancher Desktop, etc.) |
| **Recommended plan** | Pro and above |

→ Details: [Local Compile Server](./local-compile-server.md)

---

## What You Need

### Required
- Computer (Windows / Mac / Linux)
- Web browser (Chrome, Edge recommended)
- Compatible ESP32 board
- USB cable (data-capable)
- USB driver (CP2102 or CH340)

### Optional
- **For WiFi OTA:** WiFi router, DigiCode Finder
- **For BLE:** Web Bluetooth-compatible browser (Chrome, Edge)
- **For local compile:** Docker environment

---

## Basic Upload Flow (USB)

1. Connect ESP32 to PC via USB cable
2. Create your program in the block editor
3. Click "Upload" → select "USB"
4. Select serial port
5. After upload completes, ESP32 auto-restarts and runs the program

---

## If You Want to Use WiFi OTA / BLE

A one-time setup is required:

1. Connect ESP32 via USB
2. Go to "**Firmware Upload**" in the left menu → click "INSTALL"
3. (WiFi OTA only) Configure WiFi in "WiFi Setup" with SSID and password
4. After setup, you can upload via WiFi OTA / BLE without USB

→ Details: [OTA Setup Guide](./05-ota-guide.md)

---

## Common Issues and Solutions

| Symptom | Cause | Solution |
|---------|-------|---------|
| Port not shown | USB driver not installed | Install CP2102 or CH340 driver |
| Upload error | Charge-only USB cable | Replace with a data-capable cable |
| Timeout during upload | Unstable connection | Try a different USB port or cable |
| Can't enter BOOT mode | Board-specific procedure | Hold BOOT button while starting upload |
| Not detected via WiFi OTA | WiFi not connected or FW not flashed | Check firmware upload and WiFi setup via USB |

---

## Related Documents

| Document | Content |
|----------|---------|
| [ESP32 Upload Guide](./04-program-setup-esp32.md) | ESP32 upload details |
| [OTA Setup Guide](./05-ota-guide.md) | WiFi OTA / BLE setup |
| [Local Compile Server](./local-compile-server.md) | Compile on your own PC |
