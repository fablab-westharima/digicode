# Primeros Pasos

**Última actualización:** 2026-04-21

DigiCode es un entorno de programación visual que permite programar fácilmente robots y dispositivos IoT con ESP32 usando bloques.

Esta guía explica el **flujo básico con cable USB**. Para configurar WiFi OTA / BLE, consulta la [Guía de Configuración OTA](./05-ota-guide.md).

---

## Qué Necesitas

### Hardware

- **Placa de desarrollo ESP32** — consulta la [Lista de Hardware Recomendado](./recommended-hardware.md)
- **Cable USB** (Type-C o Micro-USB, compatible con datos)
- Sensores y motores (según lo que quieras hacer)

### Software

- **Navegador web** (se recomienda Chrome o Edge)
- **Controlador USB** (CP2102 o CH340 — ver abajo)

---

## Crear una Cuenta (Opcional)

**Puedes crear y cargar programas como invitado.** Crea una cuenta si quieres guardar programas en la nube.

1. Ve a DigiCode
2. Haz clic en "Iniciar sesión" → "Registrarse"
3. Ingresa tu correo electrónico y contraseña

> **Sobre los planes:** Empieza con la versión de invitado (Free). → [Resumen de Planes](./index.md#planes)

---

## Paso 1: Instalar el Controlador USB

Necesitas instalar un controlador USB antes de conectar tu ESP32 al PC.

| Chip | Placas de ejemplo | Descarga |
|------|-------------------|---------|
| **CP2102** | ESP32-DevKitC, M5StampS3A, etc. | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Muchas placas ESP32 genéricas | http://www.wch.cn/downloads/CH341SER_ZIP.html |

> Consulta la descripción del producto de tu placa para encontrar el tipo de chip. Reinicia el PC después de instalar.

---

## Paso 2: Crear un Programa (LED Parpadeante)

1. Abre el editor de DigiCode
2. Coloca los siguientes bloques desde la caja de herramientas:

**Bloque Setup:**
```
Setup:
  Configurar Modo Pin [2] como [SALIDA]
```

**Bloque Loop:**
```
Repetir siempre:
  Escritura Digital [2] HIGH
  Esperar [1000] ms
  Escritura Digital [2] LOW
  Esperar [1000] ms
```

> GPIO2 es el LED integrado del ESP32.

---

## Paso 3: Cargar por USB

1. **Conecta el ESP32 al PC mediante cable USB**
2. Haz clic en el botón **"Cargar"** en el editor
3. Selecciona **"USB"**
4. Elige el puerto ESP32 en el diálogo de puerto serie del navegador (ej: COM3, /dev/ttyUSB0)
5. La carga comienza → el ESP32 se reinicia automáticamente al completar

**Verificar:** El LED integrado del ESP32 (GPIO2) parpadea a intervalos de 1 segundo.

### Si el puerto no aparece

Es posible que el controlador USB no esté instalado correctamente. Vuelve al Paso 1 e instala el controlador.

---

## Paso 4: Probar Proyectos de Muestra

1. Haz clic en el botón **"Muestras"** en el editor
2. Elige de las categorías:
   - **Básico** — LED parpadeante, comunicación serie
   - **Sensores** — sensor ultrasónico, temperatura/humedad
   - **Competencia** — seguimiento de línea, micromouse
3. Carga el ejemplo
4. Ajusta los números de pin según sea necesario
5. Carga por USB y verifica

---

## Diferencia entre Carga de Programa y Carga de Firmware

| Operación | Contenido | Cuándo |
|-----------|-----------|--------|
| **Carga de Programa** | Cargar el programa hecho con bloques | Cada vez (USB / WiFi OTA / BLE) |
| **Carga de Firmware** | Cargar software base para WiFi OTA / BLE | **Solo la primera vez, solo si usas WiFi OTA / BLE** |

**Si solo usas USB, no se necesita carga de firmware.**

---

## Opcional: Cargar Sin Cable

Si conectar un cable USB cada vez es inconveniente, puedes configurar WiFi OTA / BLE.

- **WiFi OTA** — carga inalámbrica más rápida (admite actualizaciones masivas)
- **BLE** — basado en Bluetooth (sin WiFi, ideal para dispositivos en carcasas)

Se requiere una configuración USB única: **Carga de Firmware** + configuración WiFi (~5 min).

> **Recomendado para nivel intermedio+:** WiFi OTA requiere configuración de red y la resolución de problemas puede ser compleja. Recomendamos acostumbrarse primero con USB antes de cambiar.

→ Detalles: [Guía de Configuración OTA](./05-ota-guide.md)

---

## Uso de Clases (Plan Enterprise)

- **Profesores:** Crea una clase y comparte la URL de invitación con los alumnos
- **Alumnos:** Únete a la clase mediante la URL de invitación y completa las tareas

→ Detalles: [FAQ (Función de Clases)](./faq.md)

---

## Próximos Pasos

- [Hardware Recomendado](./recommended-hardware.md) — Lista de dispositivos verificados
- [Referencia de Bloques](./block-reference.md) — Cómo usar todos los bloques
- [Guía de Configuración de Hardware](./hardware-setup.md) — Cableado de sensores y motores
- [Solución de Problemas](./troubleshooting.md) — Problemas comunes y soluciones
- [Guía de Configuración OTA](./05-ota-guide.md) — Configuración de WiFi OTA / BLE
- [Servidor de Compilación Local](./local-compile-server.md) — Compilar en tu propio PC (avanzado)

---

## Soporte

Si encuentras problemas, consulta [Solución de Problemas](./troubleshooting.md) o abre un Issue en GitHub.
