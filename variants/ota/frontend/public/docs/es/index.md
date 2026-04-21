# Documentación de DigiCode

**Última actualización:** 2026-04-21

DigiCode es un entorno de programación visual que permite programar fácilmente robots y dispositivos IoT con ESP32 usando bloques.

---

## Flujo General

DigiCode funciona **solo con un cable USB**. No se necesita ninguna configuración especial.

| Paso | Contenido | Frecuencia |
|------|-----------|------------|
| **1. Preparar** | Obtener placa ESP32, cable USB y controlador USB | Solo la primera vez |
| **2. Crear Programa** | Construir el programa en el editor de bloques | Cada vez |
| **3. Cargar por USB** | Conectar cable USB y cargar | Cada vez |

Repite los mismos pasos a partir de aquí. WiFi OTA / BLE son opciones adicionales para cargar sin cable.

→ Detalles: [Primeros Pasos](./getting-started.md)

---

## WiFi OTA / BLE (Opcional)

Configura cuando quieras actualizar programas sin cable. Solo requiere escribir el **firmware** (software base OTA) vía USB una vez.

> **¿Qué es el firmware?** El programa necesario para WiFi OTA / BLE. Contiene las instrucciones base mínimas que controlan y ejecutan directamente el hardware. **No es necesario si solo usas carga USB.**

| Método | Características | Mejor para |
|--------|----------------|------------|
| **WiFi OTA** | Más rápido · sin cable | Actualizaciones múltiples, desarrollo habitual (nivel intermedio+) |
| **BLE** | Sin cable · sin WiFi | Actualizar dispositivos en carcasas |

→ Detalles: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Placas Compatibles

DigiCode es un editor de bloques **exclusivo para ESP32**.

### ESP32 Genérico

| Placa | WiFi OTA | BLE | Notas |
|-------|:--------:|:---:|-------|
| ESP32 | ○ | ○ | El más común |
| ESP32-S3 | ○ | ○ | Alto rendimiento |
| ESP32-C3 | ○ | ○ | Bajo consumo · RISC-V |
| ESP32-C6 | ○ | ○ | Soporte Matter |

### Serie M5Stack

| Placa | WiFi OTA | BLE | Notas |
|-------|:--------:|:---:|-------|
| M5Stack Basic/Gray/Fire | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | Compacto |
| ATOM Lite / Matrix | ○ | ○ | Ultra-compacto |
| M5Stamp Pico | ○ | ○ | — |
| M5Stamp C3/C3U | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | **Placa recomendada DigiCode (tarjeta de expansión dedicada en desarrollo)** |

### Serie Seeed XIAO

| Placa | WiFi OTA | BLE | Notas |
|-------|:--------:|:---:|-------|
| XIAO ESP32C3 | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | Soporte cámara |
| XIAO ESP32C6 | ○ | ○ | — |

→ Detalles: [Hardware Recomendado](./recommended-hardware.md)

---

## Software Necesario

| Software | Propósito | Cuándo se necesita |
|----------|----------|-------------------|
| **Navegador web** (Chrome/Edge) | Aplicación DigiCode | Obligatorio |
| **Controlador USB** (CP2102 o CH340) | Carga USB | Obligatorio |
| **DigiCode Finder** | Detección de dispositivos WiFi | Solo con WiFi OTA |
| **Docker** | Aceleración de compilación local | Solo con servidor local |

### Descargar DigiCode Finder

Aplicación de escritorio necesaria para cargas WiFi OTA.

**Descarga:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| SO | Archivo |
|----|---------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

---

## Planes

DigiCode es gratuito para empezar.

| Plan | Ideal para | Compilaciones nube | Función clases |
|------|-----------|:-----------------:|:--------------:|
| **Free** | Prueba / compilación local | 50/mes | — |
| **Lite** | Aficionado individual | 250/mes | — |
| **Pro** | Desarrollador / Maker | 500/mes | — |
| **Enterprise** | Instituciones educativas / equipos | Ilimitadas | ○ |

> **Acceso como invitado:** Puedes crear y cargar programas sin cuenta (solo guardado local).

---

## Función de Clases (Plan Enterprise)

Gestión de clases para escuelas e instituciones educativas.

| Rol | Capacidades |
|-----|-------------|
| **Profesor** | Crear clases, distribuir tareas, revisar entregas |
| **Alumno** | Unirse a clases, entregar tareas, ver historial |

→ Detalles: [FAQ (Función de Clases)](./faq.md)

---

## Documentación

### Primeros Pasos

| Documento | Contenido |
|-----------|-----------|
| [Primeros Pasos](./getting-started.md) | Configuración inicial y primer programa |
| [Hardware Recomendado](./recommended-hardware.md) | Lista de dispositivos verificados |

### Guías de Carga

| Documento | Contenido |
|-----------|-----------|
| [Pasos Comunes](./01-program-setup-common.md) | Definición de términos y resumen de métodos |
| [Serie ESP32](./04-program-setup-esp32.md) | Detalles de carga para ESP32 |
| [Configuración OTA (Opcional)](./05-ota-guide.md) | Configuración de WiFi OTA / BLE |

### Referencia

| Documento | Contenido |
|-----------|-----------|
| [Referencia de Bloques](./block-reference.md) | Cómo usar todos los bloques |
| [Configuración de Hardware](./hardware-setup.md) | Cableado de sensores y motores |
| [Solución de Problemas](./troubleshooting.md) | Problemas comunes y soluciones |
| [FAQ](./faq.md) | Preguntas frecuentes |

### Avanzado

| Documento | Contenido |
|-----------|-----------|
| [Arquitectura](./architecture.md) | Estructura del sistema y stack tecnológico |
| [Servidor de Compilación Local](./local-compile-server.md) | Compilar en tu propio PC (aceleración) |

---

## Soporte

Si encuentras problemas, consulta:

1. [Solución de Problemas](./troubleshooting.md)
2. [FAQ](./faq.md)
3. [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues)
