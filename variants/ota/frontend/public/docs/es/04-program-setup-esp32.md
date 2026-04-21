# Carga de Programas — Serie ESP32

**Última actualización:** 2026-04-21

---

## Placas Compatibles

| Placa | USB | WiFi OTA | BLE | Notas |
|-------|:---:|:--------:|:---:|-------|
| ESP32 | ○ | ○ | ○ | El más común |
| ESP32-S3 | ○ | ○ | ○ | Alto rendimiento, expansión AI |
| ESP32-C3 | ○ | ○ | ○ | RISC-V, bajo consumo |
| ESP32-C6 | ○ | ○ | ○ | Soporte Matter |
| M5Stack Basic/Gray/Fire | ○ | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | ○ | Compacto |
| ATOM Lite / Matrix | ○ | ○ | ○ | Ultra-compacto |
| M5Stamp Pico | ○ | ○ | ○ | — |
| M5Stamp C3/C3U | ○ | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | ○ | Placa recomendada DigiCode (tarjeta de expansión dedicada en desarrollo) |
| XIAO ESP32C3 | ○ | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | ○ | Soporte cámara |
| XIAO ESP32C6 | ○ | ○ | ○ | — |

> **No compatible:** ESP8266 no está soportado por DigiCode.

---

## Terminología

| Término | Descripción |
|---------|-------------|
| **Carga de Programa** | Cargar el programa creado en el editor de bloques (cada vez) |
| **Carga de Firmware** | Cargar software base para WiFi OTA / BLE (**solo primera vez, solo si usas WiFi OTA / BLE**) |

Ver [Pasos Comunes](./01-program-setup-common.md) para más detalles.

---

## Método 1: Carga Directa USB (Básico · Recomendado)

El método de carga más confiable. Adecuado para principiantes y resolución de problemas.

### Prerequisitos

- Cable USB (compatible con datos)
- Controlador USB (CP2102 o CH340)

### Instalar Controlador USB

Si el ESP32 no es reconocido, instala el controlador.

**Placas CP2102 (muchos ESP32-DevKitC, M5StampS3A, etc.):**
- https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

**Placas CH340 (muchas placas ESP32 genéricas):**
- http://www.wch.cn/downloads/CH341SER_ZIP.html

### Pasos

1. Conecta el ESP32 al PC mediante cable USB
2. Crea tu programa en el editor de bloques
3. Haz clic en **"Cargar"** → selecciona **"USB"**
4. Selecciona el puerto ESP32 en el diálogo de puerto serie del navegador
5. La carga comienza (~30 seg) → se reinicia automáticamente al completar

### Solución de Problemas

| Síntoma | Solución |
|---------|---------|
| Puerto no mostrado | Instala el controlador USB |
| Carga fallida | Mantén presionado el botón BOOT al iniciar la carga |
| Error de tiempo de espera | Prueba otro puerto USB o cable |

---

## Método 2: WiFi OTA (Opcional)

Método de carga sin cable más rápido. Requiere configuración inicial.

### Prerequisitos

- **Firmware cargado** (una vez vía USB)
- WiFi configurado (SSID/contraseña)
- DigiCode Finder (aplicación de escritorio)

### Pasos

1. Abre DigiCode Finder, el dispositivo se detecta automáticamente
2. Haz clic en "Seleccionar" en el dispositivo objetivo para copiar la IP
3. Haz clic en "Cargar" → "WiFi OTA" → pega la dirección IP
4. La carga comienza (~15 seg)

→ Detalles de configuración: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Método 3: BLE (Opcional)

Carga vía Bluetooth. Útil para actualizar dispositivos en carcasas o en lugares sin WiFi.

### Prerequisitos

- **Firmware cargado** (una vez vía USB)
- Navegador compatible con Web Bluetooth (Chrome, Edge)

### Placas compatibles

Todas las placas ESP32 con BLE (supportsBle: true).

### Pasos

1. Crea tu programa
2. Haz clic en "Cargar" → selecciona "BLE"
3. Haz clic en "Buscar dispositivos", comienza el escaneo Bluetooth
4. Selecciona "DigiCode-XXXXXX" y empareja
5. La carga comienza (~40 seg)

→ Detalles de configuración: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Método 4: Servidor de Compilación Local (Opción de aceleración)

Compila en tu propio PC, sin consumir cuota de la nube y más rápido.

→ Detalles: [Servidor de Compilación Local](./local-compile-server.md)

---

## Carga Inicial de Firmware (Solo para usuarios de WiFi OTA / BLE)

Necesario solo una vez para usar WiFi OTA o BLE.

### Pasos

1. Haz clic en **"Carga de Firmware"** en el menú izquierdo
2. Conecta el ESP32 mediante cable USB
3. Haz clic en "INSTALL"
4. Selecciona el puerto serie
5. Espera a que se complete (~1 min)

### Configuración WiFi (para WiFi OTA)

Después de cargar el firmware, para usar WiFi OTA:

1. Haz clic en "Configuración WiFi"
2. Selecciona y conecta al puerto serie
3. Ingresa SSID y contraseña
4. Haz clic en "Prueba de Conexión"
5. Después del éxito, se muestra la dirección IP fija

---

## Monitor Serie

Útil para depurar tu programa.

1. Conecta el ESP32 vía USB
2. Haz clic en "Monitor Serie" en la barra lateral
3. Selecciona el puerto y haz clic en "Conectar"
4. Velocidad en baudios: 115200

---

## Cómo Elegir el Método de Carga

| Situación | Recomendado |
|-----------|-------------|
| Principiante / desarrollo habitual | **USB** (más confiable) |
| WiFi OTA ya configurado | WiFi OTA (más rápido) |
| Sin entorno WiFi | USB o BLE |
| Dispositivo en carcasa | BLE o WiFi OTA |
| Actualización masiva en clase | WiFi OTA |
| Ahorrar cuota de compilación | Servidor de compilación local |
| Resolución de problemas / recuperación | **USB** (más confiable) |

---

## Documentos Relacionados

| Documento | Contenido |
|-----------|-----------|
| [Pasos Comunes](./01-program-setup-common.md) | Terminología, resumen de métodos |
| [Guía de Configuración OTA](./05-ota-guide.md) | Detalles de WiFi OTA / BLE |
| [Servidor de Compilación Local](./local-compile-server.md) | Compilar en tu propio PC |
| [Solución de Problemas](./troubleshooting.md) — Guía de resolución de problemas |
| [Guía de Configuración de Hardware](./hardware-setup.md) — Cableado de sensores y motores |
