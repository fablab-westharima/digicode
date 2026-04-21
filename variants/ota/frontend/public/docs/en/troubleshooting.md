# Troubleshooting

**Last Updated:** 2026-04-21

Common problems and solutions for DigiCode.

---

## Program Upload Issues

### ESP32 Not Recognized

**Symptom:** ESP32 not shown in the serial port selection dialog

**Solutions:**

1. Verify the USB cable is **data-capable** (charging-only cables won't work)
2. Install the ESP32 USB driver
   - **CP2102**: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   - **CH340**: http://www.wch.cn/downloads/CH341SER_ZIP.html
3. Try a different USB port
4. Power cycle the ESP32 (unplug and replug the USB cable)
5. Switch browser to Chrome / Edge (Web Serial API required)

### Upload Error Occurs

**Symptom:** An error like "Failed to connect" is displayed

**Solutions:**

1. Hold the ESP32's **BOOT button** while starting the upload
2. Keep the BOOT button held during the upload
3. Check that no other app is using the port (e.g., serial monitor)
4. Restart the browser and retry

### Compile Quota Exhausted

**Symptom:** "Monthly compile limit reached" message is displayed

**Solutions:**

1. Wait until the next month
2. Upgrade to a higher plan (Lite / Pro / Enterprise)
3. Use the [Local Compile Server](./local-compile-server.md) — does not consume cloud quota

---

## WiFi OTA Issues

### Device Not Found via WiFi OTA

**Symptom:** Device not detected in DigiCode Finder

**Solutions:**

1. Confirm the ESP32 and PC are on the **same WiFi network**
2. Confirm **Bonjour Print Services** (Windows only) is installed
3. Check that the firewall is not blocking mDNS (port 5353)
4. Check the serial monitor for successful WiFi connection and IP address
5. Restart the ESP32 (RESET button)

### OTA Update Stops Midway

**Symptom:** Update stalls at around 20%

**Solutions:**

1. Weak WiFi signal may be the cause → move the ESP32 closer to the router
2. Restart the ESP32 and retry
3. Re-flash the firmware via USB, then retry WiFi OTA

### Device Unresponsive After WiFi OTA Upload

**Symptom:** Upload succeeded, but program does not run

**Solutions:**

1. Re-flash the firmware via USB
2. "Erase full flash (debug)" → Firmware Upload → WiFi configuration

---

## BLE Issues

### BLE Device Not Found

**Symptom:** No device appears when pressing the "Search Devices" button

**Solutions:**

1. **Browser support** — Confirm you are using Chrome / Edge (Web Bluetooth required)
2. **Board support** — ESP32-S2 does not support BLE; RP2040 Pico W also does not support BLE
3. Restart the ESP32
4. Restart the browser

### BLE Pairing Fails

**Symptom:** Device is found but pairing fails

**Solutions:**

1. Place the ESP32 close to the computer
2. Temporarily disconnect other BLE devices (mouse, keyboard, etc.)
3. Restart the ESP32 and retry

### Old Device Name Shown on macOS

**Symptom:** After changing the device name, the old name still appears in the macOS browser

**Solution:** This is an OS-level issue caused by macOS BLE cache and cannot be fixed on the DigiCode side. Works correctly on Windows; Mac users may be affected.

---

## Program Operation Issues

### Program Doesn't Run

**Symptom:** Upload succeeds, but the program does not run

**Solutions:**

1. Press the RESET button on the ESP32 to restart
2. Check for error messages in the serial monitor
3. Verify pin numbers are correct (available pins vary by board)
4. Re-check sensor / motor wiring

### LED Doesn't Blink

**Symptom:** Uploaded an LED blink program, but the LED doesn't blink

**Solutions:**

1. **For GPIO2 (built-in LED)**:
   - Some boards have no built-in LED
   - Try connecting an external LED
2. **For external LED**:
   - Check polarity (+/−)
   - Connect a resistor (330Ω–1kΩ) in series
   - Verify pin number

---

## Class Feature Issues

### Cannot Join Class via Invitation URL

**Symptom:** Opening the Invitation URL does not join the class

**Solutions:**

1. Confirm you are logged in to DigiCode (if not, log in and open the URL again)
2. Check if the Invitation URL has expired (ask the teacher)
3. Check if another account has already used this Invitation URL

### Assignments Not Displayed

**Symptom:** Joined the class but assignments are not shown

**Solutions:**

1. Reload the page
2. Check the status of the class server (`class.digital-fab.jp`)
3. Ask the teacher whether the assignment has been distributed

### Cannot Submit Answer

**Symptom:** Error when pressing the submit button

**Solutions:**

1. Check your network connection
2. The class server may be temporarily down → wait and retry
3. Check if the Blockly XML is unusually large (normally not an issue)

---

## Plans & Billing Issues

### Cannot Change Plan

**Symptom:** Stripe Customer Portal does not open, or an error occurs

**Solutions:**

1. Check that a pop-up blocker is not active
2. Check that browser cookies are enabled
3. Check Stripe's server status

### Subscribed to a Plan While on an Invited Account

**Symptom:** Had Enterprise-level permissions from Fablab Nishiharima but subscribed to Pro independently

**Solution:** When you subscribe independently, the invited permissions are **removed**. Your own subscription plan will apply thereafter. Review the confirmation dialog carefully before subscribing.

---

## Browser Issues

### Blockly Editor Not Displayed

**Symptom:** Editor page is blank or blocks are not shown

**Solutions:**

1. Clear the browser cache
2. Update the browser to the latest version
3. Try a different browser (Chrome, Edge)
4. Confirm JavaScript is enabled

### Compile Error Displayed

**Symptom:** A "Compile Error" dialog appears

**Solutions:**

1. Review the error message
2. Confirm block connections are correct
3. Confirm all required parameters are entered
4. Try a sample project to isolate the problem

---

## Other

### Project Cannot Be Saved

**Symptom:** Error occurs when pressing the save button

**Solutions:**

1. Confirm you are logged in (guests can only save locally)
2. Check your internet connection
3. Confirm browser local storage is enabled
4. Restart the browser

### Sample Project Cannot Be Loaded

**Symptom:** Selecting a sample does not reflect in the editor

**Solutions:**

1. Reload the page
2. Log out and log back in
3. Try a different sample

---

## Support

If none of the above resolves your issue, please report it on [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues) with the following information:

- Browser and version
- OS
- Plan in use
- ESP32 board name
- Upload method (USB / WiFi OTA / BLE)
- Screenshot of the error message
- Steps to reproduce
