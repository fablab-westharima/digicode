# OTA Setup Guide (Optional)

**Last updated:** 2026-04-21

> **This guide is optional.** DigiCode works **with just a USB cable**. Get comfortable with the USB workflow in [Getting Started](./getting-started.md) first, then refer to this guide when needed.

---

## What is WiFi OTA?

WiFi OTA (Over-The-Air) lets you upload programs wirelessly via WiFi. Once set up, you can update programs without a USB cable.

### Advantages

- Upload without USB cable
- Fastest method (~15 sec)
- Update multiple devices simultaneously
- Update devices inside enclosures

### Disadvantages / Notes

- One-time setup required (firmware upload + WiFi configuration)
- Requires WiFi connection
- PC and ESP32 must be on the same network
- Requires Bonjour/mDNS (additional install on Windows)
- Upload not possible during WiFi outages or network changes

> **Intermediate+ recommended:** WiFi OTA issues can require firmware re-flashing via USB to recover.

---

## Prerequisites

1. **ESP32 board** (WiFi OTA capable, supportsOta: true)
2. **WiFi router** (a network your ESP32 can connect to)
3. **DigiCode Finder** (recommended)
   - https://github.com/fablab-westharima/DigiCode-Finder/releases

---

## Step 1: Upload Firmware

To use WiFi OTA / BLE, you need to upload **firmware** (OTA base software) once via USB.

1. Connect ESP32 via USB cable
2. Click **"Firmware Upload"** in the left menu
3. Click "INSTALL"
4. Select serial port
5. Wait for completion (~1 min)

> Once uploaded, firmware normally does not need to be re-flashed. Re-flashing is required after a full flash erase.

---

## Step 2: Connect ESP32 to WiFi

1. Connect ESP32 via USB (same connection as firmware upload)
2. Click **"WiFi Setup"** in the left menu
3. Select serial port and click "Connect"
4. In the WiFi setup dialog, enter:
   - **SSID**: Your WiFi network name
   - **Password**: Your WiFi password
5. Click "Connection Test"
6. After success, the fixed IP address is shown

> If the connection test fails, settings are not saved. Verify your SSID and password.

---

## Step 3: Detect Device with DigiCode Finder

### About DigiCode Finder

A desktop app that auto-detects DigiCode devices on your network via mDNS (v1.4.1).

### Installation

**Download:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| OS | File |
|----|------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

### Windows Users: Install Bonjour

If devices aren't detected after launching DigiCode Finder, Bonjour is required.

1. In DigiCode Finder menu: "Help" → "Install Bonjour (Windows)"
2. Download Bonjour Print Services from Apple's official site
3. Install and restart your PC

### Device Detection

1. Launch DigiCode Finder
2. DigiCode devices on the same network are auto-listed
3. Device name, IP address, and firmware version are shown

### Copy IP Address

1. Click "Select" next to the target device
2. IP address is copied to clipboard

### Select Multiple Devices

1. Check multiple devices
2. Click "Select" (JSON with multiple IPs is copied)

---

## Step 4: Upload via WiFi OTA

### Single Device

1. Create your program in the block editor
2. Click **"Upload"** → **"WiFi OTA"**
3. Paste IP address in the device selection dialog
4. Click "Start Upload" (~15 sec)

### Bulk Upload to Multiple Devices

1. Select and copy multiple devices in DigiCode Finder
2. Click "Upload" → "WiFi OTA"
3. Multiple devices appear in the dialog
4. Check target devices and click "Start Bulk Upload"

---

## BLE Upload (Optional)

Bluetooth Low Energy upload. Useful for locations without WiFi or updating devices in enclosures.

### BLE Advantages / Disadvantages

**Advantages:**
- No WiFi needed
- No cable
- Update cased devices

**Disadvantages:**
- Slower than WiFi OTA (~40 sec)
- Requires Web Bluetooth-compatible browser
- Firmware upload prerequisite (same as WiFi OTA)

### Prerequisites

- Firmware uploaded (same as Step 1)
- Web Bluetooth-compatible browser (Chrome, Edge)

### Supported Boards

All BLE-capable (supportsBle: true) ESP32 series boards.

### Steps

1. Create your program
2. Click **"Upload"** → **"BLE"**
3. Click "Scan for devices"
4. Select "DigiCode-XXXXXX" in the browser Bluetooth dialog
5. Click "Pair"
6. Upload starts (~40 sec)

### BLE Troubleshooting

| Symptom | Solution |
|---------|---------|
| Device not found | Restart ESP32, restart browser |
| Pairing fails | Move closer, disconnect other BLE devices |
| Upload stops midway | Restart ESP32 and retry |

---

## Device Name Setup

Useful when managing multiple devices.

1. Open "WiFi Setup" via USB
2. Enter new name in "Device Name" field
3. Click "Save"

**Recommended naming:**
```
DigiCode-[purpose]-[number]
Examples: DigiCode-robot-001, DigiCode-class-02
```

---

## Troubleshooting

### Device Not Detected

| Cause | Solution |
|-------|---------|
| WiFi not connected | Check WiFi setup via USB |
| Different network | Ensure PC and ESP32 are on same WiFi |
| Bonjour not installed (Windows) | Install Bonjour Print Services |
| Firewall | Allow mDNS (port 5353) |

### Upload Stops Midway

| Cause | Solution |
|-------|---------|
| Weak WiFi signal | Move ESP32 closer to router |
| Network congestion | Pause other large transfers |
| Timeout | Restart ESP32 and retry |

### Device Unresponsive After Upload

| Cause | Solution |
|-------|---------|
| Program error | Re-flash firmware via USB |
| WiFi settings lost | Redo WiFi setup via USB |

---

## Reset WiFi Settings

To reset WiFi configuration:

1. Open "Firmware Upload"
2. Run "Erase entire flash (debug)"
3. Re-flash firmware
4. Redo WiFi setup

---

## Security Notes

- Use only on trusted networks
- Not recommended on public WiFi
- Consider VPN or isolated networks for production environments

---

## Related Documents

| Document | Content |
|----------|---------|
| [Getting Started](./getting-started.md) | Basic USB workflow |
| [Common Steps](./01-program-setup-common.md) | Terminology, upload method overview |
| [ESP32 Upload Guide](./04-program-setup-esp32.md) | ESP32 specific settings |
| [Troubleshooting](./troubleshooting.md) | Problem solving guide |
