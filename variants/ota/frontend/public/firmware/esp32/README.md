# MicroPython Firmware Files

## Current Firmware

✅ **MicroPython v1.26.1 (September 11, 2025)**

The latest stable MicroPython firmware is already included in this directory:

```
firmware/esp32/
└── ESP32_GENERIC-20250911-v1.26.1.bin
```

This is a unified firmware image that includes:
- ESP32 bootloader
- Partition table
- MicroPython application

## Flash Address

```
ESP32_GENERIC-20250911-v1.26.1.bin → 0x1000
```

## Supported Boards

- ESP32 (WROOM, WROVER modules)
- ESP32-S2
- ESP32-S3
- ESP32-C3
- Any ESP32-based board with 4MiB+ flash

## File Size

```
ESP32_GENERIC-20250911-v1.26.1.bin: ~1.7MB
```

## Updating Firmware

To update to a newer version:

1. Visit: https://micropython.org/download/ESP32_GENERIC/
2. Download the latest `.bin` file
3. Replace the existing file in this directory
4. Update the filename in `src/services/firmwareService.ts`

## Manual Flash (Optional)

You can also flash this firmware manually using esptool:

```bash
esptool.py --chip esp32 --port /dev/ttyUSB0 erase_flash
esptool.py --chip esp32 --port /dev/ttyUSB0 --baud 460800 write_flash -z 0x1000 ESP32_GENERIC-20250911-v1.26.1.bin
```

## Verification

Verify the file exists:

```bash
ls -lh public/firmware/esp32/
```

You should see:
```
-rw-r--r--  ESP32_GENERIC-20250911-v1.26.1.bin  (~1.7MB)
```
