# Primeros Pasos

**Última actualización:** 2026-05-02

DigiCode es un entorno de programación visual que permite programar fácilmente robots y dispositivos IoT con ESP32 usando bloques. Esta guía te lleva por el camino más corto para **hacer parpadear un LED vía USB**.

---

## 🚀 Funciona en 5 Minutos — Camino Más Corto

1. **Instala el controlador USB** (CP2102 o CH340 — solo si aún no está instalado, ver más abajo)
2. **Abre DigiCode** → arriba a la izquierda **"Muestras"** → selecciona **"LED Parpadeante"**
3. **Conecta el ESP32 al PC mediante cable USB**
4. Botón **"Cargar"** arriba a la derecha → elige **"USB"** → selecciona el puerto del ESP32 en el diálogo del navegador
5. **Tras completar la carga, el LED integrado del ESP32 (GPIO2) parpadea a intervalos de 1 segundo** ✅

Listo. Ya tienes un entorno DigiCode funcionando.

> 💡 **Acceso como invitado funciona**: la creación de cuenta es opcional. Regístrate solo si quieres guardar programas en la nube ([detalles](#acceso-como-invitado-y-cuentas)).

---

## 🟡 Antes de Empezar

| Elemento | Detalles |
|---|---|
| **Hardware** | Placa de desarrollo ESP32 ([lista recomendada](./recommended-hardware.md)) + cable USB (Type-C o Micro-USB, **compatible con datos** — los cables solo de carga no funcionan) |
| **Software** | Navegador web (Chrome / Edge recomendado — se requiere Web Serial API) |
| **Controlador** | CP2102 o CH340 según el chip USB-serie de tu placa (tabla más abajo) |

---

## 5 Pasos hasta Terminar

### Paso 1: Instala el Controlador USB

Instala un controlador USB-serie antes de conectar el ESP32 al PC.

| Chip | Placas de ejemplo | Descarga |
|---|---|---|
| **CP2102** | ESP32-DevKitC, M5StampS3A, etc. | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Muchas placas ESP32 genéricas | http://www.wch.cn/downloads/CH341SER_ZIP.html |

Consulta la descripción del producto de tu placa para encontrar el tipo de chip. Reinicia el PC tras instalar para que el sistema reconozca el nuevo controlador.

> 💡 **La mayoría de las placas M5Stack usan CP2102**. Las placas ESP32 genéricas y económicas suelen usar CH340.

### Paso 2: Abre DigiCode

Accede a [DigiCode](https://digital-fab.jp) y abre el editor. **Puedes usarlo como invitado** — no se requiere registro.

### Paso 3: Carga la muestra "LED Parpadeante"

1. Haz clic en **"Muestras"** arriba a la izquierda
2. Elige la categoría **"Básico"** → **"LED Parpadeante"**
3. Los bloques se colocan automáticamente en el espacio de trabajo

> ✨ **Éxito primero**: confirmar que "funciona" con una muestra antes de aprender la mecánica de los bloques tiene mejor retención. Si quieres colocar bloques tú mismo, ver [más abajo](#colocar-bloques-tú-mismo-referencia).

### Paso 4: Conecta el ESP32 por USB y carga

1. Conecta el ESP32 al PC mediante cable USB
2. Haz clic en el botón **"Cargar"** arriba a la derecha del editor
3. Elige **"USB"**
4. Selecciona el puerto del ESP32 en el diálogo de puerto serie del navegador (ej: `COM3`, `/dev/ttyUSB0`, `/dev/cu.usbserial-XXXX`)
5. La carga comienza → el ESP32 se reinicia automáticamente al completar

### Paso 5: Verifica

Éxito: el LED integrado del ESP32 (GPIO2) parpadea a **intervalos de 1 segundo**.

---

## Problema: El Puerto No Aparece

### No aparece ningún dispositivo en el diálogo de puertos del navegador

La causa más común es que falta el controlador USB:

1. **Controlador del Paso 1** no instalado / no se reinició tras instalar → instala + reinicia
2. Verifica que el **cable USB sea compatible con datos** (los cables solo de carga no hacen visible el ESP32 al PC)
3. Desconecta y vuelve a conectar el ESP32 → haz clic en "Cargar" de nuevo

¿Sigue atascado? Consulta [Solución de Problemas](./troubleshooting.md).

---

## Detalles y Conceptos

### Carga de Programa vs Carga de Firmware

| Operación | Contenido | Cuándo |
|---|---|---|
| **Carga de Programa** | Carga el programa hecho con bloques al ESP32 | Cada vez (USB / WiFi OTA / BLE) |
| **Carga de Firmware** | Carga software base para WiFi OTA / BLE | **Solo la primera vez, solo si usas WiFi OTA / BLE** |

**Si solo usas USB, no se necesita carga de firmware.**

### Acceso como Invitado y Cuentas

- **Invitado**: creación de programas, carga y muestras funcionan todos. Guardar es solo descarga de archivo.
- **Cuenta (Free)**: guardar programas en la nube, además de acceso a generación de bloques con IA, envío de comentarios y otros extras → [resumen de planes](./index.md#planes)

Para registrarte, haz clic en **"Iniciar sesión" → "Registrarse"** e introduce tu correo y contraseña.

### Colocar Bloques Tú Mismo (referencia)

Para quienes prefieren ensamblar bloques en lugar de usar una muestra. Código mínimo de LED parpadeante:

**Setup:**
```
Configurar Modo Pin [2] como [SALIDA]
```

**Loop:**
```
Repetir siempre:
  Escritura Digital [2] HIGH
  Esperar [1000] ms
  Escritura Digital [2] LOW
  Esperar [1000] ms
```

GPIO2 es el LED integrado del ESP32. Para detalles de bloques, ver la [Referencia de Bloques](./block-reference.md).

### Categorías de Muestras

| Categoría | Contenidos |
|---|---|
| **Básico** | LED parpadeante, comunicación serie, entrada de botón |
| **Sensores** | Ultrasónico, temperatura/humedad, luz, acelerómetro |
| **Motores** | Servo, motor DC, paso a paso |
| **Robots** | Humanoide, con ruedas, transformable |
| **IoT** | WiFi, MQTT, Home Assistant |
| **Competencia** | Seguimiento de línea, micromouse |

---

## Qué Sigue

### Cargar Sin Cable (intermedio+)

Si conectar USB cada vez es inconveniente, puedes configurar carga inalámbrica:

- **WiFi OTA** — carga inalámbrica más rápida (admite actualización masiva de varios dispositivos)
- **BLE** — basado en Bluetooth (sin WiFi, ideal para dispositivos en carcasas)

Se requiere una configuración USB única: **Carga de Firmware** + configuración WiFi (~5 min).

> 📘 **Detalles**: [Guía de Configuración OTA](./05-ota-guide.md)

### Función de Clases (plan Enterprise)

- **Profesores**: crea una clase y comparte la URL de invitación con los alumnos
- **Alumnos**: únete mediante la URL de invitación y completa las tareas

→ Detalles: [FAQ (Función de Clases)](./faq.md)

### Compilación de Alta Frecuencia (avanzado)

Si superas la cuota de compilación en la nube, puedes ejecutar un servidor de compilación local en tu propio PC.

→ Detalles: [Servidor de Compilación Local](./local-compile-server.md)

---

## Próximos Pasos

- [Hardware Recomendado](./recommended-hardware.md) — lista de dispositivos verificados
- [Referencia de Bloques](./block-reference.md) — cómo usar todos los bloques
- [Guía de Configuración de Hardware](./hardware-setup.md) — cableado de sensores y motores
- [Solución de Problemas](./troubleshooting.md) — problemas comunes y soluciones
- [Guía de Configuración OTA](./05-ota-guide.md) — configuración de WiFi OTA / BLE
- [Servidor de Compilación Local](./local-compile-server.md) — compilar en tu propio PC (avanzado)

---

## Soporte

Si encuentras problemas, consulta [Solución de Problemas](./troubleshooting.md) o abre un Issue en GitHub.
