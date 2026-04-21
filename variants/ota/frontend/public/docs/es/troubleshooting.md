# Solución de Problemas

**Última actualización:** 2026-04-21

Problemas comunes y soluciones para DigiCode.

---

## Problemas de Carga de Programa

### ESP32 No Reconocido

**Síntoma:** El ESP32 no aparece en el diálogo de selección de puerto serial

**Soluciones:**

1. Verifica que el cable USB sea **compatible con transferencia de datos** (los cables solo de carga no funcionan)
2. Instala el driver USB para ESP32
   - **CP2102**: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   - **CH340**: http://www.wch.cn/downloads/CH341SER_ZIP.html
3. Prueba un puerto USB diferente
4. Desconecta y vuelve a conectar el cable USB del ESP32
5. Cambia el navegador a Chrome / Edge (se requiere Web Serial API)

### Error Durante la Carga

**Síntoma:** Se muestra un error como "Failed to connect"

**Soluciones:**

1. Mantén presionado el botón **BOOT** del ESP32 al iniciar la carga
2. Mantén presionado el botón BOOT durante la carga
3. Verifica que ninguna otra aplicación esté usando el puerto (p. ej., monitor serial)
4. Reinicia el navegador y vuelve a intentarlo

### Cuota de Compilación Agotada

**Síntoma:** Se muestra el mensaje "Límite de compilación mensual alcanzado"

**Soluciones:**

1. Espera al mes siguiente
2. Actualiza a un plan superior (Lite / Pro / Enterprise)
3. Usa el [Servidor de Compilación Local](./local-compile-server.md) — no consume cuota en la nube

---

## Problemas de WiFi OTA

### Dispositivo No Encontrado por WiFi OTA

**Síntoma:** El dispositivo no es detectado por DigiCode Finder

**Soluciones:**

1. Confirma que el ESP32 y el PC estén en la **misma red WiFi**
2. Confirma que **Bonjour Print Services** (solo Windows) esté instalado
3. Verifica que el firewall no esté bloqueando mDNS (puerto 5353)
4. Comprueba en el monitor serial que la conexión WiFi fue exitosa y la dirección IP
5. Reinicia el ESP32 (botón RESET)

### La Actualización OTA Se Detiene a Mitad

**Síntoma:** La actualización se detiene alrededor del 20%

**Soluciones:**

1. La señal WiFi puede ser débil → acerca el ESP32 al router
2. Reinicia el ESP32 y vuelve a intentarlo
3. Vuelve a cargar el firmware por USB y luego reintenta WiFi OTA

### Dispositivo Sin Respuesta Tras Carga WiFi OTA

**Síntoma:** La carga fue exitosa, pero el programa no se ejecuta

**Soluciones:**

1. Vuelve a cargar el firmware por USB
2. "Borrar memoria flash completa (depuración)" → Carga de Firmware → Configuración WiFi

---

## Problemas de BLE

### Dispositivo BLE No Encontrado

**Síntoma:** Al presionar "Buscar Dispositivos" no aparece ningún dispositivo

**Soluciones:**

1. **Compatibilidad del navegador** — Confirma que estás usando Chrome / Edge (se requiere Web Bluetooth)
2. **Compatibilidad de placa** — ESP32-S2 no soporta BLE; RP2040 Pico W tampoco soporta BLE
3. Reinicia el ESP32
4. Reinicia el navegador

### El Emparejamiento BLE Falla

**Síntoma:** El dispositivo es encontrado pero el emparejamiento falla

**Soluciones:**

1. Coloca el ESP32 cerca del ordenador
2. Desconecta temporalmente otros dispositivos BLE (ratón, teclado, etc.)
3. Reinicia el ESP32 y vuelve a intentarlo

### Nombre Antiguo del Dispositivo en macOS

**Síntoma:** Tras cambiar el nombre del dispositivo, el navegador de macOS sigue mostrando el nombre antiguo

**Solución:** Este es un problema a nivel de OS causado por la caché BLE de macOS y no puede corregirse desde DigiCode. Funciona correctamente en Windows; los usuarios de Mac pueden verse afectados.

---

## Problemas de Ejecución del Programa

### El Programa No Se Ejecuta

**Síntoma:** La carga fue exitosa, pero el programa no funciona

**Soluciones:**

