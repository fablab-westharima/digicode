# Program Upload — ESP32

**Last updated:** 2026-04-21

---

## Supported Boards

| Board | USB | WiFi OTA | BLE | Notes |
|-------|:---:|:--------:|:---:|-------|
| ESP32 | ○ | ○ | ○ | Most common |
| ESP32-S3 | ○ | ○ | ○ | High performance, AI expansion |
| ESP32-C3 | ○ | ○ | ○ | RISC-V, low power |
| ESP32-C6 | ○ | ○ | ○ | Matter support |
| M5Stack Basic/Gray/Fire | ○ | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | ○ | Compact |
| ATOM Lite / Matrix | ○ | ○ | ○ | Ultra-compact |
| M5Stamp Pico | ○ | ○ | ○ | — |
| M5Stamp C3/C3U | ○ | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | ○ | DigiCode recommended board (dedicated breakout board in development) |
| XIAO ESP32C3 | ○ | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | ○ | Camera support |
| XIAO ESP32C6 | ○ | ○ | ○ | — |

> **Not supported:** ESP8266 is not supported by DigiCode.

---

## Terminology

| Term | Description |
|------|-------------|
| **Program Upload** | Upload the program created in the block editor (every time) |
| **Firmware Upload** | Upload base software for WiFi OTA / BLE (**first time only, only if using WiFi OTA / BLE**) |

See [Common Steps](./01-program-setup-common.md) for details.

---

## Method 1: USB Direct Upload (Primary · Recommended)

The most reliable upload method. Suitable for beginners and troubleshooting.

### Prerequisites

- USB cable (data-capable)
- USB driver (CP2102 or CH340)

### Install USB Driver

If ESP32 is not recognized, install the driver.

**CP2102 boards (many ESP32-DevKitC, M5StampS3A, etc.):**
- https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

**CH340 boards (many generic ESP32 boards):**
- http://www.wch.cn/downloads/CH341SER_ZIP.html

### Steps

1. Connect ESP32 to PC via USB cable
2. Create your program in the block editor
3. Click **"Upload"** → select **"USB"**
4. Select ESP32 port in the browser's serial port dialog
5. Upload starts (~30 sec) → auto-restarts after completion

### Troubleshooting

| Symptom | Solution |
|---------|---------|
| Port not shown | Install USB driver |
| Upload fails | Hold BOOT button while starting upload |
| Timeout error | Try a different USB port or cable |

---

## Method 2: WiFi OTA (Optional)

Cable-free, fastest upload method. Requires one-time setup.

### Prerequisites

- **Firmware uploaded** (done once via USB)
- WiFi configured (SSID/password)
- DigiCode Finder (desktop app)

### Steps

1. Launch DigiCode Finder, device auto-detected
2. Click "Select" on the target device to copy IP address
3. Click "Upload" → "WiFi OTA" → paste IP address
4. Upload starts (~15 sec)

→ Setup details: [OTA Setup Guide](./05-ota-guide.md)

---

## Method 3: BLE (Optional)

Bluetooth upload. Useful for updating cased devices or locations without WiFi.

### Prerequisites

- **Firmware uploaded** (done once via USB)
- Web Bluetooth-compatible browser (Chrome, Edge)

### Supported Boards

All BLE-capable (supportsBle: true) ESP32 series boards.

### Steps

1. Create your program
2. Click "Upload" → select "BLE"
3. Click "Scan for devices", Bluetooth scan starts
4. Select "DigiCode-XXXXXX" and pair
5. Upload starts (~40 sec)

→ Setup details: [OTA Setup Guide](./05-ota-guide.md)

---

## Method 4: Local Compile Server (Speed-up option)

Compile on your own PC — no cloud quota used, faster builds.

→ Details: [Local Compile Server](./local-compile-server.md)

---

## Firmware Upload (Only for WiFi OTA / BLE users)

Required only once for WiFi OTA or BLE use.

### Steps

1. Click **"Firmware Upload"** in the left menu
2. Connect ESP32 via USB cable
3. Click "INSTALL"
4. Select serial port
5. Wait for completion (~1 min)

### WiFi Setup (for WiFi OTA)

After firmware upload, to use WiFi OTA:

1. Click "WiFi Setup"
2. Select and connect to serial port
3. Enter SSID and password
4. Click "Connection Test"
5. After success, fixed IP address is shown

---

## Serial Monitor

Useful for debugging your program.

1. Connect ESP32 via USB
2. Click "Serial Monitor" in the sidebar
3. Select port and click "Connect"
4. Baud rate: 115200

---

## Choosing an Upload Method

| Situation | Recommended |
|-----------|-------------|
| Beginner / regular development | **USB** (most reliable) |
| WiFi OTA already set up | WiFi OTA (fastest) |
| No WiFi environment | USB or BLE |
| Cased device | BLE or WiFi OTA |
| Classroom bulk update | WiFi OTA |
| Save compile quota | Local compile server |
| Troubleshooting / recovery | **USB** (most reliable) |

---

## Related Documents

| Document | Content |
|----------|---------|
| [Common Steps](./01-program-setup-common.md) | Terminology, upload method overview |
| [OTA Setup Guide](./05-ota-guide.md) | WiFi OTA / BLE setup details |
| [Local Compile Server](./local-compile-server.md) | Compile on your own PC |
| [Troubleshooting](./troubleshooting.md) | Problem solving guide |
| [Hardware Setup Guide](./hardware-setup.md) | Sensor and motor wiring |
