# Visión General de la Arquitectura de DigiCode

Configuración del sistema y stack tecnológico para DigiCode.

## Configuración del Sistema

![Arquitectura del Sistema](/docs/images/system-architecture.svg)

## Stack Tecnológico

### Frontend
- **Framework:** React 19 + TypeScript
- **Herramienta de build:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **Editor de bloques:** Blockly 10.4
- **Gestión de estado:** Zustand
- **Enrutamiento:** React Router 7
- **Carga a dispositivo:** esp-web-tools, esptool-js

### API Backend
- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Base de datos:** Cloudflare D1 (SQLite)
- **Autenticación:** JWT
- **Almacenamiento de archivos:** Cloudflare R2

### Servidor de Compilación
- **Runtime:** Node.js
- **Framework:** Express
- **Compilador:** Arduino CLI 1.3.1
- **Target:** ESP32 Arduino Core 3.3.4

### Firmware ESP32
- **Lenguaje:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **Comunicación:** Servidor HTTP, WebSocket (planeado)

## Flujos de Datos

### 1. Flujo de Creación de Programa

![Flujo de Creación de Programa](/docs/images/flow-program-creation.svg)

### 2. Flujo de Autenticación

![Flujo de Autenticación](/docs/images/flow-auth.svg)

### 3. Flujo de Actualización WiFi OTA

![Flujo de Actualización WiFi OTA](/docs/images/flow-ota.svg)

## Referencias

- [Documentación React](https://react.dev/)
- [Documentación Blockly](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
