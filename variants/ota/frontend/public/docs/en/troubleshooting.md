# Troubleshooting

Common problems and solutions for DigiCode.

## Firmware Upload Issues

### ESP32 Not Recognized

**Symptom:** Nothing shown in serial port list

**Solutions:**
1. Verify USB cable is **data-capable** (charging-only cables won't work)
2. Install ESP32 USB drivers
   - CP2102 driver: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   - CH340 driver: http://www.wch.cn/downloads/CH341SER_ZIP.html
3. Try a different USB port
4. Power cycle ESP32 (unplug and replug USB cable)

### Upload Error Occurs

**Symptom:** Error like "Failed to connect" is displayed

**Solutions:**
1. Hold ESP32's **BOOT button** while starting upload
2. Keep BOOT button held during upload
3. Verify no other apps are using the port (e.g., serial monitor)
4. Restart browser and retry

## Program Operation Issues

### Program Doesn't Run

**Symptom:** Upload succeeds but program doesn't work

**Solutions:**
1. Press ESP32's RESET button to restart
2. Check error messages in serial monitor
3. Verify pin numbers are correct (available pins vary by board)
4. Double-check sensor/motor wiring

### LED Doesn't Blink

**Symptom:** Uploaded LED blink program but LED doesn't blink

**Solutions:**
1. For GPIO2 (built-in LED):
   - Some boards don't have a built-in LED
   - Try with an external LED
2. For external LED:
   - Check polarity (+/-)
   - Connect a resistor (330Ω-1kΩ) in series
   - Verify pin number

## WiFi OTA Issues

### WiFi OTA Update Fails

**Symptom:** Device not found in scan, or can't connect

**Solutions:**
1. Verify ESP32 and PC are on the **same WiFi network**
2. Check firewall isn't blocking mDNS (port 5353)
3. Verify WiFi connection success in ESP32 serial monitor
4. Restart ESP32 (RESET button)

### OTA Update Stops Midway

**Symptom:** Update stops around 20%

**Solutions:**
1. WiFi signal may be weak → Move ESP32 closer to router
2. Restart ESP32 then retry
3. Upload via USB first, then try WiFi OTA again

## Browser Issues

### Blockly Editor Doesn't Display

**Symptom:** Editor page is blank or blocks don't appear

**Solutions:**
1. Clear browser cache
2. Update browser to latest version
3. Try a different browser (Chrome, Edge, Safari)
4. Verify JavaScript is enabled

### Compile Error Displayed

**Symptom:** "Compile Error" dialog appears

**Solutions:**
1. Check error message
2. Verify block connections are correct
3. Verify all required parameters are filled in
4. Try a sample project to isolate the problem

## Other Issues

### Can't Save Project

**Symptom:** Error when clicking save button

**Solutions:**
1. Verify you're logged in
2. Check internet connection
3. Verify browser localStorage is enabled
4. Restart browser

### Can't Load Sample Project

**Symptom:** Selected sample doesn't appear in editor

**Solutions:**
1. Reload page
2. Logout and login again
3. Try a different sample

## Support

If the above doesn't solve your issue, please report on GitHub Issues with:

- Browser and version
- ESP32 board name (e.g., ESP32-DevKitC)
- Error message screenshot
- Steps to reproduce

**GitHub Issues:** https://github.com/fablab-westharima/DigiCode/issues
