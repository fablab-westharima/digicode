# Program Upload - ESP32

**Last updated:** 2025-12-28

---

## Supported Boards

- ESP32
- ESP32-S2 / S3
- ESP32-C2 / C3 / C5 / C6
- ESP8266
- Other ESP-IDF compatible boards

---

## ESP32 Features

ESP32 is a high-performance microcontroller with built-in WiFi/Bluetooth.

- **Language:** Arduino C++
- **Connection methods:** WiFi OTA, BLE, USB
- **Bootloader:** Fixed in ROM (usually no replacement needed)

---

## Terminology

| Term | Description |
|------|-------------|
| **Firmware** | DigiCode base program. USB upload, initial only |
| **Program** | User program from block editor. Can be updated anytime |

See [Common Steps](./01-program-setup-common.md) for details.

---

## Three Upload Methods

ESP32 supports three upload methods.

| Method | Use Case | Supported Boards | Features |
|--------|----------|------------------|----------|
| **WiFi OTA** | Regular updates | All ESP32 | Fastest, no cable |
| **BLE** | AP-restricted, enclosed devices | ESP32 (except S2) | No cable, works without WiFi |
| **USB** | Initial setup, reliable upload | All boards | Works anywhere |

---

## Method 1: WiFi OTA Upload (Recommended)

The fastest wireless upload method.

### Prerequisites

- Firmware uploaded via USB
- ESP32 connected to WiFi
- DigiCode Finder (desktop app)

### Steps

1. **Launch DigiCode Finder**
   - DigiCode devices on network are auto-detected
   - Download: https://github.com/fablab-westharima/DigiCode-Finder/releases

2. **Select device and copy IP**
   - Click "Select" button for target device
   - IP address is copied to clipboard

3. **Upload in DigiCode (browser)**
   - Create your program
   - Click "Upload" button
   - Select "WiFi OTA"
   - Paste IP in device selection dialog
   - Click "Start Upload"

See [OTA Setup Guide](./05-ota-guide.md) for details.

---

## Method 2: BLE Upload

Upload via Bluetooth Low Energy. Useful for environments without WiFi or enclosed devices.

### Prerequisites

- Firmware uploaded via USB
- Web Bluetooth browser (Chrome, Edge)

### Supported Boards

- ESP32 (standard)
- ESP32-C3
- ESP32-S3

> **Note:** ESP32-S2 does not support BLE.

### Steps

1. **Create program in DigiCode (browser)**

2. **Select "Upload" → "BLE"**

3. **Start Bluetooth scan**
   - Click "Search devices"
   - Browser's Bluetooth dialog appears

4. **Select device**
   - Select device named "DigiCode-XXXXXX"
   - Click "Pair"

5. **Start upload**
   - Progress bar is displayed
   - Wait for completion (slower than WiFi OTA)

### Troubleshooting

| Symptom | Solution |
|---------|----------|
| Device not found | Restart ESP32, restart browser |
| Pairing failed | Move closer, disconnect other BLE connections |
| Upload stops midway | Restart ESP32 and retry |

---

## Method 3: USB Direct Upload

The most reliable upload method. Use for initial setup or troubleshooting.

### Prerequisites

- USB cable (data-capable)
- USB driver (CP2102 or CH340)

### Steps

1. **Connect ESP32 to PC via USB cable**

2. **Create program in DigiCode (browser)**

3. **Select "Upload" → "USB"**

4. **Select serial port**
   - Browser's serial port dialog appears
   - Select the port for ESP32

5. **Start upload**
   - Four files are uploaded sequentially (fullPackage mode)
   - bootloader.bin → partitions.bin → boot_app0.bin → firmware.bin

### USB Driver Installation

If ESP32 is not recognized, install USB drivers.

**CP2102 chip boards:**
- https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

**CH340 chip boards:**
- http://www.wch.cn/downloads/CH341SER_ZIP.html

### Troubleshooting

| Symptom | Solution |
|---------|----------|
| Port not shown | Install USB driver |
| Upload failed | Hold BOOT button while starting upload |
| Timeout error | Try different USB port |

---

## Initial Firmware Upload

Required when using DigiCode on a new ESP32.

### Steps

1. Click "**Firmware Upload**" in left menu
2. Connect ESP32 to PC via USB cable
3. Click "INSTALL" button
4. Select serial port
5. Wait for upload (~1 minute)

### WiFi Setup (for OTA)

After firmware upload, for WiFi OTA:

1. Click "WiFi Settings"
2. Select serial port and connect
3. Enter SSID and password
4. Click "Connection Test"
5. Fixed IP address is displayed after success

---

## Serial Monitor for Debugging

Serial monitor is useful for debugging programs.

### In Browser

DigiCode has a built-in serial monitor:

1. Connect ESP32 via USB
2. Click "Serial Monitor" in sidebar
3. Select port and click "Connect"
4. Baud rate: 115200

### In Arduino IDE

1. Open Tools → Serial Monitor
2. Baud rate: 115200
3. ESP32 output is displayed

---

## Choosing the Right Method

| Situation | Recommended Method |
|-----------|--------------------|
| Regular updates (fastest) | WiFi OTA |
| No WiFi available | BLE |
| Initial setup | USB |
| Troubleshooting | USB |
| Enclosed device | BLE or WiFi OTA |
| Classroom/workshop (many devices) | WiFi OTA (batch update) |

---

## Related Documents

| Document | Content |
|----------|---------|
| [Common Steps](./01-program-setup-common.md) | Terminology, common procedures |
| [OTA Setup Guide](./05-ota-guide.md) | WiFi OTA detailed setup |
| [Troubleshooting](./troubleshooting.md) | Problem solving guide |
| [Hardware Setup](./hardware-setup.md) | Sensor and motor wiring |
