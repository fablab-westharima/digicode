# Bienvenido a DigiCode

**DigiCode** es un entorno de programación visual para ESP32 usando Blockly.
Crea programas con bloques de arrastrar y soltar, y cárgalos en tu placa ESP32 con un clic.

---

## Resumen General

![Descripción del Flujo](/docs/images/flow-overview.svg)

---

## Tres Métodos de Carga

DigiCode soporta tres métodos de carga de programas:

![Métodos de Carga](/docs/images/upload-methods.svg)

| Método | Características | Casos de Uso |
|--------|-----------------|--------------|
| **WiFi OTA** | Sin cables, el más rápido | Actualizaciones regulares |
| **BLE** | Bluetooth, funciona sin WiFi | Cuando WiFi no está disponible |
| **USB** | El más confiable | Configuración inicial, depuración |

---

## Inicio Rápido

### Configuración Inicial (Solo Primera Vez)

![Pasos de Configuración Inicial](/docs/images/quickstart-initial.svg)

1. **Subir Firmware vía USB**
   - Conecta ESP32 al PC con cable USB
   - Clic en "Cargar Firmware" en el menú lateral
   - Sube el firmware base de DigiCode

2. **Configurar WiFi** (para carga OTA)
   - Ingresa SSID y contraseña
   - Prueba la conexión
   - Se mostrará una IP fija

3. **Instalar DigiCode Finder** (Recomendado)
   - Descarga la app de escritorio
   - Detecta automáticamente dispositivos en la red

### Creación de Programa (Repetir)

![Pasos de Repetición](/docs/images/quickstart-repeat.svg)

1. **Crear Programa** - Arrastra y suelta bloques en el editor
2. **Subir** - Elige método de carga y sube
3. **Verificar** - Confirma que el programa funciona

---

## Documentos Detallados

| Documento | Contenido |
|-----------|-----------|
| [Primeros Pasos](./getting-started.md) | Configuración del entorno, primera carga |
| [Pasos Comunes](./01-program-setup-common.md) | Terminología, procedimientos comunes |
| [Guía de Carga ESP32](./04-program-setup-esp32.md) | Configuración específica de ESP32 |
| [Guía de Configuración OTA](./05-ota-guide.md) | Configuración detallada de WiFi OTA |
| [Referencia de Bloques](./block-reference.md) | Documentación completa de bloques |
| [Configuración de Hardware](./hardware-setup.md) | Cableado de sensores y actuadores |
| [Solución de Problemas](./troubleshooting.md) | Problemas comunes y soluciones |

---

## Soporte

- **Problemas de GitHub**: https://github.com/fablab-westharima/DigiCode/issues
- **Documentación**: Este sitio de documentación
