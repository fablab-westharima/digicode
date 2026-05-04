/**
 * blocks-bootstrap.ts
 *
 * Side-effect imports that register every DigiCode Blockly block + its
 * `javascriptGenerator.forBlock` entry. Mirrors the import list in
 * `src/components/editor/BlocklyEditor.tsx` so the headless code generator
 * sees the same block universe as the browser editor.
 *
 * Must be imported BEFORE any code that calls `javascriptGenerator.workspaceToCode`.
 *
 * NOTE: This module deliberately depends on `jsdom-bootstrap` so the browser
 * globals exist before the block files load (they transitively pull in
 * zustand stores and i18next which need `window` / `localStorage`).
 */

import './jsdom-bootstrap';

import '../../../src/blocks/arduino/core/esp32Blocks';
import '../../../src/blocks/arduino/core/esp32TouchBlocks';
import '../../../src/blocks/arduino/robot/humanoidBlocks';
import '../../../src/blocks/arduino/robot/wheelBlocks';
import '../../../src/blocks/arduino/robot/transformBlocks';
import '../../../src/blocks/sensorBlocks';
import '../../../src/blocks/arduino/audio/audioBlocks';
import '../../../src/blocks/arduino/display/neopixelBlocks';
import '../../../src/blocks/arduino/actuator/servoBlocks';
import '../../../src/blocks/arduino/actuator/motorBlocks';
import '../../../src/blocks/arduino/actuator/stepperBlocks';
import '../../../src/blocks/arduino/actuator/relayBlocks';
import '../../../src/blocks/arduino/motor/stepperDriverBlocks';
import '../../../src/blocks/arduino/display/displayBlocks';
import '../../../src/blocks/arduino/sensor/lineSensorBlocks';
import '../../../src/blocks/arduino/sensor/encoderBlocks';
import '../../../src/blocks/arduino/sensor/wallSensorBlocks';
import '../../../src/blocks/arduino/robot/pidBlocks';
import '../../../src/blocks/arduino/sensor/qtrSensorBlocks';
import '../../../src/blocks/arduino/robot/differentialDriveBlocks';
import '../../../src/blocks/arduino/data/arrayBlocks';
import '../../../src/blocks/arduino/sensor/digitalSensorBlocks';
import '../../../src/blocks/arduino/sensor/analogSensorBlocks';
import '../../../src/blocks/arduino/sensor/sensorCurrentBlocks';
import '../../../src/blocks/arduino/sensor/hx711Blocks';
import '../../../src/blocks/arduino/sensor/piezoBlocks';
import '../../../src/blocks/arduino/sensor/microphoneBlocks';
import '../../../src/blocks/arduino/sensor/flowMeterBlocks';
import '../../../src/blocks/arduino/sensor/apds9960Blocks';
import '../../../src/blocks/arduino/sensor/gpsBlocks';
import '../../../src/blocks/arduino/communication/mqttBlocks';
import '../../../src/blocks/arduino/communication/arduinoHABlocks';
import '../../../src/blocks/arduino/communication/httpBlocks';
import '../../../src/blocks/arduino/communication/jsonBlocks';
import '../../../src/blocks/arduino/communication/otaBlocks';
import '../../../src/blocks/arduino/communication/wifiBlocks';
import '../../../src/blocks/arduino/communication/i2cSpiBlocks';
import '../../../src/blocks/arduino/communication/bleBlocks';
import '../../../src/blocks/arduino/communication/webSocketBlocks';
import '../../../src/blocks/arduino/communication/uart2Blocks';
import '../../../src/blocks/arduino/communication/irBlocks';
import '../../../src/blocks/arduino/communication/rfidBlocks';
import '../../../src/blocks/arduino/communication/canBlocks';
import '../../../src/blocks/arduino/communication/azureIotBlocks';
import '../../../src/blocks/arduino/communication/iotCloudBlocks';
import '../../../src/blocks/arduino/communication/espnowBlocks';
import '../../../src/blocks/arduino/communication/googleServicesBlocks';
import '../../../src/blocks/arduino/communication/notificationBlocks';
import '../../../src/blocks/arduino/communication/loraBlocks';
import '../../../src/blocks/arduino/communication/modbusBlocks';
import '../../../src/blocks/arduino/camera/cameraBlocks';
import '../../../src/blocks/arduino/audio/dfplayerBlocks';
import '../../../src/blocks/arduino/display/tftBlocks';
import '../../../src/blocks/arduino/core/interruptBlocks';
import '../../../src/blocks/arduino/storage/storageNvsBlocks';
import '../../../src/blocks/arduino/storage/storageFsBlocks';
import '../../../src/blocks/arduino/storage/timeBlocks';
import '../../../src/blocks/arduino/sensor/sensorMotionBlocks';
import '../../../src/blocks/arduino/sensor/sensorEnvironmentBlocks';
import '../../../src/blocks/arduino/sensor/sensorAirQualityBlocks';
import '../../../src/blocks/arduino/sensor/sensorHealthBlocks';
import '../../../src/blocks/arduino/sensor/sensorTofBlocks';
import '../../../src/blocks/arduino/sensor/sensorMagEncoderBlocks';
import '../../../src/blocks/arduino/display/lcdBlocks';
import '../../../src/blocks/arduino/display/oledSsd1306Blocks';
import '../../../src/blocks/arduino/display/tm1637Blocks';
import '../../../src/blocks/arduino/display/max7219Blocks';
import '../../../src/blocks/arduino/display/epaperBlocks';
import '../../../src/blocks/arduino/display/neomatrixBlocks';
import '../../../src/blocks/arduino/m5stack/m5stackBlocks';
import '../../../src/blocks/common/builtinBlockOverrides';
