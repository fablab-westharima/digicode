# Carga de Programas - RP2040

**Última actualización:** 2025-12-28

---

## Placas Compatibles

- Raspberry Pi Pico
- Pimoroni Tiny 2040
- Otras placas basadas en RP2040

---

## Características del RP2040

RP2040 es un microcontrolador de bajo costo desarrollado por Raspberry Pi Foundation:

- **Bootloader:** Fijo en ROM (siempre arrancable)
- **Método de conexión:** Solo USB (puerto serial virtual)
- **Formato de carga:** UF2 (USB Flashing Format)
- **Preparación especial:** Ninguna (bootloader siempre disponible)

---

## Pasos de Carga (Conexión USB)

### Preparación

1. **Entrar en Modo Boot**
   - Desconecta RP2040 del PC
   - Mantén presionado BOOTSEL mientras conectas al PC
   - Aparece un disco llamado `RPI-RP2`

2. **Generar Archivo UF2 en DigiCode**
   - Accede a DigiCode
   - Inicia sesión
   - Selección de placa: **RP2040**
   - Lenguaje: **Arduino C++**
   - Crea tu programa
   - Clic en **Compilar**
   - Aparece botón **Descargar** → Clic
   - Se descarga archivo `*.uf2`

3. **Copiar Archivo UF2 a RP2040**
   - En Windows: arrastra y suelta al disco `RPI-RP2`
   - En Mac/Linux: `cp ~/Downloads/*.uf2 /Volumes/RPI-RP2/`

4. **Carga Completa**
   - Después de copiar, RP2040 se reinicia automáticamente
   - El disco `RPI-RP2` desaparece (el programa empieza a ejecutarse)

---

## Solución de Problemas

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Disco RPI-RP2 no aparece | BOOTSEL no presionado | Mantén botón mientras conectas |
| Sin respuesta después de copiar UF2 | Archivo UF2 corrupto | Reintenta descarga |
| Sin salida serial | Baudrate incorrecto | Verifica 115200 bps |

---

## Documentos Relacionados

- [Pasos Comunes](./01-program-setup-common.md)
- [Guía de Carga Arduino](./03-program-setup-arduino.md)
- [Guía de Carga ESP32](./04-program-setup-esp32.md)
