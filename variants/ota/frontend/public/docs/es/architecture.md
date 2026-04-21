# Visión General de la Arquitectura de DigiCode

**Última actualización:** 2026-04-21

Explica la configuración general del sistema y el stack tecnológico de DigiCode.

## Configuración del Sistema

| Componente | Tecnología | Despliegue |
|------------|------------|------------|
| **Frontend** | React 19 + Blockly | Cloudflare Pages |
| **API Backend** | Hono + Cloudflare Workers | Cloudflare Workers |
| **Servidor de Clases** | Hono + better-sqlite3 | HPE ML30 (`class.digital-fab.jp`) |
| **Servidor de Compilación** | Node.js + Arduino CLI | HPE ML30 / Railway |
| **Base de Datos** | Cloudflare D1 (SQLite) | Cloudflare |
| **Almacenamiento de Archivos** | Cloudflare R2 | Cloudflare (bucket configurado, sin uso actual) |
| **Pagos** | Stripe Billing | Stripe (en producción) |

---

## Stack Tecnológico

### Frontend

- **Framework:** React 19 + TypeScript
- **Herramienta de build:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **Editor de bloques:** Blockly 10.4
- **Gestión de estado:** Zustand
- **Enrutamiento:** React Router 7
- **Carga a dispositivo:** esp-web-tools, esptool-js
- **Internacionalización:** i18next (5 idiomas: japonés / inglés / español / portugués / chino tradicional)

### API Backend

- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Base de datos:** Cloudflare D1 (users, classes, class_members, compile_usage, subscriptions, etc.)
- **Autenticación:** JWT
- **Pagos:** Stripe Billing (Fase D-1, en producción desde 2026-04-18)

### Servidor de Clases (independiente)

- **Repositorio:** `fablab-westharima/digicode-class-server` (privado)
- **Runtime:** Node.js + Hono + better-sqlite3
- **Función:** Gestión de tareas (assignments) y respuestas (submissions). XML de Blockly de gran tamaño almacenado en SQLite en lugar de D1
- **Despliegue:** HPE ML30 (`https://class.digital-fab.jp`)

### Servidor de Compilación

- **Repositorio:** `fablab-westharima/arduino-compile-server` (público)
- **Runtime:** Node.js + Express
- **Compilador:** Arduino CLI 1.3.1
- **Plataforma objetivo:** ESP32 Arduino Core 3.3.4
- **Despliegue:** HPE ML30 (compilación en la nube) / Railway (respaldo)
- **Versión local:** Imagen Docker publicada (`ghcr.io/fablab-westharima/digicode-compile-server`)

### Firmware ESP32

- **Lenguaje:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **Bibliotecas:** DigiCodeHumanoid / DigiCodeTransform / DigiCodeWheel (implementación propia)

---

## Flujo de Datos

### Flujo de Carga de Programa (USB)

```
Editor de bloques → Servidor de compilación → Generación de binario → Web Serial API del navegador → ESP32
```

### Flujo de Carga de Programa (WiFi OTA)

```
Editor de bloques → Servidor de compilación → Generación de binario → HTTP POST al endpoint OTA del ESP32
```

### Flujo de la Función de Clases

```
Profesor: Navegador → API Backend (D1) → Servidor de clases (ML30 SQLite)
Alumno: Navegador → API Backend → Obtener tarea / enviar respuesta → Servidor de clases
```

---

## Estructura de Directorios

### Frontend

```
variants/ota/frontend/
├── public/
│   ├── firmware/         # Binarios de firmware
│   └── docs/             # Documentación (5 idiomas)
├── src/
│   ├── blocks/           # Definiciones de bloques Blockly (arduino/ + common/)
│   ├── components/       # Componentes React
│   │   ├── editor/       # Editor / selector de modo
│   │   ├── serial/       # Monitor serial
│   │   ├── device/       # Gestión de dispositivos
│   │   ├── settings/     # Configuración / plan
│   │   └── ui/           # Componentes UI (shadcn)
│   ├── pages/            # Componentes de página
│   ├── services/         # Servicios API
│   ├── stores/           # Stores Zustand
│   ├── i18n/             # Internacionalización (5 idiomas)
│   └── data/             # Proyectos de ejemplo, etc.
```

### API Backend

```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # Punto de entrada
│   ├── routes/           # Rutas API
│   ├── middleware/       # Autenticación, etc.
│   └── db/               # Esquema D1
└── wrangler.toml         # Configuración Cloudflare Workers
```

---

## Seguridad

### Autenticación y Autorización
- Gestión de sesiones mediante tokens JWT
- Todas las solicitudes API incluyen token
- Restricción de funciones por plan (integración Stripe)

### CORS
- Se permiten solicitudes del frontend
- Se permiten solicitudes de dispositivos ESP32 (para OTA)

### Protección de Datos
- Contraseñas almacenadas con hash
- HTTPS en producción
- Protección XSS (escape de React)

---

## Pruebas

- **Pruebas unitarias:** Entorno vitest configurado (implementación de pruebas pendiente)
- **Pruebas E2E:** No implementadas

---

## Escalabilidad

### Escalado Horizontal
- Cloudflare Workers: escalado automático
- Cloudflare D1: replicación automática
- Servidor de compilación: configuración dual ML30 + Railway

### Optimización de Rendimiento
- Frontend: builds rápidos con Vite y división de código
- Backend: entrega edge con Workers
- Base de datos: optimización de índices

---

## Referencias

- [Documentación de React](https://react.dev/)
- [Documentación de Blockly](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
