# Preguntas Frecuentes (FAQ)

**Última actualización:** 2026-04-21

Preguntas y respuestas comunes sobre DigiCode.

## Tabla de Contenidos

1. [Cuenta e Inicio de Sesión](#cuenta-e-inicio-de-sesión)
2. [Editor y Bloques](#editor-y-bloques)
3. [Carga de Programa](#carga-de-programa)
4. [WiFi OTA / BLE](#wifi-ota--ble)
5. [Hardware](#hardware)
6. [Gestión de Proyectos](#gestión-de-proyectos)
7. [Función de Clases](#función-de-clases)
8. [Planes y Precios](#planes-y-precios)

---

## Cuenta e Inicio de Sesión

### P: ¿Es obligatorio registrarse?

**R:** No, **puedes crear y cargar programas como invitado**. Sin embargo, se requiere una cuenta para guardar proyectos en la nube (disponible desde el plan Free).

### P: Olvidé mi contraseña

**R:** Desde la pantalla de inicio de sesión, haz clic en el enlace "¿Olvidaste tu contraseña?" para enviar un enlace de restablecimiento a tu dirección de correo electrónico registrada.

### P: ¿Puedo iniciar sesión desde varios dispositivos?

**R:** Sí, puedes iniciar sesión desde varios dispositivos con la misma cuenta. Los proyectos se guardan en la nube y son accesibles desde cualquier dispositivo.

---

## Editor y Bloques

### P: No encuentro un bloque

**R:** Verifica lo siguiente:

1. **Modo de robot** — ¿Has seleccionado el modo correcto? DigiCode tiene 7 modos:
   - Humanoid (bípedo)
   - Wheel (robot con ruedas)
   - Transform (robot transformable)
   - Home Assistant (integración IoT)
   - Generic (uso general)
   - All Blocks (todos los bloques)
   - Custom (personalizado)

2. **Categoría** — Expande cada categoría en la caja de herramientas

3. **Compatibilidad de placa** — Algunos bloques están ocultos según la placa seleccionada
   - Ejemplo: Los bloques BLE no se muestran en Pico W (sin soporte BLE)

### P: No puedo conectar bloques

**R:** Los bloques tienen formas de conector específicas:

- **Formas de muesca/protuberancia** — Bloques que se conectan verticalmente (orden de ejecución)
- **Agujeros redondos** — Bloques de entrada de valor (números, cadenas, etc.)
- **Formas triangulares** — Bloques de entrada de condición (booleano)

Los bloques con formas incompatibles no pueden conectarse.

### P: Los bloques desaparecieron al cambiar de placa

**R:** Al cambiar de placa pueden eliminarse del espacio de trabajo los bloques no compatibles (p. ej., bloques BLE en Pico W). Guarda tu proyecto antes de cambiar.

### P: El texto japonés aparece con caracteres incorrectos

**R:** Puede ocurrir texto con caracteres incorrectos al usar japonés en comunicación serial. Verifica que la velocidad en baudios del monitor serial coincida (normalmente 115200).

---

## Carga de Programa

### P: ¿Cuál es la diferencia entre "Carga de Programa" y "Carga de Firmware"?

**R:**

| Operación | Descripción | Frecuencia |
|-----------|-------------|------------|
| **Carga de Programa** | Cargar el programa creado en el editor de bloques | Cada vez (USB / WiFi OTA / BLE) |
| **Carga de Firmware** | Cargar el software base requerido para WiFi OTA / BLE | **Solo la primera vez** al usar WiFi OTA o BLE |

**La Carga de Firmware no es necesaria si solo usas carga por USB.**

### P: ¿Qué método de carga se recomienda?

**R:** La **carga directa por USB** es la más confiable y recomendada para principiantes y desarrollo típico. Una vez familiarizado y si deseas actualizar sin cable, configura WiFi OTA o BLE.

### P: La compilación falla

**R:** Causas comunes y soluciones:

| Error | Causa | Solución |
|-------|-------|---------|
| Biblioteca no encontrada | Biblioteca requerida no instalada | Se instala automáticamente en el servidor. Reintentar |
| Error de sintaxis | Error de conexión de bloques | Verificar si hay bloques desconectados |
| Sin memoria | Programa demasiado grande | Eliminar bloques innecesarios |
| Cuota de compilación excedida | Límite del plan alcanzado | Actualizar plan o usar Compilación Local |

### P: El ESP32 no es reconocido

**R:** Verifica lo siguiente en orden:

1. **Cable USB** — ¿Es compatible con transferencia de datos? (Los cables solo de carga no funcionan)
2. **Driver** — ¿Está instalado el driver CP2102 / CH340?
3. **Puerto** — Prueba un puerto USB diferente
4. **Navegador** — ¿Estás usando Chrome / Edge? (Se requiere Web Serial API)

### P: Error durante la carga

**R:** Errores comunes y soluciones:

- **"A fatal error occurred: Failed to connect"**
  → Mantén presionado el botón BOOT del ESP32 al iniciar la carga
- **"Timed out waiting for packet header"**
  → Reduce la velocidad en baudios y reintenta
- **"No serial data received"**
  → Verifica el cable USB y el puerto

### P: La compilación tarda mucho

**R:** La primera compilación puede tardar de 30 segundos a 1 minuto. Para builds más rápidos, usa el [Servidor de Compilación Local](./local-compile-server.md) (recomendado plan Pro o superior).

---

## WiFi OTA / BLE

### P: Dispositivo no encontrado (WiFi OTA)

**R:** Verifica lo siguiente:

1. **Misma red WiFi** — ¿Están el PC y el ESP32 en la misma red?
2. **Firewall** — ¿Está bloqueado mDNS (puerto 5353)?
3. **Bonjour** (solo Windows) — ¿Está instalado Bonjour Print Services?
4. **Conexión WiFi del ESP32** — ¿Puedes ver la dirección IP en el monitor serial?

### P: Dispositivo BLE no encontrado

**R:**

1. **Compatibilidad del navegador** — ¿Estás usando Chrome / Edge? (Se requiere Web Bluetooth)
2. **Compatibilidad de placa** — ESP32-S2 no soporta BLE; RP2040 Pico W tampoco soporta BLE
3. **macOS** — La caché BLE de macOS puede mostrar un nombre de dispositivo desactualizado (problema a nivel OS). Funciona correctamente en Windows; Mac puede verse afectado.

### P: La actualización OTA se detiene a mitad

**R:**

1. Ejecuta la actualización en un área con buena señal WiFi
2. Coloca el ESP32 cerca del router
3. Desconecta temporalmente otros dispositivos WiFi
4. Reinicia el router

---

## Hardware

### P: ¿Qué placa ESP32 debo usar?

**R:** DigiCode es exclusivo para placas basadas en ESP32. Las siguientes placas han sido verificadas:

- **ESP32-DevKitC** — la más común
- **M5StampS3A** — placa recomendada por DigiCode (placa de expansión dedicada en desarrollo)
- **ESP32-S3** — alto rendimiento
- **XIAO ESP32S3** — con soporte para cámara

Consulta [Hardware Recomendado](./recommended-hardware.md) para más detalles.

### P: El servo no se mueve

**R:**

1. **Alimentación** — Los servos consumen mucha corriente; la alimentación USB (500 mA) puede ser insuficiente. Usa una fuente externa (5V/2A o más)
2. **Número de pin** — Verifica que la configuración de pines sea correcta
3. **Inicialización** — Asegúrate de haber colocado un bloque de conexión de servo

### P: Los valores del sensor son incorrectos

**R:**

1. **Cableado** — Verifica que los cables VCC / GND / señal estén correctamente conectados
2. **Voltaje** — Verifica el voltaje de operación del sensor (3.3V / 5V)
3. **Pines analógicos** — Usa pines compatibles con ADC (GPIO32–39)

### P: El robot Humanoid no camina correctamente

**R:**

1. **Calibración** — Usa el bloque de posición inicial para verificar la postura vertical
2. **Ancho de pulso del servo** — Ajusta el ancho de pulso en la página de configuración de pines (500–2400 µs)
3. **Velocidad** — Reduce la velocidad para mejorar la estabilidad
4. **Centro de gravedad** — Ajusta la posición de la batería

---

## Gestión de Proyectos

### P: No puedo guardar mi proyecto

**R:**

1. ¿Has iniciado sesión? (Los invitados solo pueden guardar localmente)
2. ¿Has ingresado un nombre de proyecto?
3. ¿La conexión de red funciona correctamente?

### P: Mi proyecto desapareció

**R:**

1. ¿Has iniciado sesión con la cuenta correcta?
2. Busca en la lista de proyectos
3. Los proyectos eliminados accidentalmente no pueden restaurarse

### P: ¿Puedo compartir un proyecto?

**R:** Con la Función de Clases, los profesores pueden distribuir tareas a los alumnos y los alumnos pueden enviar sus respuestas (plan Enterprise). Una función general de compartir proyectos está planificada para desarrollo futuro.

### P: ¿Puedo editar proyectos de ejemplo?

**R:** Al cargar un proyecto de ejemplo se crea automáticamente una copia. El ejemplo original no se modifica.

---

## Función de Clases

### P: ¿Qué es la Función de Clases?

**R:** Una función de gestión de clases para escuelas e instituciones educativas (**plan Enterprise**).

| Rol | Capacidades |
|-----|-------------|
| **Profesor** | Crear clases, distribuir tareas, revisar respuestas, duplicar clases |
| **Alumno** | Unirse a clases (URL de invitación), enviar tareas, ver historial de envíos |

### P: ¿Los alumnos necesitan registrarse?

**R:** Sí, los alumnos también necesitan una cuenta DigiCode. Al unirse a una clase mediante la URL de invitación enviada por el profesor, se otorgan permisos de nivel Enterprise (proporcionados por Fablab Nishiharima).

### P: ¿Qué plan incluye la Función de Clases?

**R:** La Función de Clases es exclusiva del **plan Enterprise**. No está disponible en los planes individuales Free / Lite / Pro.

### P: ¿Dónde se almacena el XML de Blockly de las tareas?

**R:** El XML de Blockly de tareas y respuestas se almacena en el servidor de clases (`class.digital-fab.jp`) en HPE ML30. En D1 solo se almacena información de gestión básica (IDs de clase, miembros, etc.).

### P: ¿Qué ocurre si el servidor de clases se cae?

**R:** Las funciones de clase (distribución de tareas, envío de respuestas) dejan de estar disponibles, pero la creación y carga normal de programas en DigiCode continúa funcionando. El sistema está diseñado para limitar el impacto solo a las operaciones de tareas y respuestas.

---

## Planes y Precios

### P: ¿Puedo usarlo gratis?

**R:** Sí, el **plan Free** permite usar las funciones básicas sin costo.

| Plan | Ideal para | Mensual | Compilación en nube | Función de Clases |
|------|-----------|:-------:|:-------------------:|:-----------------:|
| **Free** | Prueba / Compilación Local | ¥0 | 50/mes | — |
| **Lite** | Aficionados individuales | — | 250/mes | — |
| **Pro** | Desarrolladores / Makers | — | 500/mes | — |
| **Enterprise** | Instituciones educativas / Equipos | — | Ilimitada | ✓ |

Para precios actuales, consulta la [página de planes](/plan).

### P: ¿Cómo cambio mi plan?

**R:** Ve al menú de cuenta (arriba a la derecha) → "Plan y Facturación". Puedes cambiar de plan, actualizar información de facturación o cancelar a través del Portal de Clientes de Stripe.

### P: ¿Qué es una Cuenta Invitada?

**R:** Una cuenta a la que Fablab Nishiharima ha otorgado permisos de nivel Enterprise. No necesitas suscribirte a un plan por tu cuenta. Sin embargo, también puedes suscribirte a un plan superior por tu cuenta (en ese caso, los permisos de invitado son eliminados).

### P: ¿Hay licencias para instituciones educativas?

**R:** El **plan Enterprise** proporciona funciones de gestión de clases para instituciones educativas. Para licencias en volumen o acuerdos especiales, contacta con [Fablab Nishiharima](https://fablab-westharima.com/).

### P: ¿El uso del Servidor de Compilación Local consume cuota de compilación en la nube?

**R:** No, usar el Servidor de Compilación Local no consume cuota de compilación en la nube. Ideal para compilaciones ilimitadas y de alta velocidad en planes Pro / Enterprise. → [Servidor de Compilación Local](./local-compile-server.md)

---

## Otros

### P: ¿Qué navegadores son compatibles?

**R:**

| Navegador | Soporte | Notas |
|-----------|---------|-------|
| Chrome | ✓ Recomendado | Web Serial / Web Bluetooth compatible |
| Edge | ✓ | Web Serial / Web Bluetooth compatible |
| Firefox | △ | Carga USB / BLE no compatible |
| Safari | △ | Carga USB / BLE no compatible |

Usa Chrome o Edge para carga USB / BLE.

### P: ¿Puedo usarlo en un smartphone?

**R:** El editor de bloques funciona en smartphones, pero la carga USB no está disponible. La carga WiFi OTA es posible desde un smartphone.

### P: ¿Puedo usarlo sin conexión?

**R:** Actualmente se requiere conexión a internet. Con el Servidor de Compilación Local, la compilación en sí puede ejecutarse sin conexión.

### P: Encontré un error

**R:** Por favor repórtalo en [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues) con la siguiente información:

- Navegador y versión
- Sistema operativo
- Plan en uso
- Pasos para reproducir el error
- Mensaje de error (si lo hay)

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md)
- [Referencia de Bloques](./block-reference.md)
- [Guía de Conexión de Hardware](./hardware-setup.md)
- [Solución de Problemas](./troubleshooting.md)
