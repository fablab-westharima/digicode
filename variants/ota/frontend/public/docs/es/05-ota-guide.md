# Guía de Configuración OTA

**Última actualización:** 2025-12-28

---

## Introducción

La carga OTA (Over-The-Air) te permite subir programas al ESP32 vía WiFi. Actualiza programas de forma inalámbrica sin cable USB.

---

## Ventajas y Limitaciones

### Ventajas
- No se necesita cable USB (solo WiFi)
- Actualiza múltiples dispositivos simultáneamente
- Actualiza incluso si el dispositivo está en una caja

### Limitaciones
- El firmware debe cargarse primero vía USB
- Requiere entorno WiFi
- ESP32 y PC deben estar en la misma red

---

## Requisitos Previos

1. **Firmware cargado**
   - Carga inicial vía USB desde "Cargar Firmware" en el menú

2. **Router WiFi disponible**
   - Red WiFi a la que ESP32 puede conectarse

3. **DigiCode Finder (recomendado)**
   - App de escritorio para detección de dispositivos
   - https://github.com/fablab-westharima/DigiCode-Finder/releases

---

## Paso 1: Conectar ESP32 a WiFi

### Configuración WiFi vía USB

1. Conecta ESP32 al PC vía cable USB
2. Clic en "**Configuración WiFi**" en el menú lateral
3. Selecciona puerto serial y clic en "Conectar"
4. Ingresa en el diálogo de configuración WiFi:
   - **SSID**: Nombre de la red WiFi
   - **Contraseña**: Contraseña WiFi
5. Clic en "Probar Conexión"
6. Se mostrará una IP fija al tener éxito

---

## Paso 2: Detectar Dispositivos con DigiCode Finder

### ¿Qué es DigiCode Finder?

Una app de escritorio que detecta automáticamente dispositivos DigiCode en la red vía mDNS.

### Instalación

1. Ve a https://github.com/fablab-westharima/DigiCode-Finder/releases
2. Descarga el archivo para tu SO:
   - **Windows**: archivo `.exe`
   - **macOS**: archivo `.dmg`
   - **Linux**: archivo `.AppImage`
3. Instala e inicia

### Para Usuarios de Windows

**Se requiere instalación de Bonjour.**

Si no se detectan dispositivos después de iniciar DigiCode Finder:
1. Clic en menú "Ayuda" → "Instalar Bonjour (Windows)"
2. Descarga Bonjour Print Services del sitio oficial de Apple
3. Reinicia el PC después de la instalación

---

## Paso 3: Carga de Programa WiFi OTA

### Carga a Un Solo Dispositivo

1. Crea el programa en DigiCode (navegador)
2. Clic en botón "**Subir**"
3. Selecciona "**WiFi OTA**"
4. Aparece el diálogo de selección de dispositivo
5. Si copiaste desde DigiCode Finder, se muestra automáticamente
6. Selecciona dispositivo y clic en "Iniciar Carga"
7. Espera a que se complete la barra de progreso

---

## Solución de Problemas

### Dispositivo No Detectado

| Causa | Solución |
|-------|----------|
| WiFi no conectado | Verifica configuración WiFi vía USB |
| Red diferente | Verifica que PC y ESP32 estén en mismo WiFi |
| Bonjour no instalado (Windows) | Instala Bonjour Print Services |
| Firewall | Permite mDNS (puerto 5353) |

### La Carga Se Detiene a Mitad

| Causa | Solución |
|-------|----------|
| Señal WiFi débil | Acerca ESP32 al router |
| Congestión de red | Pausa otras transferencias grandes |
| Timeout | Reinicia ESP32 e intenta de nuevo |

---

## Documentos Relacionados

| Documento | Contenido |
|-----------|-----------|
| [Primeros Pasos](./getting-started.md) | Configuración inicial |
| [Pasos Comunes](./01-program-setup-common.md) | Terminología, procedimientos comunes |
| [Solución de Problemas](./troubleshooting.md) | Guía de resolución de problemas |
