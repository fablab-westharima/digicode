# DigiCode Documentation

**Last updated:** 2025-12-28

DigiCode is a visual development environment for programming robots and IoT devices using ESP32 microcontrollers with block-based coding.

---

## Overview

![Overview Flow](/docs/en/images/flow-overview.svg)

| Step | Description | Frequency |
|------|-------------|-----------|
| **1. Preparation** | Get ESP32 board and USB cable | Once |
| **2. Firmware Upload** | Upload DigiCode base firmware via USB | Initial only |
| **3. Connection Setup** | Configure WiFi or BLE settings | Initial or when changed |
| **4. Program Upload** | Upload your block program | Anytime |

---

## Three Upload Methods

DigiCode supports three methods for uploading programs to ESP32.

![Three Upload Methods](/docs/en/images/upload-methods.svg)

### Comparison Table

| Method | Speed | Cable | Requirements | Best For |
|--------|-------|-------|--------------|----------|
| **WiFi OTA** | Fastest | Not needed | WiFi router, DigiCode Finder | Regular development, batch updates |
| **BLE** | Medium | Not needed | Web Bluetooth browser | No-WiFi environments, enclosed devices |
| **USB** | Fast | Required | USB cable, drivers | Initial setup, troubleshooting |

> **For beginners:** Upload firmware via USB first, then use WiFi OTA for subsequent updates.

---

## Quick Start Guide

### Initial Setup (15 minutes)

![Initial Setup](/docs/en/images/quickstart-initial.svg)

1. **USB Connection** - Connect ESP32 to PC via USB
2. **Firmware Upload** - Menu "Firmware Upload" → "INSTALL"
3. **WiFi Setup** - Enter SSID and password in "WiFi Settings"
4. **DigiCode Finder** - Detect device with the desktop app

→ Details: [Getting Started](./getting-started.md)

---

### After Initial Setup (1 minute)

![Repeat Upload](/docs/en/images/quickstart-repeat.svg)

1. Create a program in the block editor
2. Click "Upload" → Select "WiFi OTA"
3. Select device and start upload

---

## Supported Microcontrollers

### ESP32 Series (WiFi OTA / BLE / USB)

| Board | WiFi OTA | BLE | USB | Notes |
|-------|:--------:|:---:|:---:|-------|
| ESP32 | ○ | ○ | ○ | Recommended |
| ESP32-S3 | ○ | ○ | ○ | High performance |
| ESP32-C3 | ○ | ○ | ○ | Low power |
| ESP32-S2 | ○ | - | ○ | No BLE |

→ Details: [ESP32 Upload Guide](./04-program-setup-esp32.md)

---

## Required Software

| Software | Purpose | Required |
|----------|---------|----------|
| **Web Browser** (Chrome/Edge) | DigiCode app | Yes |
| **DigiCode Finder** | WiFi device detection | For WiFi OTA |
| **USB Drivers** | Serial communication | For USB |

### Download DigiCode Finder

A desktop app is required for WiFi OTA device detection.

**Download:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| OS | File |
|----|------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

→ Details: [OTA Setup Guide](./05-ota-guide.md)

---

## Documentation List

### Getting Started

| Document | Content |
|----------|---------|
| [Getting Started](./getting-started.md) | Initial setup, first program |
| [Recommended Hardware](./recommended-hardware.md) | Verified device list |

### Upload Guides

| Document | Content |
|----------|---------|
| [Common Steps](./01-program-setup-common.md) | Terminology, common procedures |
| [ESP32](./04-program-setup-esp32.md) | All ESP32 (WiFi OTA/BLE/USB) |
| [OTA Setup](./05-ota-guide.md) | WiFi OTA detailed setup |

### Reference

| Document | Content |
|----------|---------|
| [Block Reference](./block-reference.md) | How to use all blocks |
| [Hardware Setup](./hardware-setup.md) | Sensor and motor wiring |
| [Troubleshooting](./troubleshooting.md) | Common problems and solutions |
| [FAQ](./faq.md) | Frequently asked questions |

### Advanced

| Document | Content |
|----------|---------|
| [Architecture](./architecture.md) | System design and tech stack |
| [Local Compile Server](./local-compile-server.md) | Compile on your own PC |

---

## Support

If you encounter problems:

1. [Troubleshooting](./troubleshooting.md)
2. [FAQ](./faq.md)
3. [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues)
