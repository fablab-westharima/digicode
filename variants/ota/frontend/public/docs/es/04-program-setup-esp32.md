# Carga de Programas — Serie ESP32

**Última actualización:** 2026-05-02

Esta página resume los procedimientos de carga para placas de la serie ESP32 (USB / WiFi OTA / BLE / Compilación Local) por método.

---

## 🚀 Carga USB — 5 Pasos

El más confiable, recomendado para principiantes. Hecho en ~30 segundos.

1. **Conecta el ESP32 al PC mediante cable USB (compatible con datos)**
2. Construye tu programa en el editor de bloques (o carga una muestra)
3. Botón **"Cargar"** arriba a la derecha → elige **"USB"**
4. Selecciona el puerto del ESP32 en el diálogo de puerto serie del navegador
5. Tras completar la carga, el ESP32 se reinicia automáticamente ✅

> 💡 **Si no aparece ningún puerto, instala el controlador USB (CP2102 / CH340) y reinicia** ([detalles](#instalar-controlador-usb)).

---

## Placas Compatibles

| Placa | USB | WiFi OTA | BLE | Notas |
|---|:---:|:---:|:---:|---|
| ESP32 | ○ | ○ | ○ | El más común |
| ESP32-S3 | ○ | ○ | ○ | Alto rendimiento, expansión AI |
| ESP32-C3 | ○ | ○ | ○ | RISC-V, bajo consumo |
| ESP32-C6 | ○ | ○ | ○ | Soporte Matter |
| M5Stack Basic / Gray / Fire | ○ | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | ○ | Compacto |
| ATOM Lite / Matrix | ○ | ○ | ○ | Ultra-compacto |
| M5Stamp Pico | ○ | ○ | ○ | — |
| M5Stamp C3 / C3U | ○ | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | ○ | Placa recomendada DigiCode (tarjeta de expansión dedicada en desarrollo) |
| XIAO ESP32C3 | ○ | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | ○ | Soporte cámara |
| XIAO ESP32C6 | ○ | ○ | ○ | — |

> **No compatible:** ESP8266 no está soportado por DigiCode.

---

## 4 Métodos de Carga — Comparación Rápida

| Método | Velocidad | Prerequisitos | Notas |
|---|---|---|---|
| **🥇 USB Directo** | ~30 seg | Controlador USB | Más confiable |
| **🥈 WiFi OTA** | ~15 seg | FW + configuración WiFi (primera vez vía USB) | Más rápido, actualización masiva OK |
| **🥉 BLE** | ~40 seg | FW (primera vez vía USB) | Sin WiFi necesario |
| **⚡ Compilación Local** | (combinable) | Docker | Ahorra cuota de nube |

---

## Método 1: Carga Directa USB (Básico · Recomendado)

### Instalar Controlador USB

Si el ESP32 no es reconocido (no aparece dispositivo en el diálogo de puertos), instala un controlador USB.

| Chip | Placas de ejemplo | Descarga |
|---|---|---|
| **CP2102** | ESP32-DevKitC, M5StampS3A, la mayoría de M5Stack | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Muchas placas ESP32 genéricas | http://www.wch.cn/downloads/CH341SER_ZIP.html |

Tras instalar, **reinicia el PC**.

### Solución de Problemas

| Síntoma | Solución |
|---|---|
| El puerto no aparece | Instala controlador USB + reinicia, verifica que el cable USB sea compatible con datos |
| Carga fallida | Mantén presionado el botón BOOT / BOOTSTRAP al iniciar la carga |
| Error de tiempo de espera | Prueba otro puerto USB / cable |

---

## Método 2: WiFi OTA (Opcional)

Sin cable, carga más rápida. Admite actualización masiva de varios dispositivos.

### Prerequisitos

- **Firmware cargado** (una vez vía USB, [detalles](#carga-inicial-de-firmware))
- WiFi configurado (SSID / contraseña)
- Router WiFi (misma LAN que el ESP32)
- (Solo en Windows sin Bonjour) [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) — alternativa mDNS. No necesario en Mac / Linux (mDNS nativo).

### Pasos

1. Abre DigiCode en el navegador (o usa DigiCode Finder para obtener la IP)
2. **"Cargar"** → **"WiFi OTA"**
3. (Cuando la auto-detección mDNS funciona, elige de la lista de dispositivos / si no, introduce la IP)
4. La carga comienza (~15 seg)

> ⚠️ **Solo usuarios avanzados de Windows**: la configuración de WiFi OTA tiene múltiples prerequisitos y es complicada para principiantes en Windows. Prefiere USB / BLE. Ver [Servidor de Compilación Local § Windows](./local-compile-server.md#-antes-de-nada-recomendación-y-prerequisitos).

→ Detalles de configuración: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Método 3: BLE (Opcional)

Carga vía Bluetooth. Útil para dispositivos en carcasas y lugares sin WiFi.

### Prerequisitos

- **Firmware cargado** (una vez vía USB)
- Navegador compatible con Web Bluetooth (Chrome / Edge)
- Placas compatibles: ESP32 con BLE (`supportsBle: true`)

### Pasos

1. Construye tu programa en el editor de bloques
2. **"Cargar"** → **"BLE"**
3. **"Buscar dispositivos"** → comienza el escaneo Bluetooth
4. Selecciona **"DigiCode-XXXXXX"** y empareja
5. La carga comienza (~40 seg)

→ Detalles de configuración: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Método 4: Servidor de Compilación Local (Opción de aceleración)

Compila en tu propio PC — sin cuota de nube usada, builds más rápidos. Ortogonal al método de carga (USB / WiFi OTA / BLE), combinable con cualquiera. Cache HIT en ~1 ms.

→ Detalles: [Servidor de Compilación Local](./local-compile-server.md)

---

## Detalles y Conceptos

### Terminología

| Término | Descripción |
|---|---|
| **Carga de Programa** | Cargar el programa construido en el editor de bloques (cada vez) |
| **Carga de Firmware** | Cargar software base para WiFi OTA / BLE (**solo primera vez, solo si usas WiFi OTA / BLE**) |

Para más, ver [Pasos Comunes § Terminología](./01-program-setup-common.md#terminología-carga-de-programa-vs-carga-de-firmware).

### Carga Inicial de Firmware

Si quieres usar WiFi OTA o BLE, realiza esto una vez vía USB.

1. Haz clic en **"Carga de Firmware"** en el menú izquierdo
2. Conecta el ESP32 al PC mediante cable USB
3. Haz clic en **"INSTALL"**
4. Selecciona el puerto serie
5. Espera a que se complete (~1 min)

### Configuración WiFi (para WiFi OTA)

Tras la carga de firmware, para usar WiFi OTA:

1. Haz clic en **"Configuración WiFi"**
2. Selecciona y conecta al puerto serie
3. Ingresa SSID y contraseña
4. Haz clic en **"Prueba de Conexión"**
5. Tras éxito, se muestra la dirección IP fija

### Monitor Serie para Depuración

Útil para depurar tu programa.

1. Conecta el ESP32 vía USB
2. Haz clic en **"Monitor Serie"** en la barra lateral
3. Selecciona el puerto y haz clic en **"Conectar"**
4. Velocidad en baudios: **115200**

---

## Cómo Elegir el Método de Carga

| Situación | Recomendado |
|---|---|
| Principiante / desarrollo habitual | **🥇 USB** (más confiable) |
| WiFi OTA ya configurado | 🥈 **WiFi OTA** (más rápido) |
| Sin entorno WiFi | USB o BLE |
| Dispositivo en carcasa | 🥉 BLE o WiFi OTA |
| Actualización masiva en clase | WiFi OTA |
| Ahorrar cuota de compilación | ⚡ Servidor de compilación local |
| Resolución de problemas / recuperación | **🥇 USB** (más confiable) |

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md) — Tutorial de primera carga USB
- [Pasos Comunes](./01-program-setup-common.md) — Terminología, resumen de métodos
- [Guía de Configuración OTA](./05-ota-guide.md) — Detalles de WiFi OTA / BLE
- [Servidor de Compilación Local](./local-compile-server.md) — Compilar en tu propio PC
- [Solución de Problemas](./troubleshooting.md) — Guía de resolución de problemas
- [Guía de Configuración de Hardware](./hardware-setup.md) — Cableado de sensores y motores
