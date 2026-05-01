# Guía de Configuración OTA (Opcional)

**Última actualización:** 2026-04-21

> **Esta guía es opcional.** DigiCode funciona **solo con un cable USB**. Familiarízate primero con el flujo USB en [Primeros Pasos](./getting-started.md) y consulta esta guía cuando lo necesites.

> ⚠️ **Usuarios de Windows**: WiFi OTA es **avanzado** en Windows — requiere instalar Bonjour y configurar red / Firewall. Para usuarios principiantes de Windows recomendamos:
> - **Subida USB** (guiada por la GUI integrada de DigiCode, sin instalación adicional)
> - **Bluetooth (BLE) OTA** (sin cable USB, sin instalación adicional, apto para principiantes)
>
> Los usuarios Mac / Linux pueden probar WiFi OTA con más fluidez.

---

## ¿Qué es WiFi OTA?

WiFi OTA (Over-The-Air) permite cargar programas de forma inalámbrica vía WiFi. Una vez configurado, puedes actualizar programas sin cable USB.

### Ventajas

- Carga sin cable USB
- El método más rápido (~15 seg)
- Actualiza múltiples dispositivos simultáneamente
- Actualiza dispositivos dentro de carcasas

### Desventajas / Notas

- Requiere configuración inicial (carga de firmware + configuración WiFi)
- Requiere conexión WiFi
- PC y ESP32 deben estar en la misma red
- Requiere Bonjour/mDNS (instalación adicional en Windows)
- No es posible cargar durante cortes de WiFi o cambios de red

> **Recomendado para nivel intermedio+:** Los problemas con WiFi OTA pueden requerir recargar el firmware vía USB para recuperarse.

---

## Prerequisitos

1. **Placa ESP32** (compatible con WiFi OTA, supportsOta: true)
2. **Router WiFi** (una red a la que se pueda conectar el ESP32)
3. **DigiCode Finder** (recomendado)
   - https://github.com/fablab-westharima/DigiCode-Finder/releases

---

## Paso 1: Cargar el Firmware

Para usar WiFi OTA / BLE, necesitas cargar el **firmware** (software base OTA) una vez vía USB.

1. Conecta el ESP32 mediante cable USB
2. Haz clic en **"Carga de Firmware"** en el menú izquierdo
3. Haz clic en "INSTALL"
4. Selecciona el puerto serie
5. Espera a que se complete (~1 min)

> Una vez cargado, normalmente no es necesario recargar el firmware. Se requiere recarga después de un borrado completo del flash.

---

## Paso 2: Conectar el ESP32 a WiFi

1. Conecta el ESP32 vía USB (misma conexión que la carga de firmware)
2. Haz clic en **"Configuración WiFi"** en el menú izquierdo
3. Selecciona el puerto serie y haz clic en "Conectar"
4. En el diálogo de configuración WiFi, ingresa:
   - **SSID**: Nombre de tu red WiFi
   - **Contraseña**: Contraseña de tu WiFi
5. Haz clic en "Prueba de Conexión"
6. Después del éxito, se muestra la dirección IP fija

> Si la prueba de conexión falla, la configuración no se guarda. Verifica tu SSID y contraseña.

---

## Paso 3: Detectar Dispositivo con DigiCode Finder

### ¿Qué es DigiCode Finder?

Aplicación de escritorio que detecta automáticamente dispositivos DigiCode en tu red via mDNS (v1.4.1).

### Instalación

**Descarga:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| SO | Archivo |
|----|---------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

### Usuarios de Windows: Instalar Bonjour

Si los dispositivos no se detectan después de abrir DigiCode Finder, se necesita Bonjour.

1. En el menú de DigiCode Finder: "Help" → "Install Bonjour (Windows)"
2. Descarga Bonjour Print Services del sitio oficial de Apple
3. Instala y reinicia el PC

### Detección de Dispositivos

1. Abre DigiCode Finder
2. Los dispositivos DigiCode en la misma red se listan automáticamente
3. Se muestran nombre del dispositivo, dirección IP y versión de firmware

### Copiar Dirección IP

1. Haz clic en "Seleccionar" junto al dispositivo objetivo
2. La dirección IP se copia al portapapeles

### Seleccionar Múltiples Dispositivos

1. Marca múltiples dispositivos
2. Haz clic en "Seleccionar" (se copia JSON con múltiples IPs)

