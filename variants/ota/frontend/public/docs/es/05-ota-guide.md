# Guía de Configuración OTA (Opcional)

**Última actualización:** 2026-05-02

> **Esta guía es opcional.** DigiCode funciona **solo con un cable USB**. Familiarízate primero con el flujo USB en [Primeros Pasos](./getting-started.md) y consulta esta guía cuando lo necesites.

---

## 🚀 4 Pasos para OTA Funcionando

Visión general para habilitar WiFi OTA. Configuración inicial ~10 min.

1. **Carga de firmware** (vía USB, ~1 min) → [detalles](#paso-1-cargar-el-firmware)
2. **Configuración WiFi** (vía USB, ingresar SSID + contraseña, ~1 min) → [detalles](#paso-2-conectar-el-esp32-a-wifi)
3. **Detección de dispositivo** (Mac / Linux mDNS nativo / Windows necesita Bonjour o DigiCode Finder) → [detalles](#paso-3-detectar-el-dispositivo)
4. **Carga vía WiFi OTA** (~15 seg, sin cable después) → [detalles](#paso-4-cargar-via-wifi-ota)

> 💡 **Sin WiFi disponible / configuración WiFi muy molesta** → recomendamos **[Carga BLE](#carga-ble-opcional)** (carga FW una vez, sin configuración WiFi).

---

## ⚠️ Nota para Usuarios de Windows

WiFi OTA es **avanzado** en Windows — requiere instalar Bonjour y configurar red / Firewall. Para usuarios principiantes de Windows recomendamos:

- **Subida USB** (guiada por la GUI integrada de DigiCode, sin instalación adicional)
- **Bluetooth (BLE) OTA** (sin cable USB, sin instalación adicional, apto para principiantes)

Los usuarios Mac / Linux pueden probar WiFi OTA con más fluidez.

---

## ¿Qué es WiFi OTA — Pros y Contras

WiFi OTA (Over-The-Air) permite cargar programas de forma inalámbrica vía WiFi. Una vez configurado, puedes actualizar programas sin cable USB.

| Aspecto | Veredicto |
|---|---|
| ✅ Sin cable | No hay que conectar/desconectar USB cada vez |
| ✅ Más rápido (~15 seg) | Más rápido que USB (~30 seg) |
| ✅ Actualización masiva | Eficaz para actualizar toda una clase |
| ✅ Dispositivos en carcasa OK | Actualizar productos terminados |
| ❌ Requiere configuración inicial | Carga FW + configuración WiFi (~10 min) |
| ❌ Requiere WiFi | PC y ESP32 deben estar en la misma LAN |
| ❌ Requiere Bonjour / mDNS | Instalación extra en Windows |
| ❌ Recuperación requiere USB | Rehacer configuración WiFi vía USB si se pierde |

> **Recomendado para nivel intermedio+**: Los problemas con WiFi OTA pueden requerir recargar el firmware vía USB para recuperarse.

---

## Prerequisitos

1. **Placa ESP32** (compatible con WiFi OTA, `supportsOta: true`)
2. **Router WiFi** (una red a la que se pueda conectar el ESP32, misma LAN que el PC)
3. **Herramienta de detección de dispositivo** (depende del entorno, ver abajo)

---

## Paso 1: Cargar el Firmware

Para usar WiFi OTA / BLE, necesitas cargar el **firmware** (receptor OTA) una vez vía USB.

1. Conecta el ESP32 mediante cable USB
2. Haz clic en **"Carga de Firmware"** en el menú izquierdo
3. Haz clic en **"INSTALL"**
4. Selecciona el puerto serie
5. Espera a que se complete (~1 min)

> 💡 Una vez cargado, normalmente no es necesario recargar el firmware. Se requiere recarga después de un borrado completo del flash.

---

## Paso 2: Conectar el ESP32 a WiFi

1. Conecta el ESP32 vía USB (misma conexión que la carga de firmware)
2. Haz clic en **"Configuración WiFi"** en el menú izquierdo
3. Selecciona el puerto serie y haz clic en **"Conectar"**
4. En el diálogo de configuración WiFi, ingresa:
   - **SSID**: Nombre de tu red WiFi
   - **Contraseña**: Contraseña de tu WiFi
5. Haz clic en **"Prueba de Conexión"**
6. Después del éxito, se muestra la dirección IP fija

> ⚠️ Si la prueba de conexión falla, la configuración no se guarda. Verifica tu SSID y contraseña.

---

## Paso 3: Detectar el Dispositivo

Mecanismo para que el PC obtenga la dirección IP del ESP32. El mecanismo necesario depende del SO.

### Mac / Linux

Soporte mDNS nativo, **sin instalación extra**. El diálogo WiFi OTA de DigiCode auto-detecta dispositivos.

### Windows (2 opciones)

#### A. Instalar Bonjour (recomendado)

Windows no tiene mDNS integrado, así que instala Bonjour Print Services de Apple:

1. Descarga `BonjourPSSetup.exe` de https://support.apple.com/en-us/106380
2. Instala → reinicia el PC
3. La detección mDNS estándar de DigiCode ahora funciona

#### B. DigiCode Finder (cuando no se puede instalar Bonjour / entorno restringido)

[DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder/releases) es una aplicación de escritorio que sirve como alternativa mDNS para Windows sin Bonjour.

| SO | Archivo de descarga |
|---|---|
| Windows | `.exe` |
| (Existen versiones Mac / Linux pero el mDNS nativo es suficiente) | `.dmg` / `.AppImage` |

**Uso**:
1. Abre DigiCode Finder
2. Los dispositivos DigiCode en la misma red se detectan automáticamente
3. Se muestran nombre del dispositivo, dirección IP y versión de firmware
4. Haz clic en **"Seleccionar"** junto al dispositivo objetivo → la IP se copia al portapapeles
5. Para múltiples dispositivos, márcalos y haz clic en **"Seleccionar"** → se copia JSON con múltiples IPs

---

## Paso 4: Cargar vía WiFi OTA

### Dispositivo Único

1. Construye tu programa en el editor de bloques
2. **"Cargar"** → **"WiFi OTA"**
3. En el diálogo de selección de dispositivo:
   - La auto-detección mDNS funciona → elige de la lista
   - De lo contrario → ingresa la dirección IP (pega el valor copiado de DigiCode Finder)
4. Haz clic en **"Iniciar Carga"** (~15 seg)

### Carga Masiva a Múltiples Dispositivos

1. Selecciona múltiples dispositivos en DigiCode Finder y copia como JSON
2. **"Cargar"** → **"WiFi OTA"**
3. Múltiples dispositivos aparecen en el diálogo
4. Marca los objetivos y haz clic en **"Iniciar Carga Masiva"**

Útil para actualizaciones únicas de toda una clase.

---

## Carga BLE (Opcional)

Carga vía Bluetooth Low Energy. Útil para lugares sin WiFi, dispositivos en carcasas y como alternativa para principiantes en Windows.

### Pros y Contras del BLE

| Aspecto | Veredicto |
|---|---|
| ✅ Sin WiFi necesario | No se requiere router ni configuración WiFi |
| ✅ Sin cable | Sin conexión USB cada vez |
| ✅ Sin instalación extra en Windows | Web Bluetooth está integrado en Chrome / Edge |
| ✅ Dispositivos en carcasa OK | Actualizar productos terminados |
| ❌ Más lento que WiFi OTA (~40 seg) | Más lento que USB / WiFi OTA |
| ❌ Carga FW necesaria | Primera vez vía USB necesario (igual que WiFi OTA) |
| ❌ Límite de distancia de emparejamiento | Necesita estar a unos pocos metros |

### Prerequisitos

- Firmware cargado (igual que el [Paso 1](#paso-1-cargar-el-firmware))
- Navegador compatible con Web Bluetooth (Chrome / Edge)
- Placas compatibles: ESP32 con BLE (`supportsBle: true`)

### Pasos

1. Construye tu programa en el editor de bloques
2. **"Cargar"** → **"BLE"**
3. Haz clic en **"Buscar dispositivos"**
4. Selecciona **"DigiCode-XXXXXX"** en el diálogo Bluetooth del navegador
5. Haz clic en **"Emparejar"**
6. La carga comienza (~40 seg)

### Solución de Problemas BLE

| Síntoma | Solución |
|---|---|
| Dispositivo no encontrado | Reinicia el ESP32, reinicia el navegador |
| Emparejamiento fallido | Acércate más, desconecta otras conexiones BLE |
| La carga se detiene a la mitad | Reinicia el ESP32 e intenta de nuevo |

---

## Detalles y Operaciones

### Configuración del Nombre del Dispositivo

Útil al gestionar múltiples dispositivos.

1. Abre **"Configuración WiFi"** vía USB
2. Ingresa el nuevo nombre en el campo **"Nombre del Dispositivo"**
3. Haz clic en **"Guardar"**

**Nomenclatura recomendada:**
```
DigiCode-[propósito]-[número]
Ej: DigiCode-robot-001, DigiCode-class-02
```

### Restablecer Configuración WiFi

Para restablecer la configuración WiFi:

1. Abre **"Carga de Firmware"**
2. Ejecuta **"Borrar todo el flash (depuración)"**
3. Recarga el firmware
4. Rehaz la configuración WiFi

### Notas de Seguridad

- Úsalo solo en entornos de red de confianza
- No se recomienda en WiFi público
- Considera VPN o redes aisladas para entornos de producción

---

## Solución de Problemas

### Dispositivo No Detectado

| Causa | Solución |
|---|---|
| WiFi no conectado | Verifica la configuración WiFi vía USB |
| Red diferente | Asegúrate que el PC y ESP32 estén en la misma WiFi |
| Bonjour no instalado (Windows) | Instala Bonjour Print Services o usa DigiCode Finder |
| Cortafuegos | Permite mDNS (puerto 5353) |

### La Carga se Detiene a la Mitad

| Causa | Solución |
|---|---|
| Señal WiFi débil | Acerca el ESP32 al router |
| Congestión de red | Pausa otras transferencias grandes |
| Tiempo de espera | Reinicia el ESP32 e intenta de nuevo |

### Dispositivo No Responde Después de Cargar

| Causa | Solución |
|---|---|
| Error en el programa | Recarga el firmware vía USB |
| Pérdida de configuración WiFi | Rehaz la configuración WiFi vía USB |

Para más, consulta [Solución de Problemas](./troubleshooting.md).

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md) — Flujo básico USB
- [Pasos Comunes](./01-program-setup-common.md) — Terminología, resumen de métodos
- [Guía ESP32](./04-program-setup-esp32.md) — Configuración específica de ESP32
- [Solución de Problemas](./troubleshooting.md) — Guía de resolución de problemas
- [DigiCode Finder GitHub](https://github.com/fablab-westharima/DigiCode-Finder) — Alternativa mDNS para Windows
