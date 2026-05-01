# Program Upload — ESP32

**Last updated:** 2026-05-02

This page summarizes upload procedures for ESP32-series boards (USB / WiFi OTA / BLE / Local Compile) by method.

---

## 🚀 USB Upload — 5 Steps

Most reliable, recommended for beginners. Done in ~30 seconds.

1. **Connect ESP32 to PC via USB cable (data-capable)**
2. Build your program in the block editor (or load a sample)
3. Top-right **"Upload"** button → choose **"USB"**
4. Pick the ESP32 port in the browser's serial port dialog
5. After upload completes, the ESP32 auto-restarts ✅

> 💡 **If no port appears, install the USB driver (CP2102 / CH340) and reboot** ([details](#install-usb-driver)).

---

## Supported Boards

| Board | USB | WiFi OTA | BLE | Notes |
|---|:---:|:---:|:---:|---|
| ESP32 | ○ | ○ | ○ | Most common |
| ESP32-S3 | ○ | ○ | ○ | High performance, AI expansion |
| ESP32-C3 | ○ | ○ | ○ | RISC-V, low power |
| ESP32-C6 | ○ | ○ | ○ | Matter support |
| M5Stack Basic / Gray / Fire | ○ | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | ○ | Compact |
| ATOM Lite / Matrix | ○ | ○ | ○ | Ultra-compact |
| M5Stamp Pico | ○ | ○ | ○ | — |
| M5Stamp C3 / C3U | ○ | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | ○ | DigiCode recommended board (dedicated breakout in development) |
| XIAO ESP32C3 | ○ | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | ○ | Camera support |
| XIAO ESP32C6 | ○ | ○ | ○ | — |

> **Not supported:** ESP8266 is not supported by DigiCode.

---

## 4 Upload Methods — Quick Comparison

| Method | Speed | Prerequisites | Notes |
|---|---|---|---|
| **🥇 USB Direct** | ~30 sec | USB driver | Most reliable |
| **🥈 WiFi OTA** | ~15 sec | FW + WiFi setup (first time via USB) | Fastest, bulk update OK |
| **🥉 BLE** | ~40 sec | FW (first time via USB) | No WiFi needed |
| **⚡ Local Compile** | (combinable) | Docker | Saves cloud quota |

---

## Method 1: USB Direct Upload (Primary · Recommended)

### Install USB Driver

If the ESP32 is not recognized (no device in the port selection dialog), install a USB driver.

| Chip | Example boards | Download |
|---|---|---|
| **CP2102** | ESP32-DevKitC, M5StampS3A, most M5Stack series | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Many generic ESP32 boards | http://www.wch.cn/downloads/CH341SER_ZIP.html |

After installation, **reboot the PC**.

### Troubleshooting

| Symptom | Fix |
|---|---|
| Port doesn't appear | Install USB driver + reboot, verify USB cable supports data |
| Upload fails | Hold BOOT / BOOTSTRAP button while starting upload |
| Timeout error | Try a different USB port / cable |

---

## Method 2: WiFi OTA (Optional)

Cable-free, fastest upload. Supports bulk update of multiple devices.

### Prerequisites

- **Firmware uploaded** (one-time via USB, [details](#firmware-initial-upload))
- WiFi configured (SSID / password)
- WiFi router (same LAN as ESP32)
- (Only on Windows without Bonjour) [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) — mDNS alternative. Not needed on Mac / Linux (native mDNS).

### Steps

1. Open DigiCode in browser (or use DigiCode Finder to get the IP address)
2. **"Upload"** → **"WiFi OTA"**
3. (When mDNS auto-discovery works, pick from the device list / otherwise enter the IP address)
4. Upload starts (~15 sec)

> ⚠️ **Windows advanced users only**: WiFi OTA setup has multiple prerequisites and is heavy lift for Windows beginners. Prefer USB / BLE. See [Local Compile Server § Windows](./local-compile-server.md#-before-anything-else-recommendation-and-prerequisites).

→ Setup details: [OTA Setup Guide](./05-ota-guide.md)

---

## Method 3: BLE (Optional)

Bluetooth-based upload. Useful for cased devices and locations without WiFi.

### Prerequisites

- **Firmware uploaded** (one-time via USB)
- Web Bluetooth-capable browser (Chrome / Edge)
- Supported boards: BLE-capable ESP32 (`supportsBle: true`)

### Steps

1. Build your program in the block editor
2. **"Upload"** → **"BLE"**
3. **"Scan for devices"** → Bluetooth scan starts
4. Select **"DigiCode-XXXXXX"** and pair
5. Upload starts (~40 sec)

→ Setup details: [OTA Setup Guide](./05-ota-guide.md)

---

## Method 4: Local Compile Server (Speed-up option)

Compile on your own PC — no cloud quota used, faster builds. Orthogonal to the upload method (USB / WiFi OTA / BLE), combinable with any. Cache HIT in ~1 ms.

→ Details: [Local Compile Server](./local-compile-server.md)

---

## Details and Concepts

### Terminology

| Term | Description |
|---|---|
| **Program Upload** | Upload the program built in the block editor (every time) |
| **Firmware Upload** | Upload base software for WiFi OTA / BLE (**first time only, only if using WiFi OTA / BLE**) |

For more, see [Common Steps § Terminology](./01-program-setup-common.md#terminology-program-upload-vs-firmware-upload).

### Firmware Initial Upload

If you want to use WiFi OTA or BLE, perform this once via USB.

1. Click **"Firmware Upload"** in the left menu
2. Connect ESP32 to PC via USB cable
3. Click **"INSTALL"**
4. Select serial port
5. Wait for completion (~1 min)

### WiFi Setup (for WiFi OTA)

After firmware upload, to use WiFi OTA:

1. Click **"WiFi Setup"**
2. Select and connect to serial port
3. Enter SSID and password
4. Click **"Connection Test"**
5. After success, the fixed IP address is shown

### Serial Monitor for Debugging

Useful for debugging your program.

1. Connect ESP32 via USB
2. Click **"Serial Monitor"** in the sidebar
3. Select port and click **"Connect"**
4. Baud rate: **115200**

---

## Choosing an Upload Method

| Situation | Recommended |
|---|---|
| Beginner / regular development | **🥇 USB** (most reliable) |
| WiFi OTA already set up | 🥈 **WiFi OTA** (fastest) |
| No WiFi environment | USB or BLE |
| Cased device | 🥉 BLE or WiFi OTA |
| Classroom bulk update | WiFi OTA |
| Save compile quota | ⚡ Local compile server |
| Troubleshooting / recovery | **🥇 USB** (most reliable) |

---

## Related Documents

- [Getting Started](./getting-started.md) — First-time USB upload tutorial
- [Common Steps](./01-program-setup-common.md) — Terminology, upload method overview
- [OTA Setup Guide](./05-ota-guide.md) — WiFi OTA / BLE setup details
- [Local Compile Server](./local-compile-server.md) — Compile on your own PC
- [Troubleshooting](./troubleshooting.md) — Problem solving guide
- [Hardware Setup Guide](./hardware-setup.md) — Sensor and motor wiring
