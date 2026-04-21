# Carga de Programas — Pasos Comunes

**Última actualización:** 2026-04-21

DigiCode es un entorno de programación con bloques **exclusivo para ESP32**. Este documento define la terminología y proporciona un resumen de los métodos de carga.

---

## Terminología

DigiCode distingue entre "Carga de Programa" y "Carga de Firmware".

### Carga de Programa (Operación normal)

Cargar el programa construido con el editor de bloques en el microcontrolador.

| Elemento | Contenido |
|----------|-----------|
| **Qué se carga** | El programa que hiciste con bloques |
| **Método** | **USB** (básico) / WiFi OTA / BLE |
| **Frecuencia** | Cuando quieras (cada vez que cambies el programa) |
| **Ubicación en UI** | Botón "Cargar" en el editor |

### Carga de Firmware (Solo para usuarios de WiFi OTA / BLE)

Cargar el software base necesario para WiFi OTA o BLE. **No es necesario si solo usas carga USB.**

| Elemento | Contenido |
|----------|-----------|
| **Qué se carga** | Software base OTA (instrucciones base mínimas que controlan y ejecutan directamente el hardware) |
| **Método** | Solo vía USB |
| **Frecuencia** | Solo la primera vez al usar WiFi OTA / BLE |
| **Ubicación en UI** | "Carga de Firmware" en el menú izquierdo |

---

## Placas Compatibles

DigiCode es exclusivo para ESP32.

| Categoría | Placas de ejemplo | USB | WiFi OTA | BLE |
|-----------|------------------|:---:|:--------:|:---:|
| **ESP32 Genérico** | ESP32 / S3 / C3 / C6 | ○ | ○ | ○ |
| **M5Stack** | M5Stack Basic / M5StickC Plus / ATOM / M5Stamp etc. | ○ | ○ | ○ |
| **XIAO ESP32** | XIAO ESP32C3 / S3 / C6 | ○ | ○ | ○ |

> **No compatibles:** ESP8266, Arduino Uno/Nano y la serie RP2040 están fuera del alcance de soporte de DigiCode.

---

## 4 Métodos de Carga

### 1. Carga Directa USB (Básico · Recomendado)

| Elemento | Contenido |
|----------|-----------|
| **Característica** | Más confiable · funciona en cualquier entorno |
| **Velocidad** | Rápida (~30 seg) |
| **Cable** | Necesario |
| **Prerequisitos** | Instalar controlador USB |
| **Placas compatibles** | Todas las placas |

### 2. WiFi OTA (Opcional)

| Elemento | Contenido |
|----------|-----------|
| **Característica** | Sin cable · más rápido · actualización masiva |
| **Velocidad** | Más rápida (~15 seg) |
| **Cable** | No necesario |
| **Prerequisitos** | Carga de firmware + configuración WiFi (solo primera vez) |
| **Placas compatibles** | Serie ESP32 (supportsOta: true) |
| **Necesario** | Router WiFi, DigiCode Finder |

### 3. BLE (Opcional)

| Elemento | Contenido |
|----------|-----------|
| **Característica** | Sin cable · sin WiFi |
| **Velocidad** | Media (~40 seg) |
| **Cable** | No necesario |
| **Prerequisitos** | Carga de firmware (solo primera vez) |
| **Placas compatibles** | ESP32 con BLE (supportsBle: true) |
| **Necesario** | Navegador compatible con Web Bluetooth (Chrome, Edge) |

### 4. Servidor de Compilación Local (Opción de aceleración)

| Elemento | Contenido |
|----------|-----------|
| **Característica** | No consume cuota de compilación en nube · uso sin conexión |
| **Necesario** | Docker (u OrbStack, Rancher Desktop, etc.) |
| **Plan recomendado** | Pro y superior |

→ Detalles: [Servidor de Compilación Local](./local-compile-server.md)

---

## Qué Necesitas

### Obligatorio
- Computadora (Windows / Mac / Linux)
- Navegador web (se recomienda Chrome, Edge)
- Placa ESP32 compatible
- Cable USB (compatible con datos)
- Controlador USB (CP2102 o CH340)

### Opcional
- **Para WiFi OTA:** Router WiFi, DigiCode Finder
- **Para BLE:** Navegador compatible con Web Bluetooth (Chrome, Edge)
- **Para compilación local:** Entorno Docker

---

## Flujo Básico de Carga (USB)

1. Conecta el ESP32 al PC mediante cable USB
2. Crea tu programa en el editor de bloques
3. Haz clic en "Cargar" → selecciona "USB"
4. Selecciona el puerto serie
5. Después de completar la carga, el ESP32 se reinicia automáticamente y ejecuta el programa

---

## Si Quieres Usar WiFi OTA / BLE

Solo se requiere una configuración inicial:

1. Conecta el ESP32 vía USB
2. Ve a "**Carga de Firmware**" en el menú izquierdo → haz clic en "INSTALL"
3. (Solo WiFi OTA) Configura SSID y contraseña en "Configuración WiFi"
4. Después podrás cargar vía WiFi OTA / BLE sin conexión USB

→ Detalles: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Problemas Comunes y Soluciones

| Síntoma | Causa | Solución |
|---------|-------|---------|
| Puerto no mostrado | Controlador USB no instalado | Instala el controlador CP2102 o CH340 |
| Error de carga | Cable USB solo de carga | Reemplaza con un cable compatible con datos |
| Tiempo de espera durante carga | Conexión inestable | Prueba otro puerto USB o cable |
| No puede entrar en modo BOOT | Procedimiento específico de la placa | Mantén presionado el botón BOOT al iniciar la carga |
| No detectado por WiFi OTA | WiFi no conectado o FW no cargado | Verifica la carga de firmware y la configuración WiFi vía USB |

---

## Documentos Relacionados

| Documento | Contenido |
|-----------|-----------|
| [Guía ESP32](./04-program-setup-esp32.md) | Detalles de carga para ESP32 |
| [Guía de Configuración OTA](./05-ota-guide.md) | Configuración de WiFi OTA / BLE |
| [Servidor de Compilación Local](./local-compile-server.md) | Compilar en tu propio PC |
