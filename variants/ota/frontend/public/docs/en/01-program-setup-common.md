# Program Upload - Common Steps

**Last updated:** 2025-12-28

---

## Introduction

DigiCode allows you to upload programs created with Blockly to various microcontroller boards. This document explains the common preparation and basic workflow for all microcontrollers.

---

## Terminology

### Firmware Upload

Uploading DigiCode's base system software. This is **required only once**.

| Item | Description |
|------|-------------|
| **What is uploaded** | DigiCode base program (Arduino C++) |
| **Upload method** | USB only |
| **Frequency** | Initial only (except after Flash erase) |
| **UI location** | Left menu "Firmware Upload" |

### Program Upload

Uploading user programs created with Blockly. Can be uploaded and updated multiple times after firmware is installed.

| Item | Description |
|------|-------------|
| **What is uploaded** | User program created in block editor |
| **Upload method** | WiFi OTA / BLE / USB |
| **Frequency** | Anytime (whenever program changes) |
| **UI location** | Editor "Upload" button |

---

## Supported Microcontrollers

| Family | Boards | Upload Methods |
|--------|--------|----------------|
| **ESP32** | 9+ types | WiFi OTA / BLE / USB |
| **RP2040** | 3+ types | USB |
| **Arduino** | 4+ types | USB |

### ESP32 Series
- ESP32
- ESP32-S2 / S3
- ESP32-C2 / C3 / C5 / C6
- ESP8266

### RP2040 Series
- Raspberry Pi Pico
- Pimoroni Tiny 2040
- Adafruit FeatherS2/S3

### Arduino Series
- Arduino Uno
- Arduino Nano
- Arduino Nano (Old Bootloader)
- Arduino Leonardo

---

## Three Upload Methods

### WiFi OTA (Over-The-Air)

Upload programs wirelessly via WiFi.

| Item | Description |
|------|-------------|
| **Advantage** | Fast, no cable needed |
| **Disadvantage** | Firmware upload required first |
| **Supported boards** | ESP32 series |
| **Requirements** | DigiCode Finder (device detection app) |

### BLE (Bluetooth Low Energy)

Upload programs via Bluetooth.

| Item | Description |
|------|-------------|
| **Advantage** | No cable, works without WiFi |
| **Disadvantage** | Slower than WiFi OTA |
| **Supported boards** | ESP32 (except S2) |
| **Requirements** | Web Bluetooth browser (Chrome, Edge) |

### USB Direct Upload

Upload via USB cable connection.

| Item | Description |
|------|-------------|
| **Advantage** | Reliable, works anywhere |
| **Disadvantage** | Cable required |
| **Supported boards** | All boards |
| **Requirements** | USB cable, drivers |

---

## Requirements

### Required
- Computer (Windows / Mac / Linux)
- Browser (Chrome, Edge recommended)
- Supported microcontroller board
- USB cable (for initial firmware upload)

### Optional
- **For WiFi OTA:** WiFi router, DigiCode Finder
- **For BLE:** Web Bluetooth browser

---

## Basic Firmware Upload Flow

All microcontrollers require **firmware** upload first.

### Steps

1. **USB Connection**
   - Connect microcontroller to PC via USB
   - Verify board is recognized

2. **Firmware Upload in DigiCode**
   - Click "Firmware Upload" in left menu
   - Click "INSTALL" button
   - Select serial port
   - Wait for upload (~1 minute)

3. **Verification**
   - Device restarts and operates normally

### For ESP32 with WiFi OTA

Additional setup after firmware upload:

1. Click "WiFi Settings"
2. Select serial port and connect
3. Enter SSID and password
4. Click "Connection Test"
5. Fixed IP address is displayed after success

---

## Device Detection

### ESP32 (WiFi OTA)

**Using DigiCode Finder (recommended):**

1. Download DigiCode Finder
   - https://github.com/fablab-westharima/DigiCode-Finder/releases
2. Launch the app
3. DigiCode devices on the same network are auto-detected

### All Microcontrollers (USB)

1. Connect ESP32 via USB
2. Click "Serial Monitor" in sidebar
3. Select port and connect
4. Output displayed means normal operation

---

## Common Issues and Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| Device not recognized | USB connection issue | Reconnect cable, try different port |
| Upload error | Missing driver | Install USB driver |
| Not working after upload | Wrong device selection | Check board info and reset |
| Not detected in WiFi OTA | WiFi not connected | Check WiFi settings via USB |

---

## Related Documents

| Document | Content |
|----------|---------|
| [RP2040 Upload Guide](./02-program-setup-rp2040.md) | RP2040 upload steps |
| [Arduino Upload Guide](./03-program-setup-arduino.md) | Arduino upload steps |
| [ESP32 Upload Guide](./04-program-setup-esp32.md) | ESP32 upload steps |
| [OTA Setup Guide](./05-ota-guide.md) | WiFi OTA detailed setup |
