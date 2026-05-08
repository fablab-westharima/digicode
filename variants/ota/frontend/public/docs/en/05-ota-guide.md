# OTA Setup Guide (Optional)

**Last updated:** 2026-05-08

> ⚠️ **BLE / WiFi OTA are beta features.** Basic flashing and updates are verified, but disconnects / retries can occur in edge cases. For mission-critical setups we recommend USB flashing.

> **This guide is optional.** DigiCode works **with just a USB cable**. Get comfortable with the USB workflow in [Getting Started](./getting-started.md) first, then refer to this guide when needed.

---

## 🚀 4 Steps to Working OTA

The big picture for enabling WiFi OTA. ~10 min one-time setup.

1. **Firmware upload** (via USB, ~1 min) → [details](#step-1-upload-firmware)
2. **WiFi setup** (via USB, enter SSID + password, ~1 min) → [details](#step-2-connect-esp32-to-wifi)
3. **Device discovery** (Mac / Linux native mDNS / Windows needs Bonjour or DigiCode Finder) → [details](#step-3-discover-the-device)
4. **Upload via WiFi OTA** (~15 sec, no cable thereafter) → [details](#step-4-upload-via-wifi-ota)

> 💡 **No WiFi available / WiFi setup is too much** → **[BLE Upload](#ble-upload-optional)** is recommended (FW upload once, no WiFi setup needed).

---

## ⚠️ Note for Windows Users

WiFi OTA is **advanced** on Windows — it requires installing Bonjour and configuring network / Firewall. For Windows beginners we recommend:

- **USB upload** (guided by DigiCode's built-in GUI, no extra install)
- **Bluetooth (BLE) OTA** (no USB cable, no extra install, beginner-friendly)

Mac / Linux users can try WiFi OTA more smoothly.

---

## What is WiFi OTA — Pros and Cons

WiFi OTA (Over-The-Air) lets you upload programs wirelessly via WiFi. Once set up, you can update programs without a USB cable.

| Aspect | Verdict |
|---|---|
| ✅ Cable-free | No need to plug/unplug USB every time |
| ✅ Fastest (~15 sec) | Faster than USB (~30 sec) |
| ✅ Bulk update | Effective for classroom-wide updates |
| ✅ Cased devices OK | Update finished products |
| ❌ Initial setup needed | FW upload + WiFi config (~10 min) |
| ❌ Requires WiFi | PC and ESP32 must be on the same LAN |
| ❌ Requires Bonjour / mDNS | Extra install on Windows |
| ❌ Analog pin restriction | ADC2 (GPIO 0/2/4/12-15/25-27) unavailable while WiFi is active; only ADC1 (GPIO 32-39) usable |
| ❌ Recovery requires USB | Re-do WiFi setup via USB if WiFi config is lost |

> **Intermediate+ recommended**: WiFi OTA issues can require firmware re-flashing via USB to recover.

> ⚠️ **Analog pin restriction (ESP32) when using WiFi OTA**
>
> ESP32's ADC2 cannot be used while WiFi is active. When using WiFi OTA, restrict analog inputs (potentiometer / light sensor / distance sensor / etc.) to **ADC1 (GPIO 32-39)**.
>
> - ✅ **Available (ADC1)**: GPIO 32, 33, 34, 35, 36, 39
> - ❌ **Unavailable (ADC2)**: GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27
> - Reference: Espressif official [ADC Limitations](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/adc.html)
>
> ADC2 is fully usable when flashing via USB. If your project needs more analog inputs than ADC1's 6 pins can provide, consider USB flashing instead.

---

## Prerequisites

1. **ESP32 board** (WiFi OTA capable, `supportsOta: true`)
2. **WiFi router** (a network the ESP32 can connect to, same LAN as the PC)
3. **Device discovery tool** (depends on environment, see below)

---

## Step 1: Upload Firmware

To use WiFi OTA / BLE, you need to upload **firmware** (OTA receiver) once via USB.

1. Connect ESP32 to PC via USB cable
2. Click **"Firmware Upload"** in the left menu
3. Click **"INSTALL"**
4. Select serial port
5. Wait for completion (~1 min)

> 💡 Once uploaded, firmware normally does not need to be re-flashed. Re-flashing is required after a full flash erase.

---

## Step 2: Connect ESP32 to WiFi

1. Connect ESP32 via USB (same connection as firmware upload)
2. Click **"WiFi Setup"** in the left menu
3. Select serial port and click **"Connect"**
4. In the WiFi setup dialog, enter:
   - **SSID**: Your WiFi network name
   - **Password**: Your WiFi password
5. Click **"Connection Test"**
6. After success, the fixed IP address is shown

> ⚠️ If the connection test fails, settings are not saved. Verify your SSID and password.

---

## Step 3: Discover the Device

Mechanism for the PC to obtain the ESP32 IP address. The required mechanism depends on the OS.

### Mac / Linux

Native mDNS support, **no extra install needed**. DigiCode's WiFi OTA dialog auto-discovers devices.

### Windows (2 options)

#### A. Install Bonjour (recommended)

Windows lacks built-in mDNS, so install Apple's Bonjour Print Services:

1. Download `BonjourPSSetup.exe` from https://support.apple.com/en-us/106380
2. Install → reboot PC
3. DigiCode's standard mDNS discovery now works

#### B. DigiCode Finder (when Bonjour install isn't possible / restricted environment)

[DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder/releases) is a desktop app that serves as an mDNS alternative for Windows without Bonjour.

| OS | Download file |
|---|---|
| Windows | `.exe` |
| (Mac / Linux versions exist but native mDNS is sufficient) | `.dmg` / `.AppImage` |

**Usage**:
1. Launch DigiCode Finder
2. DigiCode devices on the same network are auto-discovered
3. Device name, IP address, and firmware version are shown
4. Click **"Select"** next to the target device → IP address is copied to clipboard
5. For multiple devices, check them and click **"Select"** → JSON with multiple IPs is copied

---

## Step 4: Upload via WiFi OTA

### Single Device

1. Build your program in the block editor
2. **"Upload"** → **"WiFi OTA"**
3. In the device selection dialog:
   - mDNS auto-discovery works → pick from the list
   - Otherwise → enter the IP address (paste the value copied from DigiCode Finder)
4. Click **"Start Upload"** (~15 sec)

### Bulk Upload to Multiple Devices

1. Select multiple devices in DigiCode Finder and copy as JSON
2. **"Upload"** → **"WiFi OTA"**
3. Multiple devices appear in the dialog
4. Check the targets and click **"Start Bulk Upload"**

Useful for one-shot classroom-wide updates.

---

## BLE Upload (Optional)

Upload via Bluetooth Low Energy. Useful for locations without WiFi, cased devices, and as an alternative for Windows beginners.

### BLE Pros and Cons

| Aspect | Verdict |
|---|---|
| ✅ No WiFi needed | No router or WiFi setup required |
| ✅ Cable-free | No USB connection each time |
| ✅ No extra install on Windows | Web Bluetooth is built into Chrome / Edge |
| ✅ Cased devices OK | Update finished products |
| ❌ Slower than WiFi OTA (~40 sec) | Slower than USB / WiFi OTA |
| ❌ FW upload required | First-time USB needed (same as WiFi OTA) |
| ❌ Pairing range limit | Need to be within a few meters |

### Prerequisites

- Firmware uploaded (same as [Step 1](#step-1-upload-firmware))
- Web Bluetooth-capable browser (Chrome / Edge)
- Supported boards: BLE-capable ESP32 (`supportsBle: true`)

### Steps

1. Build your program in the block editor
2. **"Upload"** → **"BLE"**
3. Click **"Scan for devices"**
4. Select **"DigiCode-XXXXXX"** in the browser Bluetooth dialog
5. Click **"Pair"**
6. Upload starts (~40 sec)

### BLE Troubleshooting

| Symptom | Fix |
|---|---|
| Device not found | Restart ESP32, restart browser |
| Pairing fails | Move closer, disconnect other BLE devices |
| Upload stops midway | Restart ESP32 and retry |

---

## Details and Operations

### Device Name Setup

Useful when managing multiple devices.

1. Open **"WiFi Setup"** via USB
2. Enter new name in the **"Device Name"** field
3. Click **"Save"**

**Recommended naming:**
```
DigiCode-[purpose]-[number]
Examples: DigiCode-robot-001, DigiCode-class-02
```

### Reset WiFi Settings

To reset the WiFi configuration:

1. Open **"Firmware Upload"**
2. Run **"Erase entire flash (debug)"**
3. Re-flash firmware
4. Redo WiFi setup

### Security Notes

- Use only on trusted networks
- Not recommended on public WiFi
- Consider VPN or isolated networks for production environments

---

## Troubleshooting

### Device Not Detected

| Cause | Fix |
|---|---|
| WiFi not connected | Check WiFi setup via USB |
| Different network | Verify PC and ESP32 are on the same WiFi |
| Bonjour not installed (Windows) | Install Bonjour Print Services or use DigiCode Finder |
| Firewall | Allow mDNS (port 5353) |

### Upload Stops Midway

| Cause | Fix |
|---|---|
| Weak WiFi signal | Move ESP32 closer to router |
| Network congestion | Pause other large transfers |
| Timeout | Restart ESP32 and retry |

### Device Unresponsive After Upload

| Cause | Fix |
|---|---|
| Program error | Re-flash firmware via USB |
| WiFi settings lost | Redo WiFi setup via USB |

For more, see [Troubleshooting](./troubleshooting.md).

---

## Related Documents

- [Getting Started](./getting-started.md) — Basic USB workflow
- [Common Steps](./01-program-setup-common.md) — Terminology, upload method overview
- [ESP32 Upload Guide](./04-program-setup-esp32.md) — ESP32-specific settings
- [Troubleshooting](./troubleshooting.md) — Problem solving guide
- [DigiCode Finder GitHub](https://github.com/fablab-westharima/DigiCode-Finder) — mDNS alternative for Windows
