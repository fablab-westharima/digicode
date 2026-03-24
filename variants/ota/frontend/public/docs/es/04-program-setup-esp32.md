# Carga de Programas - ESP32

**Última actualización:** 2025-12-28

---

## Placas Compatibles

- ESP32
- ESP32-S2 / S3
- ESP32-C2 / C3 / C5 / C6
- ESP8266
- Otras placas compatibles con ESP-IDF

---

## Características del ESP32

ESP32 es un microcontrolador de alto rendimiento con WiFi/Bluetooth integrado.

- **Lenguaje:** Arduino C++
- **Métodos de conexión:** WiFi OTA, BLE, USB
- **Bootloader:** Fijo en ROM (normalmente no requiere reemplazo)

---

## Tres Métodos de Carga

| Método | Caso de Uso | Características |
|--------|-------------|-----------------|
| **WiFi OTA** | Actualizaciones regulares | El más rápido, sin cable |
| **BLE** | Sin WiFi, dispositivos cerrados | Sin cable, funciona sin WiFi |
| **USB** | Configuración inicial, carga confiable | Funciona en cualquier lugar |

---

## Método 1: Carga WiFi OTA (Recomendado)

El método de carga inalámbrica más rápido.

### Requisitos Previos

- Firmware cargado vía USB
- ESP32 conectado a WiFi
- DigiCode Finder (app de escritorio)

### Pasos

1. **Iniciar DigiCode Finder**
   - Dispositivos en la red se detectan automáticamente
   - Descarga: https://github.com/fablab-westharima/DigiCode-Finder/releases

2. **Seleccionar dispositivo y copiar IP**
   - Clic en botón "Seleccionar" del dispositivo
   - La dirección IP se copia al portapapeles

3. **Subir en DigiCode (navegador)**
   - Crea tu programa
   - Clic en botón "Subir"
   - Selecciona "WiFi OTA"
   - Pega la IP en el diálogo
   - Clic en "Iniciar Carga"

---

## Método 2: Carga BLE

Carga via Bluetooth Low Energy.

### Placas Compatibles

- ESP32 (estándar)
- ESP32-C3
- ESP32-S3

> **Nota:** ESP32-S2 no soporta BLE.

### Pasos

1. Crea el programa en DigiCode
2. Selecciona "Subir" → "BLE"
3. Clic en "Buscar dispositivos"
4. Selecciona dispositivo "DigiCode-XXXXXX"
5. Espera a que se complete (más lento que WiFi OTA)

---

## Método 3: Carga Directa USB

El método de carga más confiable.

### Requisitos Previos

- Cable USB (compatible con datos)
- Driver USB (CP2102 o CH340)

### Pasos

1. Conecta ESP32 al PC vía cable USB
2. Crea el programa en DigiCode
3. Selecciona "Subir" → "USB"
4. Selecciona el puerto serial
5. Inicia la carga

---

## Carga Inicial del Firmware

Requerido al usar DigiCode en un ESP32 nuevo.

### Pasos

1. Clic en "**Cargar Firmware**" en el menú lateral
2. Conecta ESP32 al PC vía cable USB
3. Clic en botón "INSTALAR"
4. Selecciona el puerto serial
5. Espera a que se complete (~1 minuto)

---

## Documentos Relacionados

| Documento | Contenido |
|-----------|-----------|
| [Pasos Comunes](./01-program-setup-common.md) | Terminología, procedimientos comunes |
| [Guía OTA](./05-ota-guide.md) | Configuración detallada WiFi OTA |
| [Solución de Problemas](./troubleshooting.md) | Problemas comunes y soluciones |
