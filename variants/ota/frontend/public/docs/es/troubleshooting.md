# Solución de Problemas

Problemas comunes y soluciones para DigiCode.

## Problemas de Carga de Firmware

### ESP32 No Reconocido

**Síntoma:** Nada se muestra en la lista de puertos seriales

**Soluciones:**
1. Verifica que el cable USB sea **compatible con datos** (los cables solo de carga no funcionan)
2. Instala drivers USB para ESP32
   - Driver CP2102: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   - Driver CH340: http://www.wch.cn/downloads/CH341SER_ZIP.html
3. Prueba un puerto USB diferente
4. Desconecta y reconecta el cable USB

### Error Durante la Carga

**Síntoma:** Se muestra error como "Failed to connect"

**Soluciones:**
1. Mantén presionado el botón **BOOT** del ESP32 al iniciar la carga
2. Mantén presionado el botón BOOT durante la carga
3. Verifica que ninguna otra app esté usando el puerto
4. Reinicia el navegador e intenta de nuevo

## Problemas de Operación del Programa

### El Programa No Funciona

**Síntoma:** La carga fue exitosa pero el programa no funciona

**Soluciones:**
1. Presiona el botón RESET del ESP32 para reiniciar
2. Verifica mensajes de error en el monitor serial
3. Verifica que los números de pin sean correctos
4. Revisa el cableado de sensores/motores

## Problemas de WiFi OTA

### Actualización WiFi OTA Falla

**Síntoma:** Dispositivo no encontrado en escaneo, o no puede conectar

**Soluciones:**
1. Verifica que ESP32 y PC estén en la **misma red WiFi**
2. Verifica que el firewall no esté bloqueando mDNS (puerto 5353)
3. Verifica conexión WiFi exitosa en el monitor serial del ESP32
4. Reinicia ESP32 (botón RESET)

### Actualización OTA Se Detiene a Mitad

**Síntoma:** La actualización se detiene alrededor del 20%

**Soluciones:**
1. Señal WiFi débil → Acerca ESP32 al router
2. Reinicia ESP32 e intenta de nuevo
3. Carga primero vía USB, luego intenta WiFi OTA de nuevo

## Problemas del Navegador

### Editor Blockly No Se Muestra

**Síntoma:** La página del editor está en blanco o los bloques no aparecen

**Soluciones:**
1. Limpia la caché del navegador
2. Actualiza el navegador a la última versión
3. Prueba un navegador diferente (Chrome, Edge, Safari)
4. Verifica que JavaScript esté habilitado

## Soporte

Si lo anterior no resuelve tu problema, reporta en GitHub Issues con:

- Navegador y versión
- Nombre de placa ESP32 (ej., ESP32-DevKitC)
- Captura de pantalla del mensaje de error
- Pasos para reproducir

**GitHub Issues:** https://github.com/fablab-westharima/DigiCode/issues
