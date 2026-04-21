# DigiCode Documentation

**Last updated:** 2026-04-21

DigiCode is a visual programming environment that makes it easy to program ESP32-based robots and IoT devices using blocks.

---

## Getting Started

DigiCode works **with just a USB cable**. No special setup required.

| Step | Content | Frequency |
|------|---------|-----------|
| **1. Prepare** | Get ESP32 board, USB cable, and USB driver | First time only |
| **2. Create Program** | Build your program in the block editor | Every time |
| **3. USB Upload** | Connect USB cable and upload | Every time |

Repeat the same steps from here. WiFi OTA / BLE are additional options for cable-free uploading.

→ Details: [Getting Started](./getting-started.md)

---

## WiFi OTA / BLE (Optional)

Set up when you want to update programs without a cable. Requires writing **firmware** (OTA base software) via USB just once.

> **What is firmware?** The program required for WiFi OTA / BLE. It contains the minimal base instructions that directly control and drive the hardware. **Not required if you only use USB upload.**

| Method | Features | Best for |
|--------|----------|---------|
| **WiFi OTA** | Fastest · no cable | Multiple device updates, regular development (intermediate+) |
| **BLE** | No cable · no WiFi needed | Updating cased devices |

→ Details: [OTA Setup Guide](./05-ota-guide.md)

---

## Supported Boards

DigiCode is an **ESP32-only** block editor.

### Generic ESP32

| Board | WiFi OTA | BLE | Notes |
|-------|:--------:|:---:|-------|
| ESP32 | ○ | ○ | Most common |
| ESP32-S3 | ○ | ○ | High performance |
| ESP32-C3 | ○ | ○ | Low power · RISC-V |
| ESP32-C6 | ○ | ○ | Matter support |

### M5Stack Series

| Board | WiFi OTA | BLE | Notes |
|-------|:--------:|:---:|-------|
| M5Stack Basic/Gray/Fire | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | Compact |
| ATOM Lite / Matrix | ○ | ○ | Ultra-compact |
| M5Stamp Pico | ○ | ○ | — |
| M5Stamp C3/C3U | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | **DigiCode recommended board (dedicated breakout board in development)** |

### Seeed XIAO Series

| Board | WiFi OTA | BLE | Notes |
|-------|:--------:|:---:|-------|
| XIAO ESP32C3 | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | Camera support |
| XIAO ESP32C6 | ○ | ○ | — |

→ Details: [Recommended Hardware](./recommended-hardware.md)

---

## Required Software

| Software | Purpose | When needed |
|----------|---------|-------------|
| **Web Browser** (Chrome/Edge) | DigiCode app | Required |
| **USB Driver** (CP2102 or CH340) | USB upload | Required |
| **DigiCode Finder** | WiFi device detection | WiFi OTA only |
| **Docker** | Local compile speed-up | Local server only |

### Download DigiCode Finder

Desktop app required for WiFi OTA uploads.

**Download:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| OS | File |
|----|------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

---

## Plans

DigiCode is free to start.

| Plan | Best for | Cloud Compiles | Class Feature |
|------|---------|:--------------:|:-------------:|
| **Free** | Trial / local compile | 50/month | — |
| **Lite** | Individual hobbyist | 250/month | — |
| **Pro** | Developer / Maker | 500/month | — |
| **Enterprise** | Schools / teams | Unlimited | ○ |

> **Guest access:** You can create and upload programs without an account (local file save only).

---

## Class Feature (Enterprise Plan)

Class management for schools and educational institutions.

| Role | Capabilities |
|------|-------------|
| **Teacher** | Create classes, distribute assignments, review submissions |
| **Student** | Join classes, submit work, view submission history |

→ Details: [FAQ (Class Feature)](./faq.md)

---

## Documentation

### Getting Started

| Document | Content |
|----------|---------|
| [Getting Started](./getting-started.md) | Initial setup and first program |
| [Recommended Hardware](./recommended-hardware.md) | Verified device list |

### Upload Guides

| Document | Content |
|----------|---------|
| [Common Steps](./01-program-setup-common.md) | Terminology and upload method overview |
| [ESP32 Series](./04-program-setup-esp32.md) | ESP32 upload details |
| [OTA Setup (Optional)](./05-ota-guide.md) | WiFi OTA / BLE setup |

### Reference

| Document | Content |
|----------|---------|
| [Block Reference](./block-reference.md) | How to use all blocks |
| [Hardware Setup](./hardware-setup.md) | Sensor and motor wiring |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |
| [FAQ](./faq.md) | Frequently asked questions |

### Advanced

| Document | Content |
|----------|---------|
| [Architecture](./architecture.md) | System structure and tech stack |
| [Local Compile Server](./local-compile-server.md) | Compile on your own PC (speed-up) |

---

## Support

If you encounter issues, please refer to:

1. [Troubleshooting](./troubleshooting.md)
2. [FAQ](./faq.md)
3. [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues)
