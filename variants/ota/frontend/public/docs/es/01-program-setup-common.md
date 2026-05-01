# Carga de Programas — Pasos Comunes

**Última actualización:** 2026-05-02

DigiCode es un entorno de programación con bloques **exclusivo para ESP32**. Este documento explica "qué método de carga elegir" y la terminología subyacente.

---

## 🚀 ¿Qué Método? — Decide en 30 Segundos

| Tu situación | Método recomendado |
|---|---|
| **Primera vez** / **quieres carga confiable y sin problemas** | 🥇 **USB Directo** ([detalles](#1-carga-directa-usb-básico-recomendado)) |
| ESP32 está en una carcasa / conectar USB cada vez es molesto / quieres actualizar muchos dispositivos a la vez | 🥈 **WiFi OTA** ([detalles](./05-ota-guide.md)) |
| Sin WiFi disponible / configurar WiFi es demasiado | 🥉 **Carga BLE** ([detalles](./05-ota-guide.md)) |
| Cuota de compilación en nube agotada / uso sin conexión / aceleración | ⚡ **Compilación Local + cualquiera de los anteriores** ([detalles](./local-compile-server.md)) |

> 💡 **Si tienes dudas, empieza con USB Directo**. WiFi OTA / BLE son métodos opcionales que se habilitan tras una "carga de firmware" única vía USB.

---

## 4 Métodos de Carga — Comparación

| Método | Velocidad | Cable | Prerequisitos | Placas compatibles |
|---|---|---|---|---|
| **🥇 USB Directo** | ~30 seg | Necesario | Controlador USB | Todas las placas |
| **🥈 WiFi OTA** | ~15 seg (más rápido) | No necesario | Carga de firmware + configuración WiFi (solo primera vez) | Serie ESP32 (`supportsOta: true`) |
| **🥉 BLE** | ~40 seg | No necesario | Carga de firmware (solo primera vez) | ESP32 con BLE (`supportsBle: true`) |
| **⚡ Compilación Local** | (combinable; la velocidad depende del método de carga, cache HIT ~1 ms) | — | Docker | Todas las placas (combinable) |

---

## Placas Compatibles

DigiCode es **exclusivo para ESP32**.

| Categoría | Placas de ejemplo | USB | WiFi OTA | BLE |
|---|---|:---:|:---:|:---:|
| **ESP32 Genérico** | ESP32 / S3 / C3 / C6 | ○ | ○ | ○ |
| **M5Stack** | M5Stack Basic / M5StickC Plus / ATOM / M5Stamp etc. | ○ | ○ | ○ |
| **XIAO ESP32** | XIAO ESP32C3 / S3 / C6 | ○ | ○ | ○ |

> **No compatibles:** ESP8266, Arduino Uno/Nano y la serie RP2040 están fuera del alcance.

---

## Flujo Básico de Carga (USB)

1. **Conecta el ESP32 al PC mediante cable USB**
2. Construye tu programa en el editor de bloques (o carga una muestra)
3. Botón **"Cargar"** arriba a la derecha → elige **"USB"**
4. Selecciona el puerto en el diálogo de puerto serie del navegador
5. Tras completar la carga, el ESP32 se reinicia automáticamente y ejecuta el programa

📘 **Para el procedimiento completo de primera vez**, ver [Primeros Pasos](./getting-started.md) (instalación de controlador hasta muestra LED parpadeante).

---

## Detalles y Conceptos

### Terminología: Carga de Programa vs Carga de Firmware

En DigiCode, "Carga de Programa" y "Carga de Firmware" son **operaciones distintas**.

#### Carga de Programa (operación normal)

Cargar el programa construido con el editor de bloques al microcontrolador.

| Elemento | Contenido |
|---|---|
| **Qué se carga** | El programa que hiciste con bloques |
| **Método** | USB (básico) / WiFi OTA / BLE |
| **Frecuencia** | Cuando quieras (cada vez que cambies el programa) |
| **Ubicación en UI** | Botón "Cargar" en el editor |

#### Carga de Firmware (solo al usar WiFi OTA / BLE)

Cargar el software base (receptor OTA) necesario para WiFi OTA o BLE. **No es necesario si solo usas USB.**

| Elemento | Contenido |
|---|---|
| **Qué se carga** | Software base OTA (instrucciones base mínimas para control de hardware) |
| **Método** | Solo vía USB |
| **Frecuencia** | Solo la primera vez al usar WiFi OTA / BLE |
| **Ubicación en UI** | "Carga de Firmware" en el menú izquierdo |

### 4 Métodos de Carga — Detalle

#### 1. Carga Directa USB (Básico · Recomendado)

Más confiable, funciona en cualquier entorno. Requiere controlador USB (CP2102 / CH340) instalado previamente. Ver [Primeros Pasos](./getting-started.md) y [Guía ESP32](./04-program-setup-esp32.md).

#### 2. WiFi OTA (Opcional)

Sin cable, más rápido, admite actualización masiva de varios dispositivos. Requiere router WiFi. En Windows sin Bonjour, usa [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) como alternativa mDNS (Mac / Linux tienen soporte mDNS nativo). Ver [Guía de Configuración OTA](./05-ota-guide.md).

> ⚠️ **Para usuarios de Windows**: la configuración de WiFi OTA en Windows es para usuarios avanzados. Los principiantes deben preferir carga USB / BLE. Ver contexto en [Servidor de Compilación Local § Windows](./local-compile-server.md#-antes-de-nada-recomendación-y-prerequisitos).

#### 3. Carga BLE (Opcional)

Sin cable, sin WiFi necesario. Requiere navegador compatible con Web Bluetooth (Chrome / Edge). Ver [Guía de Configuración OTA](./05-ota-guide.md).

#### 4. Servidor de Compilación Local (Opción de aceleración)

No consume cuota de compilación en nube, uso sin conexión. Requiere Docker (u OrbStack / Rancher Desktop / Podman). Ortogonal al método de carga (USB / WiFi OTA / BLE), combinable con cualquiera. Ver [Servidor de Compilación Local](./local-compile-server.md).

### Qué Necesitas

#### Obligatorio
- Computadora (Windows / Mac / Linux)
- Navegador web (Chrome / Edge recomendado)
- Placa ESP32 compatible
- Cable USB (compatible con datos)
- Controlador USB (CP2102 o CH340)

#### Opcional
- **Para WiFi OTA**: Router WiFi (DigiCode Finder en Windows sin Bonjour)
- **Para BLE**: Navegador compatible con Web Bluetooth (Chrome / Edge)
- **Para compilación local**: Entorno Docker

### Si Quieres Usar WiFi OTA / BLE

Solo se requiere una configuración inicial:

1. Conecta el ESP32 vía USB
2. Ve a **"Carga de Firmware"** en el menú izquierdo → haz clic en **"INSTALL"**
3. (Solo WiFi OTA) Configura SSID y contraseña en **"Configuración WiFi"**
4. Después podrás cargar vía WiFi OTA / BLE sin USB

→ Detalles: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Problemas Comunes y Soluciones

| Síntoma | Causa | Solución |
|---|---|---|
| El puerto no aparece | Controlador USB no instalado | Instala el controlador CP2102 o CH340 + reinicia el PC |
| Error de carga | Cable USB solo de carga | Reemplaza con un cable compatible con datos |
| Tiempo de espera durante carga | Conexión inestable | Prueba otro puerto USB / cable |
| No puede entrar en modo BOOT | Procedimiento específico de la placa | Mantén presionado BOOT / BOOTSTRAP al iniciar la carga |
| No detectado por WiFi OTA | WiFi no conectado / firmware no cargado | Verifica la carga de firmware y la configuración WiFi vía USB |

Para más, ver [Solución de Problemas](./troubleshooting.md).

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md) — Desde USB hasta LED parpadeante
- [Guía ESP32](./04-program-setup-esp32.md) — Detalles de carga ESP32
- [Guía de Configuración OTA](./05-ota-guide.md) — Configuración WiFi OTA / BLE
- [Servidor de Compilación Local](./local-compile-server.md) — Compilar en tu propio PC
- [Solución de Problemas](./troubleshooting.md) — Problemas comunes y soluciones
