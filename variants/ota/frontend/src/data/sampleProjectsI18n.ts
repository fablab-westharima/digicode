/**
 * Sample project translations for non-Japanese languages.
 *
 * Structure mirrors tutorialsI18n.ts:
 * - `sampleProjects.ts` holds canonical Japanese text + blocklyXml (fallback).
 * - This file layers id-based overrides per locale.
 * - `useLocalizedSampleProjects()` merges at render time.
 * - Adding a new sample: edit only `sampleProjects.ts`. Translations optional.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { sampleProjects as baseSamples, sampleCategories as baseCategories, type SampleProject } from './sampleProjects';

interface SampleOverride {
  title?: string;
  description?: string;
}
interface CategoryOverride {
  name?: string;
}
interface LocaleOverride {
  categories?: Partial<Record<keyof typeof baseCategories, CategoryOverride>>;
  samples?: Record<string, SampleOverride>;
}

const overrides: Record<string, LocaleOverride> = {
  en: {
    categories: {
      basic: { name: 'Basics' },
      sensor: { name: 'Sensors' },
      motor: { name: 'Motors / LEDs' },
      robots: { name: 'Robots' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'LED Blink',
        description: 'A basic program that blinks an LED every second',
      },
      'serial-hello': {
        title: 'Serial Communication',
        description: 'Print "Hello DigiCode!" to the serial monitor',
      },
      'ultrasonic-distance': {
        title: 'Ultrasonic Distance Sensor',
        description: 'Measure distance with HC-SR04 and print to serial',
      },
      'dht-sensor': {
        title: 'Temperature/Humidity Sensor',
        description: 'Measure temperature and humidity with a DHT sensor',
      },
      'servo-sweep': {
        title: 'Servo Sweep',
        description: 'Sweep a servo motor between 0° and 180°',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel Rainbow',
        description: 'Display rainbow colors on NeoPixel LEDs',
      },
      'wheel-obstacle': {
        title: 'Wheel Robot Obstacle Avoidance',
        description: 'Detect and avoid obstacles with the ultrasonic sensor',
      },
      'transform-ninja': {
        title: 'Transform Robot',
        description: 'Move while switching between Walk/Roll modes',
      },
      'humanoid-dance': {
        title: 'Humanoid Dance',
        description: 'Make the humanoid robot perform various dances',
      },
      'ha-temperature-sensor': {
        title: 'HA Temperature Sensor',
        description: 'Auto-register a temperature sensor with Home Assistant',
      },
      'ha-led-control': {
        title: 'Home Assistant LED Control',
        description: 'Toggle an LED from Home Assistant via MQTT',
      },
      'ha-smart-relay': {
        title: 'HA Smart Relay',
        description: 'Smart relay controllable from Home Assistant',
      },
      'ha-rgb-led': {
        title: 'HA RGB LED',
        description: 'Control an RGB LED color from Home Assistant',
      },
      'ha-multi-sensor': {
        title: 'HA Multi-Sensor Node',
        description: 'Combined temperature/humidity/motion sensor node',
      },
      'temp-alert': {
        title: 'Temperature Alert',
        description: 'Send BLE alert when temperature exceeds 30°C, otherwise turn off LED',
      },
      'proximity-stop': {
        title: 'Proximity Stop',
        description: 'Stop when obstacle within 20cm, otherwise drive forward',
      },
      'ble-uart-receive': {
        title: 'BLE UART Receive',
        description: 'Flash LED for 200ms when BLE message received',
      },
      'ble-uart-command-control': {
        title: 'BLE Command Control',
        description: 'Switch LED HIGH/LOW based on received "ON"/"OFF" command (BLE branching pattern)',
      },
      'ble-beacon-scanner': {
        title: 'BLE Beacon Scanner',
        description: 'Scan nearby BLE devices and log to serial',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT Custom',
        description: 'Periodically notify a custom GATT characteristic',
      },
      'ble-gatt-command-control': {
        title: 'BLE GATT Command Control',
        description: 'Switch LED HIGH/LOW based on GATT Write received "ON"/"OFF" command (GATT branching pattern)',
      },
      'ble-scan-filter-by-name': {
        title: 'BLE Scan Filter by Name',
        description: 'Log address and RSSI to serial when a specific device name is detected during scan (scan-result branching pattern)',
      },
      'humanoid-walk': {
        title: 'Humanoid Walk',
        description: 'Humanoid robot walks back and forth (basic motion)',
      },
      'wheel-line-follow': {
        title: 'Wheel Line Follow',
        description: 'Follow a line forward using light sensors',
      },
      'transform-morph': {
        title: 'Transform Morph',
        description: 'Move while morphing between Walk and Roll modes',
      },
      'http-get-request': {
        title: 'HTTP GET Request',
        description: 'Fetch data from URL via HTTP GET and print to serial',
      },
      'mqtt-direct': {
        title: 'MQTT Direct Publish',
        description: 'Publish DHT temperature directly to MQTT broker (no HA)',
      },
      'ntp-time-sync': {
        title: 'NTP Time Sync',
        description: 'Sync time via NTP and print to serial periodically',
      },
      'sensor-actuator-combo': {
        title: 'Sensor + Actuator Combo',
        description: 'Control servo angle and LED based on temperature',
      },
      'humanoid-gesture': {
        title: 'Humanoid Gestures',
        description: 'Humanoid performs Wave / Happy / Magic gestures in sequence',
      },
      'wheel-remote-control': {
        title: 'Wheel Remote Control',
        description: 'Drive Wheel forward for 1 s on BLE message, then stop',
      },
      'multi-sensor-dashboard': {
        title: 'Multi-Sensor Dashboard',
        description: 'Print temperature, humidity and distance to serial as a dashboard',
      },
      'neopixel-animation': {
        title: 'NeoPixel Fade Animation',
        description: 'Fade NeoPixel brightness from 0 to 255 step by step',
      },
      'nvs-counter': {
        title: 'NVS Boot Counter',
        description: 'Persist boot count in NVS (Preferences) and increment on every boot',
      },
      'interrupt-button': {
        title: 'Button Interrupt',
        description: 'Detect button press via interrupt and log to serial (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'I2C LCD Text Display',
        description: 'Show two lines of text on a 16x2 I2C LCD',
      },
      'dfplayer-music': {
        title: 'DFPlayer Music Playback',
        description: 'Play two tracks in sequence on DFPlayer Mini (10 s each)',
      },
      'wifi-controller-mix': {
        title: 'WiFi Controller Combo (LED + Servo + Temperature)',
        description: 'Bundle LED toggle / servo slider / temperature display on one ESP32 and control them from any browser via the WebSocket controller',
      },
      'wifi-dht22-controller': {
        title: 'WiFi Controller + DHT22 Temperature Broadcast (Web UI + LED + Servo + Temperature)',
        description: 'Control LED toggle and servo slider from any browser via WebSocket + broadcast DHT22 temperature to the Web UI (BUG-085: canonical reference for the user verbatim prompt). ★ MUST: connect websocket_server_received_value to servo_write\'s ANGLE input (no hardcoded literals). ★ MUST: place websocket_server_received_value ONLY inside on_message HANDLER — never at top-level (siblings of arduino_setup / arduino_loop), which emits meaningless `wsServerMessage;` expressions.',
      },
      'ha-multi-control': {
        title: 'HA Multi-entity Control (Switch + Number Slider + Sensor)',
        description: 'Control LED via HA Switch ON/OFF + servo angle via HA Number slider + report DHT22 temperature as an HA sensor (canonical reference for the HA callback cluster, BUG-085)',
      },
      'espnow-peer-control': {
        title: 'ESP-NOW Peer Receive → LED Control (actuator drive)',
        description: 'Receive "LED_ON" / "LED_OFF" messages from another device via ESP-NOW and control the LED (espnow_received_data + controls_if branching pattern, BUG-085)',
      },
      'tm1637-clock': {
        title: 'TM1637 Digital Clock',
        description: 'Display HH:MM time on TM1637 4-digit 7-segment',
      },
      'max7219-scroll-text': {
        title: 'MAX7219 Scrolling Text',
        description: 'Scroll HELLO text on MAX7219 8x8 LED matrix',
      },
      'lora-mesh-sender': {
        title: 'LoRa Long-Range Sender',
        description: 'Send measurements every 5 s via LoRa SX1276 and print received packets',
      },
      'gps-tracker': {
        title: 'GPS Position Tracker',
        description: 'Print GPS lat/lng/altitude/satellites every 10 s with NEO-6M',
      },
      'modbus-temp-monitor': {
        title: 'Modbus Industrial Sensor + Cloud',
        description: 'Read Modbus RTU holding register, publish to iot_cloud (Industrial IoT)',
      },
      'air-quality-dashboard': {
        title: 'Air Quality Dashboard (CO2 + PM2.5 + OLED)',
        description: 'Show SCD30 (CO2) + PMS5003 (PM2.5) on OLED, publish to iot_cloud (Factory IoT)',
      },
      // 第88回 (2026-05-08) AI 参照ファイルメンテ: 51.md/52.md 残カテゴリ 12 sample
      'm5stack-button-lcd': {
        title: 'M5Stack Button + LCD Display',
        description: 'Update LCD on M5Stack Core/Atom/StickC when button A is pressed (m5stack_begin required)',
      },
      'hx711-scale': {
        title: 'HX711 Load Cell Scale',
        description: 'Read weight via HX711 and print to Serial (factory scale, Fab Academy Final Project)',
      },
      'espnow-mesh-receiver': {
        title: 'ESP-NOW Mesh Receiver',
        description: 'Receive ESP-NOW messages from peers and print to Serial (Fab Academy Networking week)',
      },
      'sht40-temp-humidity': {
        title: 'SHT40 Temperature & Humidity',
        description: 'Read temperature and humidity from SHT40 every 5 seconds (M5Stack ENV IV unit compatible)',
      },
      'epaper-status-display': {
        title: 'e-Paper Status Display',
        description: 'Display status text once on e-Paper (Adafruit_EPD) — low power signage',
      },
      'stepper-position-control': {
        title: 'Stepper Position Control (28BYJ-48)',
        description: 'Rotate 90° forward, wait 1 s, rotate back (CNC / automation)',
      },
      'relay-timer-control': {
        title: 'Relay Timer Control',
        description: 'Toggle relay 3 s ON / 5 s OFF in a loop (Factory IoT control)',
      },
      'neomatrix-pixel-display': {
        title: 'NeoMatrix Pixel Display',
        description: 'Show 2 colored pixels diagonally on 8x8 NeoMatrix LED, hold 1 s (NeoPixel 2D matrix)',
      },
      'max30102-pulse-monitor': {
        title: 'MAX30102 Heart Rate / SpO2 Monitor',
        description: 'Print heart rate and SpO2 every 1 s via Serial (educational, NOT medical-grade)',
      },
      'ina219-power-monitor': {
        title: 'INA219 Power Monitor',
        description: 'Print voltage and current every 2 s via Serial (battery / solar power)',
      },
      'apds9960-gesture-control': {
        title: 'APDS9960 Gesture Control',
        description: 'Print detected gesture (UP/DOWN/LEFT/RIGHT) via Serial (HCI input)',
      },
      'pushover-distance-alert': {
        title: 'Pushover Distance Alert',
        description: 'Send Pushover smartphone notification when ultrasonic distance < 10 cm (security / occupancy)',
      },
      'ha-binary-sensor-motion': {
        title: 'HA Binary Sensor (motion)',
        description: 'Auto-register a GPIO 13 motion sensor as a Home Assistant binary_sensor (motion class) and report state',
      },
      'ha-diagnostics-only': {
        title: 'HA Diagnostics Only',
        description: 'Auto-publish WiFi RSSI / Uptime / Free Heap / Reset Reason every 60 s as HA diagnostic entities (no user sensors)',
      },
      'ha-via-device-multi-esp32': {
        title: 'HA Multi-ESP32 (via_device hierarchy, extruder side)',
        description: 'Extruder ESP32 of a clay 3D printer. Setting VIA_DEVICE to the parent device name groups multiple ESP32 modules under one HA device on the Devices page (Takeda decision 3 use case)',
      },
      'ha-ota-firmware-update': {
        title: 'HA OTA Firmware Update',
        description: 'ESP32 self-fetches its .bin and reboots when the user clicks Install in the HA UI. Export the .bin from the DigiCode IDE compile dialog and upload it to the HA add-on local/ folder (Takeda decision 1 use case)',
      },
      'ha-watchdog-resilience': {
        title: 'HA Robust Build (with watchdog)',
        description: 'watchdog_enable auto-restarts on a 60 s loop hang; ha_diagnostics_auto continuously reports RSSI / Uptime / Heap / reset reason to HA. For 24/7 sensors and factory IoT',
      },
      'wifi-led-servo-controller': {
        title: 'WiFi Controller + LED + Servo (2-channel, no temp sensor)',
        description: 'Control LED toggle / Servo slider from any browser via WebSocket server (BUG-086: 2-channel canonical reference). ★ MUST: emit a matching websocket_server_on_message handler for each WRITE=TRUE register (led / servo) with the same CHANNEL_ID. ★ MUST: connect websocket_server_received_value to servo_write\'s ANGLE input (no hardcoded literals).',
      },
    },
  },
  es: {
    categories: {
      basic: { name: 'Básicos' },
      sensor: { name: 'Sensores' },
      motor: { name: 'Motores / LEDs' },
      robots: { name: 'Robots' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'Parpadeo de LED',
        description: 'Programa básico que hace parpadear un LED cada segundo',
      },
      'serial-hello': {
        title: 'Comunicación serie',
        description: 'Imprime "Hello DigiCode!" en el monitor serie',
      },
      'ultrasonic-distance': {
        title: 'Sensor de distancia ultrasonido',
        description: 'Mide la distancia con HC-SR04 y muéstrala por serie',
      },
      'dht-sensor': {
        title: 'Sensor de temperatura/humedad',
        description: 'Mide temperatura y humedad con un sensor DHT',
      },
      'servo-sweep': {
        title: 'Barrido de servo',
        description: 'Barrido de servo entre 0° y 180°',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel arcoíris',
        description: 'Muestra colores del arcoíris en LEDs NeoPixel',
      },
      'wheel-obstacle': {
        title: 'Evitar obstáculos robot Wheel',
        description: 'Detecta y evita obstáculos con el sensor de ultrasonidos',
      },
      'transform-ninja': {
        title: 'Robot Transform',
        description: 'Se mueve alternando entre modos Walk/Roll',
      },
      'humanoid-dance': {
        title: 'Baile robot Humanoid',
        description: 'Hace que el robot humanoide ejecute varios bailes',
      },
      'ha-temperature-sensor': {
        title: 'HA sensor de temperatura',
        description: 'Auto-registrar un sensor de temperatura en Home Assistant',
      },
      'ha-led-control': {
        title: 'Home Assistant control LED',
        description: 'Enciende/apaga un LED desde Home Assistant por MQTT',
      },
      'ha-smart-relay': {
        title: 'HA relé inteligente',
        description: 'Relé inteligente controlable desde Home Assistant',
      },
      'ha-rgb-led': {
        title: 'HA LED RGB',
        description: 'Controla el color de un LED RGB desde Home Assistant',
      },
      'ha-multi-sensor': {
        title: 'HA nodo multi-sensor',
        description: 'Nodo sensor combinado de temperatura/humedad/movimiento',
      },
      'temp-alert': {
        title: 'Alerta de temperatura',
        description: 'Envía alerta BLE cuando la temperatura supera 30°C, si no apaga el LED',
      },
      'proximity-stop': {
        title: 'Parada por proximidad',
        description: 'Para cuando hay obstáculo a menos de 20cm, si no avanza',
      },
      'ble-uart-receive': {
        title: 'Recepción BLE UART',
        description: 'Parpadea el LED 200ms al recibir un mensaje BLE',
      },
      'ble-uart-command-control': {
        title: 'Control por comando BLE',
        description: 'Enciende/apaga el LED según el comando "ON"/"OFF" recibido por BLE (patrón de bifurcación BLE)',
      },
      'ble-beacon-scanner': {
        title: 'Escáner de beacons BLE',
        description: 'Escanea dispositivos BLE cercanos y muestra por serie',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT personalizado',
        description: 'Notifica periódicamente una característica GATT personalizada',
      },
      'ble-gatt-command-control': {
        title: 'Control por comando GATT BLE',
        description: 'Enciende/apaga el LED según el comando "ON"/"OFF" recibido por GATT Write (patrón de bifurcación GATT)',
      },
      'ble-scan-filter-by-name': {
        title: 'Filtro de escaneo BLE por nombre',
        description: 'Registra address y RSSI por serie al detectar un nombre específico durante el escaneo (patrón de bifurcación por resultado de escaneo)',
      },
      'humanoid-walk': {
        title: 'Caminata Humanoid',
        description: 'El robot humanoide camina hacia adelante y atrás',
      },
      'wheel-line-follow': {
        title: 'Seguimiento de línea Wheel',
        description: 'Sigue una línea hacia adelante con sensores de luz',
      },
      'transform-morph': {
        title: 'Transformación Transform',
        description: 'Se mueve cambiando entre modos Walk y Roll',
      },
      'http-get-request': {
        title: 'Petición HTTP GET',
        description: 'Obtiene datos de una URL por HTTP GET y los imprime',
      },
      'mqtt-direct': {
        title: 'MQTT publicación directa',
        description: 'Publica la temperatura DHT directamente al broker MQTT',
      },
      'ntp-time-sync': {
        title: 'Sincronización NTP',
        description: 'Sincroniza la hora vía NTP e imprime periódicamente',
      },
      'sensor-actuator-combo': {
        title: 'Combo sensor + actuador',
        description: 'Controla ángulo de servo y LED según temperatura',
      },
      'humanoid-gesture': {
        title: 'Gestos Humanoid',
        description: 'El humanoide realiza los gestos Wave / Happy / Magic en secuencia',
      },
      'wheel-remote-control': {
        title: 'Wheel control remoto',
        description: 'Avanza Wheel 1 s al recibir un mensaje BLE y luego se detiene',
      },
      'multi-sensor-dashboard': {
        title: 'Dashboard multi-sensor',
        description: 'Imprime temperatura, humedad y distancia en serie como un dashboard',
      },
      'neopixel-animation': {
        title: 'Animación de fundido NeoPixel',
        description: 'Aumenta el brillo del NeoPixel de 0 a 255 paso a paso',
      },
      'nvs-counter': {
        title: 'Contador de arranques en NVS',
        description: 'Guarda el contador de arranques en NVS (Preferences) e incrementa en cada arranque',
      },
      'interrupt-button': {
        title: 'Botón con interrupción',
        description: 'Detecta la pulsación del botón por interrupción y la registra en serie (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'LCD I2C texto',
        description: 'Muestra dos líneas de texto en un LCD I2C de 16x2',
      },
      'dfplayer-music': {
        title: 'Reproducción musical DFPlayer',
        description: 'Reproduce dos pistas en orden con DFPlayer Mini (10 s cada una)',
      },
      'wifi-controller-mix': {
        title: 'Combo controlador WiFi (LED + Servo + Temperatura)',
        description: 'Agrupa toggle LED / slider de servo / display de temperatura en un ESP32 y contrólalos desde cualquier navegador vía el controlador WebSocket',
      },
      'wifi-dht22-controller': {
        title: 'Controlador WiFi + transmisión de temperatura DHT22 (Web UI + LED + Servo + Temperatura)',
        description: 'Controla toggle LED y slider servo desde cualquier navegador vía WebSocket + transmite la temperatura DHT22 al Web UI (BUG-085: referencia canónica para el prompt verbatim del usuario). ★ OBLIGATORIO: conecta websocket_server_received_value a la entrada ANGLE de servo_write (sin hardcoded literals). ★ OBLIGATORIO: coloca websocket_server_received_value SOLO dentro del HANDLER on_message — nunca en top-level (como hermanos de arduino_setup / arduino_loop), lo que emitiría expresiones sin sentido como `wsServerMessage;`.',
      },
      'ha-multi-control': {
        title: 'Control multi-entity HA (Switch + Slider Number + Sensor)',
        description: 'Controla LED vía HA Switch ON/OFF + ángulo de servo vía slider HA Number + reporta temperatura DHT22 como sensor HA (referencia canónica del cluster de callbacks HA, BUG-085)',
      },
      'espnow-peer-control': {
        title: 'Recepción peer ESP-NOW → control LED (drive de actuador)',
        description: 'Recibe mensajes "LED_ON" / "LED_OFF" desde otro dispositivo vía ESP-NOW y controla el LED (patrón espnow_received_data + bifurcación controls_if, BUG-085)',
      },
      'tm1637-clock': {
        title: 'Reloj digital TM1637',
        description: 'Muestra HH:MM en el display de 4 dígitos TM1637',
      },
      'max7219-scroll-text': {
        title: 'Texto desplazante MAX7219',
        description: 'Desplaza el texto HELLO en la matriz LED 8x8 MAX7219',
      },
      'lora-mesh-sender': {
        title: 'Emisor LoRa de largo alcance',
        description: 'Envía mediciones cada 5 s vía LoRa SX1276 e imprime paquetes recibidos',
      },
      'gps-tracker': {
        title: 'Rastreador de posición GPS',
        description: 'Imprime lat/lng/altitud/satélites cada 10 s con GPS NEO-6M',
      },
      'modbus-temp-monitor': {
        title: 'Sensor industrial Modbus + nube',
        description: 'Lee registro Modbus RTU, publica a iot_cloud (IoT industrial)',
      },
      'air-quality-dashboard': {
        title: 'Panel de calidad del aire (CO2 + PM2.5 + OLED)',
        description: 'Muestra SCD30 (CO2) + PMS5003 (PM2.5) en OLED, publica a iot_cloud',
      },
      // Sesión 88 (2026-05-08): 12 muestras restantes de 51.md/52.md
      'm5stack-button-lcd': {
        title: 'M5Stack Botón + Pantalla LCD',
        description: 'Actualiza la LCD en M5Stack Core/Atom/StickC al pulsar el botón A (m5stack_begin obligatorio)',
      },
      'hx711-scale': {
        title: 'Báscula con célula de carga HX711',
        description: 'Lee peso vía HX711 e imprime a Serial (báscula industrial, Final Project de Fab Academy)',
      },
      'espnow-mesh-receiver': {
        title: 'Receptor mesh ESP-NOW',
        description: 'Recibe mensajes ESP-NOW de pares e imprime a Serial (semana Networking de Fab Academy)',
      },
      'sht40-temp-humidity': {
        title: 'Temperatura y humedad SHT40',
        description: 'Lee temperatura y humedad de SHT40 cada 5 s (compatible con unidad ENV IV de M5Stack)',
      },
      'epaper-status-display': {
        title: 'Pantalla de estado e-Paper',
        description: 'Muestra texto de estado una vez en e-Paper (Adafruit_EPD) — señalética de bajo consumo',
      },
      'stepper-position-control': {
        title: 'Control de posición Stepper (28BYJ-48)',
        description: 'Rota 90° hacia adelante, espera 1 s, rota al revés (CNC / automatización)',
      },
      'relay-timer-control': {
        title: 'Control temporizado de relé',
        description: 'Conmuta relé 3 s ON / 5 s OFF en bucle (control IoT industrial)',
      },
      'neomatrix-pixel-display': {
        title: 'Pantalla de píxeles NeoMatrix',
        description: 'Muestra 2 píxeles de color en diagonal en LED NeoMatrix 8x8, mantén 1 s (matriz 2D NeoPixel)',
      },
      'max30102-pulse-monitor': {
        title: 'Monitor de pulso/SpO2 MAX30102',
        description: 'Imprime pulso cardíaco y SpO2 cada 1 s a Serial (educativo, NO grado médico)',
      },
      'ina219-power-monitor': {
        title: 'Monitor de potencia INA219',
        description: 'Imprime tensión y corriente cada 2 s a Serial (batería / energía solar)',
      },
      'apds9960-gesture-control': {
        title: 'Control por gestos APDS9960',
        description: 'Imprime el gesto detectado (UP/DOWN/LEFT/RIGHT) a Serial (entrada HCI)',
      },
      'pushover-distance-alert': {
        title: 'Alerta de distancia Pushover',
        description: 'Envía notificación al smartphone vía Pushover cuando la distancia ultrasónica < 10 cm (seguridad / ocupación)',
      },
      'ha-binary-sensor-motion': {
        title: 'Sensor Binary (movimiento) HA',
        description: 'Registra automáticamente un sensor de movimiento en GPIO 13 como binary_sensor (clase motion) en Home Assistant y reporta el estado',
      },
      'ha-diagnostics-only': {
        title: 'Diagnóstico automático HA',
        description: 'Publica WiFi RSSI / Uptime / Heap libre / Razón de reinicio cada 60 s como entidades de diagnóstico HA (sin sensores de usuario)',
      },
      'ha-via-device-multi-esp32': {
        title: 'HA varios ESP32 (jerarquía via_device, lado extrusor)',
        description: 'ESP32 del extrusor de una impresora 3D de arcilla. Estableciendo VIA_DEVICE con el nombre del dispositivo padre se agrupan varios ESP32 bajo un único dispositivo HA en la página Devices (caso de uso Takeda decisión 3)',
      },
      'ha-ota-firmware-update': {
        title: 'Actualización OTA por HA',
        description: 'El ESP32 obtiene su propio .bin y se reinicia cuando el usuario pulsa Instalar en la UI de HA. Exporta el .bin desde el diálogo de compilación de DigiCode IDE y súbelo a la carpeta local/ del add-on HA (caso de uso Takeda decisión 1)',
      },
      'ha-watchdog-resilience': {
        title: 'Construcción robusta HA (con watchdog)',
        description: 'watchdog_enable reinicia automáticamente tras 60 s de bloqueo del loop; ha_diagnostics_auto reporta continuamente RSSI / Uptime / Heap / motivo de reinicio a HA. Para sensores 24/7 e IoT industrial',
      },
      'wifi-led-servo-controller': {
        title: 'Controlador WiFi + LED + Servo (2 canales, sin sensor de temperatura)',
        description: 'Controla LED toggle / slider de Servo desde un navegador vía servidor WebSocket (BUG-086: referencia canónica de 2 canales). ★ OBLIGATORIO: emitir un handler websocket_server_on_message que coincida para cada register WRITE=TRUE (led / servo) con el mismo CHANNEL_ID. ★ OBLIGATORIO: conectar websocket_server_received_value al input ANGLE de servo_write (sin literales hardcodeados).',
      },
    },
  },
  'pt-PT': {
    categories: {
      basic: { name: 'Básico' },
      sensor: { name: 'Sensores' },
      motor: { name: 'Motores / LEDs' },
      robots: { name: 'Robôs' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'LED a piscar',
        description: 'Programa básico que pisca um LED a cada segundo',
      },
      'serial-hello': {
        title: 'Comunicação série',
        description: 'Imprime "Hello DigiCode!" no monitor série',
      },
      'ultrasonic-distance': {
        title: 'Sensor de distância ultrassónico',
        description: 'Mede a distância com HC-SR04 e imprime na série',
      },
      'dht-sensor': {
        title: 'Sensor de temperatura/humidade',
        description: 'Mede temperatura e humidade com um sensor DHT',
      },
      'servo-sweep': {
        title: 'Varrimento do servo',
        description: 'Servo a varrer entre 0° e 180°',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel arco-íris',
        description: 'Mostra cores do arco-íris em LEDs NeoPixel',
      },
      'wheel-obstacle': {
        title: 'Robot Wheel a evitar obstáculos',
        description: 'Deteta e evita obstáculos com o sensor ultrassónico',
      },
      'transform-ninja': {
        title: 'Robot Transform',
        description: 'Move-se alternando entre modos Walk/Roll',
      },
      'humanoid-dance': {
        title: 'Dança do robot Humanoid',
        description: 'Faz o robot humanoide executar várias danças',
      },
      'ha-temperature-sensor': {
        title: 'HA sensor de temperatura',
        description: 'Auto-registar um sensor de temperatura no Home Assistant',
      },
      'ha-led-control': {
        title: 'Home Assistant controlo de LED',
        description: 'Liga/desliga um LED a partir do Home Assistant por MQTT',
      },
      'ha-smart-relay': {
        title: 'HA relé inteligente',
        description: 'Relé inteligente controlável a partir do Home Assistant',
      },
      'ha-rgb-led': {
        title: 'HA LED RGB',
        description: 'Controla a cor de um LED RGB a partir do Home Assistant',
      },
      'ha-multi-sensor': {
        title: 'HA nó multi-sensor',
        description: 'Nó combinado de temperatura/humidade/movimento',
      },
      'temp-alert': {
        title: 'Alerta de temperatura',
        description: 'Envia alerta BLE quando a temperatura excede 30°C, senão desliga o LED',
      },
      'proximity-stop': {
        title: 'Paragem por proximidade',
        description: 'Para quando há obstáculo a menos de 20cm, senão avança',
      },
      'ble-uart-receive': {
        title: 'Receção BLE UART',
        description: 'Pisca o LED 200ms ao receber uma mensagem BLE',
      },
      'ble-uart-command-control': {
        title: 'Controlo por comando BLE',
        description: 'Liga/desliga o LED conforme o comando "ON"/"OFF" recebido via BLE (padrão de bifurcação BLE)',
      },
      'ble-beacon-scanner': {
        title: 'Scanner de beacons BLE',
        description: 'Faz scan de dispositivos BLE próximos e imprime na série',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT personalizado',
        description: 'Notifica periodicamente uma característica GATT personalizada',
      },
      'ble-gatt-command-control': {
        title: 'Controlo por comando GATT BLE',
        description: 'Liga/desliga o LED conforme o comando "ON"/"OFF" recebido via GATT Write (padrão de bifurcação GATT)',
      },
      'ble-scan-filter-by-name': {
        title: 'Filtro de pesquisa BLE por nome',
        description: 'Regista address e RSSI na série ao detetar um nome específico durante a pesquisa (padrão de bifurcação por resultado de pesquisa)',
      },
      'humanoid-walk': {
        title: 'Caminhada Humanoid',
        description: 'O robot humanoide caminha para frente e para trás',
      },
      'wheel-line-follow': {
        title: 'Seguimento de linha Wheel',
        description: 'Segue uma linha em frente com sensores de luz',
      },
      'transform-morph': {
        title: 'Transformação Transform',
        description: 'Move-se alternando entre modos Walk e Roll',
      },
      'http-get-request': {
        title: 'Pedido HTTP GET',
        description: 'Obtém dados de um URL via HTTP GET e imprime na série',
      },
      'mqtt-direct': {
        title: 'MQTT publicação direta',
        description: 'Publica a temperatura DHT diretamente no broker MQTT',
      },
      'ntp-time-sync': {
        title: 'Sincronização NTP',
        description: 'Sincroniza a hora via NTP e imprime periodicamente',
      },
      'sensor-actuator-combo': {
        title: 'Combo sensor + atuador',
        description: 'Controla o ângulo do servo e o LED conforme a temperatura',
      },
      'humanoid-gesture': {
        title: 'Gestos Humanoid',
        description: 'O humanoide executa os gestos Wave / Happy / Magic em sequência',
      },
      'wheel-remote-control': {
        title: 'Wheel comando remoto',
        description: 'Faz o Wheel avançar 1 s ao receber uma mensagem BLE e depois para',
      },
      'multi-sensor-dashboard': {
        title: 'Dashboard multi-sensor',
        description: 'Imprime temperatura, humidade e distância na série como um dashboard',
      },
      'neopixel-animation': {
        title: 'Animação de fade NeoPixel',
        description: 'Aumenta o brilho do NeoPixel de 0 a 255 passo a passo',
      },
      'nvs-counter': {
        title: 'Contador de arranques em NVS',
        description: 'Guarda o contador de arranques em NVS (Preferences) e incrementa a cada arranque',
      },
      'interrupt-button': {
        title: 'Botão com interrupção',
        description: 'Deteta a pressão do botão por interrupção e regista na série (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'LCD I2C texto',
        description: 'Mostra duas linhas de texto num LCD I2C de 16x2',
      },
      'dfplayer-music': {
        title: 'Reprodução musical DFPlayer',
        description: 'Reproduz duas faixas em sequência no DFPlayer Mini (10 s cada)',
      },
      'wifi-controller-mix': {
        title: 'Combo controlador WiFi (LED + Servo + Temperatura)',
        description: 'Agrupa toggle LED / slider de servo / display de temperatura num ESP32 e controla-os a partir de qualquer browser via o controlador WebSocket',
      },
      'wifi-dht22-controller': {
        title: 'Controlador WiFi + transmissão de temperatura DHT22 (Web UI + LED + Servo + Temperatura)',
        description: 'Controla toggle LED e slider servo a partir de qualquer browser via WebSocket + transmite a temperatura DHT22 para o Web UI (BUG-085: referência canónica para o prompt verbatim do utilizador). ★ OBRIGATÓRIO: liga websocket_server_received_value à entrada ANGLE de servo_write (sem hardcoded literals). ★ OBRIGATÓRIO: coloca websocket_server_received_value APENAS dentro do HANDLER on_message — nunca no top-level (como irmãos de arduino_setup / arduino_loop), o que emitiria expressões sem sentido como `wsServerMessage;`.',
      },
      'ha-multi-control': {
        title: 'Controlo multi-entity HA (Switch + Slider Number + Sensor)',
        description: 'Controla LED via HA Switch ON/OFF + ângulo do servo via slider HA Number + reporta temperatura DHT22 como sensor HA (referência canónica do cluster de callbacks HA, BUG-085)',
      },
      'espnow-peer-control': {
        title: 'Receção peer ESP-NOW → controlo LED (drive de atuador)',
        description: 'Recebe mensagens "LED_ON" / "LED_OFF" de outro dispositivo via ESP-NOW e controla o LED (padrão espnow_received_data + bifurcação controls_if, BUG-085)',
      },
      'tm1637-clock': {
        title: 'Relógio digital TM1637',
        description: 'Mostra HH:MM no display de 4 dígitos TM1637',
      },
      'max7219-scroll-text': {
        title: 'Texto deslizante MAX7219',
        description: 'Desliza o texto HELLO na matriz LED 8x8 MAX7219',
      },
      'lora-mesh-sender': {
        title: 'Emissor LoRa de longo alcance',
        description: 'Envia medições a cada 5 s via LoRa SX1276 e imprime pacotes recebidos',
      },
      'gps-tracker': {
        title: 'Rastreador de posição GPS',
        description: 'Imprime lat/lng/altitude/satélites a cada 10 s com GPS NEO-6M',
      },
      'modbus-temp-monitor': {
        title: 'Sensor industrial Modbus + nuvem',
        description: 'Lê registo Modbus RTU, publica em iot_cloud (IoT industrial)',
      },
      'air-quality-dashboard': {
        title: 'Painel de qualidade do ar (CO2 + PM2.5 + OLED)',
        description: 'Mostra SCD30 (CO2) + PMS5003 (PM2.5) em OLED, publica em iot_cloud',
      },
      // Sessão 88 (2026-05-08): 12 amostras restantes de 51.md/52.md
      'm5stack-button-lcd': {
        title: 'M5Stack Botão + Mostrador LCD',
        description: 'Atualiza o LCD no M5Stack Core/Atom/StickC ao premir o botão A (m5stack_begin obrigatório)',
      },
      'hx711-scale': {
        title: 'Balança com célula de carga HX711',
        description: 'Lê peso via HX711 e imprime no Serial (balança industrial, Final Project Fab Academy)',
      },
      'espnow-mesh-receiver': {
        title: 'Receptor mesh ESP-NOW',
        description: 'Recebe mensagens ESP-NOW de pares e imprime no Serial (semana Networking Fab Academy)',
      },
      'sht40-temp-humidity': {
        title: 'Temperatura e humidade SHT40',
        description: 'Lê temperatura e humidade do SHT40 a cada 5 s (compatível com ENV IV M5Stack)',
      },
      'epaper-status-display': {
        title: 'Visor de estado e-Paper',
        description: 'Mostra texto de estado uma vez no e-Paper (Adafruit_EPD) — sinalética de baixo consumo',
      },
      'stepper-position-control': {
        title: 'Controlo de posição Stepper (28BYJ-48)',
        description: 'Roda 90° para a frente, espera 1 s, roda para trás (CNC / automação)',
      },
      'relay-timer-control': {
        title: 'Controlo temporizado de relé',
        description: 'Alterna relé 3 s ON / 5 s OFF em loop (controlo IoT industrial)',
      },
      'neomatrix-pixel-display': {
        title: 'Visor de pixels NeoMatrix',
        description: 'Mostra 2 pixels coloridos na diagonal em LED NeoMatrix 8x8, mantém 1 s (matriz 2D NeoPixel)',
      },
      'max30102-pulse-monitor': {
        title: 'Monitor pulso/SpO2 MAX30102',
        description: 'Imprime pulso cardíaco e SpO2 a cada 1 s no Serial (educativo, NÃO grau médico)',
      },
      'ina219-power-monitor': {
        title: 'Monitor de potência INA219',
        description: 'Imprime tensão e corrente a cada 2 s no Serial (bateria / energia solar)',
      },
      'apds9960-gesture-control': {
        title: 'Controlo por gestos APDS9960',
        description: 'Imprime o gesto detetado (UP/DOWN/LEFT/RIGHT) no Serial (entrada HCI)',
      },
      'pushover-distance-alert': {
        title: 'Alerta de distância Pushover',
        description: 'Envia notificação ao smartphone via Pushover quando a distância ultrassónica < 10 cm (segurança / ocupação)',
      },
      'ha-binary-sensor-motion': {
        title: 'Sensor Binário (movimento) HA',
        description: 'Regista automaticamente um sensor de movimento no GPIO 13 como binary_sensor (classe motion) em Home Assistant e reporta o estado',
      },
      'ha-diagnostics-only': {
        title: 'Diagnóstico automático HA',
        description: 'Publica WiFi RSSI / Uptime / Heap livre / Motivo de reinício a cada 60 s como entidades de diagnóstico HA (sem sensores do utilizador)',
      },
      'ha-via-device-multi-esp32': {
        title: 'HA múltiplos ESP32 (hierarquia via_device, lado extrusor)',
        description: 'ESP32 do extrusor de uma impressora 3D de argila. Definindo VIA_DEVICE com o nome do dispositivo pai agrupa vários ESP32 sob um único dispositivo HA na página Devices (caso de uso Takeda decisão 3)',
      },
      'ha-ota-firmware-update': {
        title: 'Atualização OTA por HA',
        description: 'O ESP32 obtém o seu próprio .bin e reinicia quando o utilizador clica em Instalar na UI HA. Exporta o .bin a partir do diálogo de compilação do DigiCode IDE e carrega-o para a pasta local/ do add-on HA (caso de uso Takeda decisão 1)',
      },
      'ha-watchdog-resilience': {
        title: 'Implementação robusta HA (com watchdog)',
        description: 'watchdog_enable reinicia automaticamente após 60 s de bloqueio do loop; ha_diagnostics_auto reporta continuamente RSSI / Uptime / Heap / motivo de reinício para HA. Para sensores 24/7 e IoT industrial',
      },
      'wifi-led-servo-controller': {
        title: 'Controlador WiFi + LED + Servo (2 canais, sem sensor de temperatura)',
        description: 'Controla LED toggle / slider de Servo a partir de um browser via servidor WebSocket (BUG-086: referência canónica de 2 canais). ★ OBRIGATÓRIO: emitir um handler websocket_server_on_message correspondente para cada register WRITE=TRUE (led / servo) com o mesmo CHANNEL_ID. ★ OBRIGATÓRIO: ligar websocket_server_received_value ao input ANGLE de servo_write (sem literais hardcoded).',
      },
    },
  },
  'zh-TW': {
    categories: {
      basic: { name: '基礎' },
      sensor: { name: '感測器' },
      motor: { name: '馬達 / LED' },
      robots: { name: '機器人' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'LED 閃爍',
        description: '讓 LED 每秒閃爍一次的基本程式',
      },
      'serial-hello': {
        title: '序列通訊',
        description: '在序列監視器輸出 "Hello DigiCode!"',
      },
      'ultrasonic-distance': {
        title: '超音波距離感測器',
        description: '使用 HC-SR04 測量距離並輸出到序列',
      },
      'dht-sensor': {
        title: '溫濕度感測器',
        description: '使用 DHT 感測器測量溫度與濕度',
      },
      'servo-sweep': {
        title: '伺服掃描',
        description: '讓伺服馬達在 0° 到 180° 之間往返',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel 彩虹',
        description: '在 NeoPixel LED 上顯示彩虹色',
      },
      'wheel-obstacle': {
        title: 'Wheel 機器人避障',
        description: '用超音波感測器偵測並避開障礙物',
      },
      'transform-ninja': {
        title: 'Transform 機器人',
        description: '切換 Walk/Roll 模式移動',
      },
      'humanoid-dance': {
        title: 'Humanoid 舞蹈',
        description: '讓仿人形機器人表演各種舞蹈',
      },
      'ha-temperature-sensor': {
        title: 'HA 溫度感測器',
        description: '在 Home Assistant 自動註冊溫度感測器',
      },
      'ha-led-control': {
        title: 'Home Assistant LED 控制',
        description: '透過 MQTT 從 Home Assistant 切換 LED',
      },
      'ha-smart-relay': {
        title: 'HA 智慧繼電器',
        description: '可從 Home Assistant 控制的智慧繼電器',
      },
      'ha-rgb-led': {
        title: 'HA RGB LED',
        description: '從 Home Assistant 控制 RGB LED 的顏色',
      },
      'ha-multi-sensor': {
        title: 'HA 複合感測節點',
        description: '溫度/濕度/動作的複合感測節點',
      },
      'temp-alert': {
        title: '溫度警報',
        description: '溫度超過 30°C 時透過 BLE 發送警報，否則熄滅 LED',
      },
      'proximity-stop': {
        title: '障礙物停止',
        description: '偵測到 20cm 內的障礙物時停止，否則前進',
      },
      'ble-uart-receive': {
        title: 'BLE UART 接收',
        description: '收到 BLE 訊息時 LED 閃爍 200ms',
      },
      'ble-uart-command-control': {
        title: 'BLE 指令控制',
        description: '依據透過 BLE 接收的 "ON"/"OFF" 指令切換 LED 高/低（BLE 條件分支範例）',
      },
      'ble-beacon-scanner': {
        title: 'BLE 信標掃描',
        description: '掃描附近的 BLE 裝置並輸出到序列',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT 自訂',
        description: '定期通知自訂 GATT 特徵',
      },
      'ble-gatt-command-control': {
        title: 'BLE GATT 指令控制',
        description: '依據透過 GATT Write 接收的 "ON"/"OFF" 指令切換 LED 高/低（GATT 條件分支範例）',
      },
      'ble-scan-filter-by-name': {
        title: 'BLE 掃描名稱篩選',
        description: '掃描期間偵測到特定裝置名稱時，將位址與 RSSI 輸出到序列埠（依掃描結果分支的範例）',
      },
      'humanoid-walk': {
        title: 'Humanoid 行走',
        description: '仿人形機器人前後行走',
      },
      'wheel-line-follow': {
        title: 'Wheel 循跡',
        description: '用光感測器循線前進',
      },
      'transform-morph': {
        title: 'Transform 形態變化',
        description: '在 Walk 與 Roll 模式間切換移動',
      },
      'http-get-request': {
        title: 'HTTP GET 請求',
        description: '透過 HTTP GET 從 URL 取得資料並輸出到序列',
      },
      'mqtt-direct': {
        title: 'MQTT 直接發布',
        description: '將 DHT 溫度直接發布到 MQTT broker (不經 HA)',
      },
      'ntp-time-sync': {
        title: 'NTP 時間同步',
        description: '透過 NTP 同步時間並定期輸出到序列',
      },
      'sensor-actuator-combo': {
        title: '感測器+致動器組合',
        description: '根據溫度控制伺服角度與 LED',
      },
      'humanoid-gesture': {
        title: 'Humanoid 手勢動作',
        description: 'Humanoid 依序執行 Wave / Happy / Magic 等手勢',
      },
      'wheel-remote-control': {
        title: 'Wheel 遠端控制',
        description: '收到 BLE 訊息時 Wheel 前進 1 秒後停止',
      },
      'multi-sensor-dashboard': {
        title: '多感測器儀表板',
        description: '將溫度、濕度、距離以儀表板格式輸出到序列',
      },
      'neopixel-animation': {
        title: 'NeoPixel 漸變動畫',
        description: '將 NeoPixel 亮度從 0 漸進到 255',
      },
      'nvs-counter': {
        title: 'NVS 開機計數器',
        description: '使用 NVS (Preferences) 儲存開機次數，每次開機自動加 1',
      },
      'interrupt-button': {
        title: '按鈕中斷',
        description: '透過中斷偵測按鈕按下並輸出到序列 (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'I2C LCD 文字顯示',
        description: '在 16x2 I2C LCD 顯示兩行文字',
      },
      'dfplayer-music': {
        title: 'DFPlayer 音樂播放',
        description: '使用 DFPlayer Mini 依序播放兩首曲目 (各 10 秒)',
      },
      'wifi-controller-mix': {
        title: 'WiFi 控制器整合 (LED + Servo + 溫度)',
        description: '透過 WebSocket 伺服器在 1 個 ESP32 上整合 LED toggle / Servo slider / 溫度顯示，從任何瀏覽器控制',
      },
      'wifi-dht22-controller': {
        title: 'WiFi 控制器 + DHT22 溫度廣播 (Web UI + LED + Servo + 溫度)',
        description: '透過 WebSocket 從任何瀏覽器控制 LED toggle 和 servo slider + 廣播 DHT22 溫度至 Web UI (BUG-085: user verbatim prompt 的標準參考)。★ 必須: 將 websocket_server_received_value 連接到 servo_write 的 ANGLE 輸入 (禁止 hardcode 固定值)。★ 必須: websocket_server_received_value 積木僅可放在 on_message HANDLER 內 — 絕對禁止放在 top-level (arduino_setup / arduino_loop 的 sibling)，會 emit 無意義的 `wsServerMessage;` 表達式。',
      },
      'ha-multi-control': {
        title: 'HA 多 entity 控制 (Switch + Number Slider + Sensor)',
        description: '透過 HA Switch ON/OFF 控制 LED + 透過 HA Number slider 控制 servo 角度 + 將 DHT22 溫度報告為 HA sensor (HA callback cluster 的標準參考, BUG-085)',
      },
      'espnow-peer-control': {
        title: 'ESP-NOW peer 接收 → LED 控制 (致動器驅動)',
        description: '透過 ESP-NOW 從其他裝置接收 "LED_ON" / "LED_OFF" 訊息並控制 LED (espnow_received_data + controls_if 分支 pattern, BUG-085)',
      },
      'tm1637-clock': {
        title: 'TM1637 數位時鐘',
        description: '在 TM1637 4 位 7 段顯示器上顯示 HH:MM',
      },
      'max7219-scroll-text': {
        title: 'MAX7219 文字捲動',
        description: '在 MAX7219 8x8 LED 矩陣上向左捲動 HELLO 文字',
      },
      'lora-mesh-sender': {
        title: 'LoRa 長距離發送器',
        description: '透過 LoRa SX1276 每 5 秒發送量測值，並印出收到的封包',
      },
      'gps-tracker': {
        title: 'GPS 位置追蹤器',
        description: '使用 NEO-6M 每 10 秒印出緯度 / 經度 / 高度 / 衛星數',
      },
      'modbus-temp-monitor': {
        title: 'Modbus 工業感測器 + 雲端',
        description: '讀取 Modbus RTU 暫存器，發布到 iot_cloud (工業 IoT)',
      },
      'air-quality-dashboard': {
        title: '空氣品質儀表板 (CO2 + PM2.5 + OLED)',
        description: '在 OLED 顯示 SCD30 (CO2) + PMS5003 (PM2.5)，發布到 iot_cloud',
      },
      // 第 88 回 (2026-05-08): 51.md/52.md 殘餘類別 12 個範例
      'm5stack-button-lcd': {
        title: 'M5Stack 按鈕 + LCD 顯示',
        description: '在 M5Stack Core/Atom/StickC 上，按下 A 鍵時更新 LCD (必須呼叫 m5stack_begin)',
      },
      'hx711-scale': {
        title: 'HX711 荷重感測秤',
        description: '透過 HX711 讀取重量並輸出至 Serial (工業秤、Fab Academy 期末專案範例)',
      },
      'espnow-mesh-receiver': {
        title: 'ESP-NOW 網狀網路接收器',
        description: '接收來自其他裝置的 ESP-NOW 訊息並輸出至 Serial (Fab Academy Networking 週)',
      },
      'sht40-temp-humidity': {
        title: 'SHT40 溫濕度感測器',
        description: '每 5 秒讀取 SHT40 溫濕度並輸出 Serial (M5Stack ENV IV 單元相容)',
      },
      'epaper-status-display': {
        title: '電子紙狀態顯示',
        description: '在電子紙 (Adafruit_EPD) 上顯示一次狀態文字並保留 (低耗電看板)',
      },
      'stepper-position-control': {
        title: '步進馬達位置控制 (28BYJ-48)',
        description: '順時針轉 90 度 → 等待 1 秒 → 反向轉 (CNC / 自動化)',
      },
      'relay-timer-control': {
        title: '繼電器計時控制',
        description: '繼電器 3 秒 ON → 5 秒 OFF 循環 (工業 IoT 控制)',
      },
      'neomatrix-pixel-display': {
        title: 'NeoMatrix 像素繪製',
        description: '在 8x8 NeoMatrix LED 對角顯示 2 顆彩色像素並保留 1 秒 (NeoPixel 2D 矩陣)',
      },
      'max30102-pulse-monitor': {
        title: 'MAX30102 心率 / 血氧監測',
        description: '每秒輸出心率與 SpO2 至 Serial (教育用、非醫療等級)',
      },
      'ina219-power-monitor': {
        title: 'INA219 電力監測',
        description: '每 2 秒輸出電壓與電流至 Serial (電池 / 太陽能)',
      },
      'apds9960-gesture-control': {
        title: 'APDS9960 手勢控制',
        description: '將偵測到的手勢 (UP/DOWN/LEFT/RIGHT) 輸出至 Serial (HCI 輸入)',
      },
      'pushover-distance-alert': {
        title: 'Pushover 距離警示',
        description: '超音波距離 < 10 cm 時透過 Pushover 推播至手機 (安防 / 在席偵測)',
      },
      'ha-binary-sensor-motion': {
        title: 'HA 二元感測器 (人體偵測)',
        description: '將 GPIO 13 的人體偵測器自動註冊為 Home Assistant binary_sensor (motion 類別) 並回報狀態',
      },
      'ha-diagnostics-only': {
        title: 'HA 自動診斷專用',
        description: '每 60 秒將 WiFi RSSI / Uptime / 可用 Heap / 重啟原因自動發佈為 HA 診斷 entity (無使用者 sensor)',
      },
      'ha-via-device-multi-esp32': {
        title: 'HA 多 ESP32 (via_device 階層、擠出機構側)',
        description: '黏土 3D 印表機的擠出機構 ESP32。將 VIA_DEVICE 設為親裝置名稱可將多個 ESP32 分組於單一 HA 裝置 (Takeda 判斷 3 使用案例)',
      },
      'ha-ota-firmware-update': {
        title: 'HA OTA 韌體更新',
        description: '使用者於 HA UI 點選「安裝」後 ESP32 自行取得 .bin 並重啟。從 DigiCode IDE 編譯完成對話框匯出 .bin、上傳至 HA add-on local/ 資料夾 (Takeda 判斷 1 使用案例)',
      },
      'ha-watchdog-resilience': {
        title: 'HA 堅韌構成 (整合 watchdog)',
        description: 'watchdog_enable 在 60 秒 loop 卡住時自動重啟；ha_diagnostics_auto 持續向 HA 回報 RSSI / Uptime / Heap / 重啟原因。適合 24/7 感測器 / 工廠 IoT',
      },
      'wifi-led-servo-controller': {
        title: 'WiFi 控制器 + LED + Servo (2-channel、無溫度感測器)',
        description: '透過 WebSocket 伺服器從瀏覽器控制 LED toggle / Servo slider (BUG-086: 2-channel 標準參考)。★ 必須: 每個 WRITE=TRUE register block (led / servo) 都要 emit 對應的 websocket_server_on_message handler，且 CHANNEL_ID 相同。★ 必須: 將 websocket_server_received_value 連接到 servo_write 的 ANGLE 輸入 (禁止 hardcode literals)。',
      },
    },
  },
};

function applyOverride(base: SampleProject, override: SampleOverride | undefined): SampleProject {
  if (!override) return base;
  return {
    ...base,
    title: override.title ?? base.title,
    description: override.description ?? base.description,
  };
}

export function getLocalizedSampleProjects(language: string): SampleProject[] {
  const locale = overrides[language];
  if (!locale?.samples) return baseSamples;
  return baseSamples.map((s) => applyOverride(s, locale.samples![s.id]));
}

type LocalizedCategory = {
  name: string;
  icon: string;
};

export function getLocalizedSampleCategories(language: string): Record<keyof typeof baseCategories, LocalizedCategory> {
  const locale = overrides[language];
  const result = {} as Record<keyof typeof baseCategories, LocalizedCategory>;
  for (const key of Object.keys(baseCategories) as (keyof typeof baseCategories)[]) {
    const cat = baseCategories[key];
    const co = locale?.categories?.[key];
    result[key] = { name: co?.name ?? cat.name, icon: cat.icon };
  }
  return result;
}

export function useLocalizedSampleProjects() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useMemo(() => ({
    samples: getLocalizedSampleProjects(lang),
    categories: getLocalizedSampleCategories(lang),
  }), [lang]);
}
