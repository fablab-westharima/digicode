# Carga de Programas - Pasos Comunes

**Última actualización:** 2025-12-28

---

## Definiciones de Términos

| Término | Descripción |
|---------|-------------|
| **Firmware** | Programa base de DigiCode. Solo carga USB, una sola vez |
| **Programa** | Programa de usuario desde el editor de bloques. Se puede actualizar en cualquier momento |

### Firmware

- **Qué es**: Programa base que contiene funcionalidad OTA
- **Cuándo cargar**: Solo carga inicial, cuando se actualiza DigiCode
- **Cómo cargar**: Solo USB (no se puede vía WiFi)
- **Incluye**: Servidor HTTP, cliente mDNS, funciones OTA

### Programa

- **Qué es**: Código de usuario generado desde bloques
- **Cuándo cargar**: Cada vez que cambias el programa
- **Cómo cargar**: WiFi OTA, BLE, o USB
- **Incluye**: Tu lógica de programa personalizada

---

## Flujo de Trabajo General

```
[Primera Vez]
1. Cargar Firmware (USB) → 2. Configurar WiFi → 3. Subir Programa

[Después de eso]
1. Editar Programa → 2. Subir (WiFi OTA / BLE / USB)
```

---

## Diferencia: Firmware vs Programa

| Aspecto | Firmware | Programa |
|---------|----------|----------|
| Frecuencia | Solo inicial | Cada cambio |
| Método | Solo USB | WiFi/BLE/USB |
| Contenido | Sistema OTA | Lógica de usuario |
| Tiempo | ~1 minuto | 10-30 segundos |

---

## Documentos Relacionados

| Documento | Contenido |
|-----------|-----------|
| [Carga ESP32](./04-program-setup-esp32.md) | Configuración específica ESP32 |
| [Guía OTA](./05-ota-guide.md) | Configuración detallada WiFi OTA |
| [Solución de Problemas](./troubleshooting.md) | Problemas comunes y soluciones |