1. Presiona el botón RESET del ESP32 para reiniciarlo
2. Revisa los mensajes de error en el monitor serial
3. Verifica que los números de pin sean correctos (los pines disponibles varían según la placa)
4. Revisa el cableado de sensores / motores

### El LED No Parpadea

**Síntoma:** Se cargó un programa de parpadeo de LED, pero el LED no parpadea

**Soluciones:**

1. **Para GPIO2 (LED integrado)**:
   - Algunas placas no tienen LED integrado
   - Intenta conectar un LED externo
2. **Para LED externo**:
   - Verifica la polaridad (+/−)
   - Conecta una resistencia (330Ω–1kΩ) en serie
   - Verifica el número de pin

---

## Problemas de Función de Clases

### No Puedo Unirme a la Clase por URL de Invitación

**Síntoma:** Abrir la URL de invitación no permite unirse a la clase

**Soluciones:**

1. Confirma que has iniciado sesión en DigiCode (si no, inicia sesión y abre la URL de nuevo)
2. Verifica si la URL de invitación ha expirado (consulta al profesor)
3. Verifica si otra cuenta ya ha usado esta URL de invitación

### Las Tareas No Se Muestran

**Síntoma:** Estás unido a la clase pero las tareas no aparecen

**Soluciones:**

1. Recarga la página
2. Verifica el estado del servidor de clases (`class.digital-fab.jp`)
3. Consulta al profesor si la tarea ha sido distribuida

### No Puedo Enviar la Respuesta

**Síntoma:** Error al presionar el botón de envío de respuesta

**Soluciones:**

1. Verifica la conexión de red
2. El servidor de clases puede estar temporalmente caído → espera y vuelve a intentarlo
3. Verifica si el XML de Blockly es inusualmente grande (normalmente no es un problema)

---

## Problemas de Planes y Facturación

### No Puedo Cambiar el Plan

**Síntoma:** El Portal de Clientes de Stripe no abre o aparece un error

**Soluciones:**

1. Verifica que el bloqueador de ventanas emergentes no esté activo
2. Verifica que las cookies del navegador estén habilitadas
3. Comprueba el estado del servidor de Stripe

### Me Suscribí a un Plan Teniendo una Cuenta Invitada

**Síntoma:** Tenía permisos de nivel Enterprise de Fablab Nishiharima pero me suscribí a Pro por mi cuenta

**Solución:** Al suscribirte por tu cuenta, los permisos de invitado son **eliminados**. A partir de entonces se aplica tu plan contratado. Revisa el diálogo de confirmación cuidadosamente antes de suscribirte.

---

## Problemas del Navegador

### El Editor Blockly No Se Muestra

**Síntoma:** La página del editor está en blanco o los bloques no se muestran

**Soluciones:**

1. Limpia la caché del navegador
2. Actualiza el navegador a la última versión
3. Prueba con otro navegador (Chrome, Edge)
4. Confirma que JavaScript está habilitado

### Se Muestra un Error de Compilación

**Síntoma:** Aparece un diálogo de "Error de Compilación"

**Soluciones:**

1. Revisa el mensaje de error
2. Confirma que las conexiones de bloques son correctas
3. Confirma que todos los parámetros requeridos están ingresados
4. Prueba con un proyecto de ejemplo para aislar el problema

---

## Otros

### El Proyecto No Se Puede Guardar

**Síntoma:** Se produce un error al presionar el botón de guardar

**Soluciones:**

1. Confirma que has iniciado sesión (los invitados solo pueden guardar localmente)
2. Verifica la conexión a internet
3. Confirma que el almacenamiento local del navegador está habilitado
4. Reinicia el navegador

### No Se Puede Cargar el Proyecto de Ejemplo

**Síntoma:** Al seleccionar un ejemplo no se refleja en el editor

**Soluciones:**

1. Recarga la página
2. Cierra sesión y vuelve a iniciarla
3. Prueba con otro ejemplo

---

## Soporte

Si nada de lo anterior resuelve tu problema, repórtalo en [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues) con la siguiente información:

- Navegador y versión
- Sistema operativo
- Plan en uso
- Nombre de la placa ESP32
- Método de carga (USB / WiFi OTA / BLE)
- Captura de pantalla del mensaje de error
- Pasos para reproducir el problema