---

## Paso 4: Cargar via WiFi OTA

### Dispositivo Único

1. Crea tu programa en el editor de bloques
2. Haz clic en **"Cargar"** → **"WiFi OTA"**
3. Pega la dirección IP en el diálogo de selección de dispositivo
4. Haz clic en "Iniciar Carga" (~15 seg)

### Carga Masiva a Múltiples Dispositivos

1. Selecciona y copia múltiples dispositivos en DigiCode Finder
2. Haz clic en "Cargar" → "WiFi OTA"
3. Múltiples dispositivos aparecen en el diálogo
4. Marca los objetivos y haz clic en "Iniciar Carga Masiva"

---

## Carga BLE (Opcional)

Carga via Bluetooth Low Energy. Útil para lugares sin WiFi o actualizar dispositivos en carcasas.

### Ventajas / Desventajas del BLE

**Ventajas:**
- Sin WiFi necesario
- Sin cable
- Actualiza dispositivos en carcasas

**Desventajas:**
- Más lento que WiFi OTA (~40 seg)
- Requiere navegador compatible con Web Bluetooth
- Prerequisito: carga de firmware (igual que WiFi OTA)

### Prerequisitos

- Firmware cargado (igual que el Paso 1)
- Navegador compatible con Web Bluetooth (Chrome, Edge)

### Placas compatibles

Todas las placas ESP32 con BLE (supportsBle: true).

### Pasos

1. Crea tu programa
2. Haz clic en **"Cargar"** → **"BLE"**
3. Haz clic en "Buscar dispositivos"
4. Selecciona "DigiCode-XXXXXX" en el diálogo Bluetooth del navegador
5. Haz clic en "Emparejar"
6. La carga comienza (~40 seg)

### Solución de Problemas BLE

| Síntoma | Solución |
|---------|---------|
| Dispositivo no encontrado | Reinicia el ESP32, reinicia el navegador |
| Emparejamiento fallido | Acércate más, desconecta otras conexiones BLE |
| La carga se detiene a la mitad | Reinicia el ESP32 e intenta de nuevo |

---

## Configuración del Nombre del Dispositivo

Útil al gestionar múltiples dispositivos.

1. Abre "Configuración WiFi" vía USB
2. Ingresa el nuevo nombre en el campo "Nombre del Dispositivo"
3. Haz clic en "Guardar"

**Nomenclatura recomendada:**
```
DigiCode-[propósito]-[número]
Ej: DigiCode-robot-001, DigiCode-class-02
```

---

## Solución de Problemas

### Dispositivo No Detectado

| Causa | Solución |
|-------|---------|
| WiFi no conectado | Verifica la configuración WiFi vía USB |
| Red diferente | Asegúrate que el PC y ESP32 estén en la misma WiFi |
| Bonjour no instalado (Windows) | Instala Bonjour Print Services |
| Cortafuegos | Permite mDNS (puerto 5353) |

### La Carga se Detiene a la Mitad

| Causa | Solución |
|-------|---------|
| Señal WiFi débil | Acerca el ESP32 al router |
| Congestión de red | Pausa otras transferencias grandes |
| Tiempo de espera | Reinicia el ESP32 e intenta de nuevo |

### Dispositivo No Responde Después de Cargar

| Causa | Solución |
|-------|---------|
| Error en el programa | Recarga el firmware vía USB |
| Pérdida de configuración WiFi | Rehaz la configuración WiFi vía USB |

---

## Restablecer Configuración WiFi

Para restablecer la configuración WiFi:

1. Abre "Carga de Firmware"
2. Ejecuta "Borrar todo el flash (depuración)"
3. Recarga el firmware
4. Rehaz la configuración WiFi

---

## Notas de Seguridad

- Úsalo solo en entornos de red de confianza
- No se recomienda en WiFi público
- Considera VPN o redes aisladas para entornos de producción

---

## Documentos Relacionados

| Documento | Contenido |
|-----------|-----------|
| [Primeros Pasos](./getting-started.md) | Flujo básico USB |
| [Pasos Comunes](./01-program-setup-common.md) | Terminología, resumen de métodos |
| [Guía ESP32](./04-program-setup-esp32.md) | Configuración específica de ESP32 |
| [Solución de Problemas](./troubleshooting.md) | Guía de resolución de problemas |
