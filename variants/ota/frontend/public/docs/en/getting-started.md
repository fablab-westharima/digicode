# Getting Started - DigiCode

**Last updated:** 2025-12-28

DigiCode is a visual development environment for programming robots and IoT devices using ESP32 microcontrollers with block-based coding.

![Setup 4 Steps](/docs/en/images/getting-started-steps.svg)

## Requirements

### Hardware
- **ESP32 Development Board** - See [Recommended Hardware](./recommended-hardware.md)
- USB Cable (Type-C or Micro-USB, depending on board)
- Sensors and motors (as needed for your project)

> **Important:** For stable operation, we recommend purchasing from vendors listed in the [Recommended Hardware](./recommended-hardware.md) guide.

### Software
- Modern web browser (Chrome, Edge recommended)
- Internet connection
- **DigiCode Finder** (Desktop app for WiFi OTA, optional)

## Step 1: Create Account and Login

1. Access DigiCode
2. Click "Register"
3. Enter email and password
4. After registration, you'll be automatically logged in

## Step 2: Upload Firmware to ESP32

To use DigiCode, you first need to upload the dedicated firmware to your ESP32.

1. Click "**Firmware Upload**" in the left menu
2. Connect ESP32 to PC via USB cable
3. Click "INSTALL" button
4. Select the serial port
5. Wait for upload to complete (~1 minute)

> **Note:** Firmware only needs to be uploaded once. You can upload programs as many times as you want afterward.

## Step 3: Your First Program (LED Blink)

### Create the Program

1. The editor screen will appear
2. Select blocks from the toolbox on the left:

#### Setup Block
```
Setup:
  Set pin mode [2] to [OUTPUT]
```

#### Loop Block
```
Loop forever:
  Digital write [2] to [HIGH]
  Wait [1000] milliseconds
  Digital write [2] to [LOW]
  Wait [1000] milliseconds
```

### Upload to ESP32

1. Click the "**Upload**" button
2. Select upload method:

| Method | Use Case | Notes |
|--------|----------|-------|
| **WiFi OTA** | Regular updates (fastest) | Detect with DigiCode Finder |
| **BLE** | Wireless update | Web Bluetooth browser required |
| **USB** | Initial setup, reliable upload | Cable required |

#### WiFi OTA Upload (Recommended)

1. Launch **DigiCode Finder** (desktop app)
2. DigiCode devices on the network are auto-detected
3. Click "Select" to copy IP address
4. Return to DigiCode (browser) and select "WiFi OTA"
5. Paste IP address and start upload

> **Download DigiCode Finder:**
> https://github.com/fablab-westharima/DigiCode-Finder/releases

#### USB Upload

1. Select "USB"
2. Select serial port
3. Wait for upload to complete

### Verify Operation

The ESP32's built-in LED (GPIO2) will blink at 1-second intervals!

## Step 4: Try Sample Projects

1. Click "Samples" in the editor
2. Choose a category:
   - **Basic** - LED blink, serial communication
   - **Sensors** - Ultrasonic, temperature/humidity
   - **Competition** - Line tracer, micromouse
3. Select and load a sample
4. Modify pin numbers as needed
5. Upload and verify operation

## Comparison of Three Upload Methods

| Method | Advantage | Disadvantage |
|--------|-----------|--------------|
| **WiFi OTA** | Fast, no cable needed | Firmware upload required first |
| **BLE** | No cable, works without AP | Slightly slower |
| **USB** | Reliable, works anywhere | Cable required |

**Recommended:** Upload firmware via USB first, then use WiFi OTA for updates

## Next Steps

- [Recommended Hardware](./recommended-hardware.md) - Verified device list
- [Block Reference](./block-reference.md) - How to use all blocks
- [Hardware Setup](./hardware-setup.md) - Sensor and motor wiring
- [OTA Setup Guide](./05-ota-guide.md) - WiFi OTA details
- [Troubleshooting](./troubleshooting.md) - Common problems and solutions
- [Local Compile Server](./local-compile-server.md) - Compile on your own PC (Advanced)

## Support

If you encounter problems, check [Troubleshooting](./troubleshooting.md) or report issues on GitHub.
