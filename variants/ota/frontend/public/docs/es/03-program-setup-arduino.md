# Carga de Programas - Arduino

**Última actualización:** 2025-12-28

---

## Placas Compatibles

- Arduino Uno
- Arduino Nano
- Arduino Nano (Old Bootloader)
- Arduino Leonardo
- Otras placas ATmega328P / ATmega32U4

---

## Características de Arduino

Arduino es una placa de desarrollo estándar usando microcontroladores AVR:

- **Lenguaje:** Solo Arduino C++ (C/C++)
- **Método de conexión:** USB (puerto serial virtual) o adaptador serial FTDI
- **Bootloader:** Fijo en ROM (normalmente no requiere reemplazo)
- **Formato de carga:** Intel HEX o Binary

---

## Pasos de Carga

### Método 1: Conexión USB por Cable

1. **Conectar al PC**
   - Conecta Arduino al PC vía cable USB
   - Verifica puerto serial en Arduino IDE

2. **Generar Binario en DigiCode**
   - Accede a DigiCode
   - Selección de placa: **Arduino Uno** o **Arduino Nano**
   - Lenguaje: **Arduino C++**
   - Crea tu programa
   - Clic en **Compilar**

3. **Subir con avrdude (Línea de Comandos)**

   ```bash
   # Arduino Uno
   avrdude -p atmega328p -c arduino -P /dev/tty.usbmodem14201 -b 115200 -D -U flash:w:program.hex:i
   ```

---

## Identificación de Placa/Bootloader

Para Arduino Nano, la verificación de versión es importante:

- **57600 bps**: Bootloader estándar
- **115200 bps**: Old Bootloader

En DigiCode, puedes seleccionar `Arduino Nano (Old Bootloader)` en la selección de placa.

---

## Solución de Problemas

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Puerto serial no aparece | Falta driver USB | Verifica driver en Arduino IDE |
| Programador no responde | Baudrate incorrecto | Verifica configuración Old Bootloader |
| Programa no funciona después de cargar | Bootloader corrupto | Flashea bootloader con Arduino IDE |

---

## Documentos Relacionados

- [Pasos Comunes](./01-program-setup-common.md)
- [Guía de Carga ESP32](./04-program-setup-esp32.md)
- [Guía de Configuración OTA](./05-ota-guide.md)
