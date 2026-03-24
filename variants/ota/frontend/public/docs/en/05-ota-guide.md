# OTA Setup Guide

**Last updated:** 2025-12-28

---

## Introduction

OTA (Over-The-Air) upload allows you to upload programs to ESP32 via WiFi. Update programs wirelessly without a USB cable.

---

## Terminology

| Term | Description |
|------|-------------|
| **Firmware** | DigiCode base program. USB upload, initial only |
| **Program** | User program from block editor. Can be updated via WiFi OTA anytime |

See [Common Steps](./01-program-setup-common.md) for details.

---

## OTA Advantages and Limitations

### Advantages
- No USB cable needed (WiFi only)
- Update multiple devices simultaneously
- Update even if device is in a case

### Limitations
- Firmware must be uploaded via USB first
- WiFi environment required
- ESP32 and PC must be on the same network

---

## Prerequisites

1. **Firmware is uploaded**
   - Initial upload via USB from left menu "Firmware Upload"

2. **WiFi router available**
   - WiFi network ESP32 can connect to

3. **DigiCode Finder (recommended)**
   - Desktop app for device detection
   - https://github.com/fablab-westharima/DigiCode-Finder/releases

---

## Step 1: Connect ESP32 to WiFi

### WiFi Setup via USB

1. Connect ESP32 to PC via USB cable
2. Click "**WiFi Settings**" in left menu (or "Firmware Upload" → "WiFi Settings")
3. Select serial port and click "Connect"
4. Enter in WiFi settings dialog:
   - **SSID**: WiFi network name
   - **Password**: WiFi password
5. Click "Connection Test"
6. Fixed IP address is displayed after success

> **Note:** Settings are not saved unless connection test succeeds. Enter correct SSID and password.

### Verify Settings

After successful connection:
- Device name
- Assigned IP address
- Connected SSID

---

## Step 2: Detect Devices with DigiCode Finder

### What is DigiCode Finder

A desktop app that auto-detects DigiCode devices on the network via mDNS.

### Installation

1. Go to https://github.com/fablab-westharima/DigiCode-Finder/releases
2. Download file for your OS:
   - **Windows**: `.exe` file
   - **macOS**: `.dmg` file
   - **Linux**: `.AppImage` file
3. Install and launch

### For Windows Users

**Bonjour installation is required.**

If devices are not detected after launching DigiCode Finder:
1. Click menu "Help" → "Install Bonjour (Windows)"
2. Download Bonjour Print Services from Apple official site
3. Restart PC after installation

### Device Detection

1. Launch DigiCode Finder
2. DigiCode devices on the same network are auto-listed
3. Detected devices show:
   - Device name
   - IP address
   - Firmware version

### Copy IP Address

1. Click "Select" button for target device
2. IP address is copied to clipboard
3. Paste when selecting "WiFi OTA" in DigiCode (browser)

### Multiple Device Selection

You can select multiple devices at once:
1. Check multiple devices
2. Click "Select" button
3. Multiple IP addresses are copied in JSON format

---

## Step 3: WiFi OTA Program Upload

### Single Device Upload

1. Create program in DigiCode (browser)
2. Click "**Upload**" button
3. Select "**WiFi OTA**"
4. Device selection dialog appears
5. If copied from DigiCode Finder, it's auto-displayed
6. Select device and click "Start Upload"
7. Wait for progress bar to complete

### Batch Upload to Multiple Devices

For updating multiple devices like in a classroom:

1. Select multiple devices in DigiCode Finder and copy
2. Select "Upload" → "WiFi OTA" in DigiCode (browser)
3. Multiple devices are shown in device selection dialog
4. Check targets (or select all)
5. Click "Start Batch Upload"
6. Progress is shown for each device

---

## Step 4: Verify Operation

After upload, ESP32 automatically restarts and runs the program.

### Verification Methods

1. **Check operation**: Verify program is running
2. **Serial monitor**: Check serial output when USB connected
3. **DigiCode Finder**: Device redetected means normal

---

## Device Name Settings

Device names are important for managing multiple devices.

### How to Change Device Name

1. Open "WiFi Settings" via USB
2. Enter new name in "Device Name" field
3. Click "Save"

### Recommended Naming Convention

```
DigiCode-[purpose]-[number]

Examples:
- DigiCode-robot-001
- DigiCode-sensor-lab-a
- DigiCode-class-02
```

---

## Troubleshooting

### Device Not Detected

| Cause | Solution |
|-------|----------|
| WiFi not connected | Check WiFi settings via USB |
| Different network | Verify PC and ESP32 on same WiFi |
| Bonjour not installed (Windows) | Install Bonjour Print Services |
| Firewall | Allow mDNS (port 5353) |

### Upload Stops Midway

| Cause | Solution |
|-------|----------|
| Weak WiFi signal | Move ESP32 closer to router |
| Network congestion | Pause other large transfers |
| Timeout | Restart ESP32 and retry |

### Device Unresponsive After Upload

| Cause | Solution |
|-------|----------|
| Program error | Re-upload firmware via USB |
| WiFi settings lost | Redo WiFi settings via USB |

---

## Reset WiFi Settings

To reset WiFi settings:

1. Open "Firmware Upload"
2. Execute "Erase entire Flash (debug)"
3. Re-upload firmware
4. Redo WiFi settings

---

## Security Notes

- Only use on trusted network environments
- Not recommended on public WiFi
- Consider VPN or isolated network for production

---

## Related Documents

| Document | Content |
|----------|---------|
| [Getting Started](./getting-started.md) | Initial setup |
| [Common Steps](./01-program-setup-common.md) | Terminology, common procedures |
| [ESP32 Upload Guide](./04-program-setup-esp32.md) | ESP32 specific settings |
| [Troubleshooting](./troubleshooting.md) | Problem solving guide |
