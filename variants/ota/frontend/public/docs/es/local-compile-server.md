# Configuración del Servidor de Compilación Local

**Última actualización:** 2026-04-29

Puedes ejecutar un servidor de compilación en tu propio ordenador en lugar del servidor en la nube de DigiCode. La nube y el local utilizan **la misma imagen Docker**, por lo que los resultados de compilación son idénticos (sin lib drift).

---

## Casos de uso

- **Compilaciones ilimitadas** — no consume la cuota de la nube
- **Compilación rápida** — sin latencia de red, la caché persistente entrega ~1 ms en cache HIT y ~9,6 s en warm rebuild
- **Uso offline** — no se necesita Internet tras la descarga inicial

### Recomendación por plan

| Plan | Recomendación | Razón |
|------|:-------------:|-------|
| Free | — | La cuota en la nube (50/mes) suele ser suficiente |
| Lite | ▲ | A considerar si 250/mes no es suficiente |
| Pro | ◎ | Para uso intensivo que supera 500/mes |
| Enterprise | ◎ | Eficaz para compilación a nivel de toda la clase |

---

## ⚠️ Notas importantes

> **Aviso: tamaño de la imagen Docker**
>
> Imagen Docker del servidor de compilación local (basada en PlatformIO Core, v0.1.0):
>
> - **Descarga (comprimida): ~1 GB**
> - **Espacio en disco (descomprimida): ~3,8 GB**
>
> - **No descargues por tethering desde el móvil** — usa una conexión fija estable (fibra, etc.)
> - Tiempo estimado: ~1-2 min en fibra de 100 Mbps

---

## Requisitos

Necesitas un entorno con Docker. Elige una de las siguientes opciones.

### Opción A: Docker Desktop (Estándar)

- Compatible con **Windows / Mac / Linux**
- **Gratuito para uso personal**; los planes de pago son necesarios para uso comercial
- https://www.docker.com/products/docker-desktop/

### Opción B: Alternativas a Docker Desktop (ligeras / OSS)

Para uso comercial o si prefieres una solución más ligera:

| Herramienta | SO | Características |
|-------------|----|-----------------|
| **OrbStack** | macOS | Ligero, rápido, bajo consumo de memoria, nativo en Apple Silicon |
| **Rancher Desktop** | Windows / macOS / Linux | OSS (gratuito) |
| **Podman Desktop** | Windows / macOS / Linux | OSS, sin daemon |

### Opción C: Docker Engine directamente (Linux)

En Linux puedes instalar Docker Engine directamente sin Docker Desktop.

---

## Paso 1: Instalar el entorno Docker

### Windows

1. Descarga Docker Desktop for Windows desde https://www.docker.com/products/docker-desktop/
2. Ejecuta el instalador (se requiere WSL2; el instalador te guía)
3. Reinicia el PC tras la instalación

### Mac (Intel)

1. Descarga Docker Desktop for Mac (Intel) desde https://www.docker.com/products/docker-desktop/
2. Abre el `.dmg` y arrástralo a Aplicaciones
3. Inicia "Docker" desde Aplicaciones

### Mac (Apple Silicon: M1/M2/M3/M4)

**Recomendado: OrbStack**

Docker Desktop for Mac (Apple Silicon) funciona, pero OrbStack es más rápido y consume menos memoria.

1. Descarga OrbStack desde https://orbstack.dev/
2. Tras instalar, el comando `docker` está disponible inmediatamente

Si usas Docker Desktop, instala la versión Apple Silicon (`.dmg`).

> El core de ESP32 soporta arm64 de forma nativa, por lo que la emulación x86 no es necesaria en uso normal.

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Cierra sesión y vuelve a iniciarla para aplicar el cambio de grupo
```

### Verificar la instalación

```bash
docker --version
```

Si ves `Docker version 20.x.x`, todo está listo.

---

## Paso 2: Descargar e iniciar el servidor de compilación

### Método A: arranque de una línea

```bash
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

La primera ejecución descarga ~1 GB (3,8 GB descomprimidos). **Usa una conexión fija.**

### Método B: docker-compose.yml (recomendado, con caché persistente)

Crea un archivo `docker-compose.yml` en cualquier carpeta:

```yaml
services:
  digicode-compile-api:
    image: ghcr.io/fablab-westharima/digicode-compile-api:latest
    container_name: digicode-compile-api
    ports:
      - "3001:3001"
    restart: unless-stopped
    volumes:
      - digicode-projects:/opt/digicode-compile/projects
      - digicode-cache:/opt/digicode-compile/cache

volumes:
  digicode-projects:
  digicode-cache:
```

Después, en esa carpeta:

```bash
docker compose up -d
```

> `digicode-projects` y `digicode-cache` son volúmenes con nombre que persisten el estado de compilación. **Una segunda compilación con código idéntico tarda ~1 ms (cache HIT)**, y un cambio de 1 byte completa el warm rebuild en ~9,6 s. Con volúmenes efímeros (`docker run` sin `-v`), la caché se pierde al eliminar el contenedor.

---

## Paso 3: Verificar

```bash
curl http://localhost:3001/health
```

Si ves lo siguiente, está funcionando (comprueba `service` y `version`):

```json
{
  "status": "ok",
  "service": "digicode-compile-api",
  "version": "0.1.0",
  "timestamp": "..."
}
```

También puedes visitar `http://localhost:3001/health` en el navegador.

---

## Paso 4: Configurar DigiCode

1. Abre DigiCode
2. Pulsa ▼ junto al botón **"Subir"**
3. Selecciona **"Servidor local"**
4. Ejecuta una compilación para verificar

La primera compilación (cold) tarda ~30-60 s — PlatformIO + framework + librerías están dentro de la imagen, por lo que el resultado coincide byte a byte con la nube (ML30).

---

## Migración desde la imagen anterior (usuarios existentes, 1 paso)

Hasta 2026-04 distribuíamos `ghcr.io/fablab-westharima/digicode-compile-server` (basado en arduino-cli). La migración a la nueva `digicode-compile-api` (basada en PlatformIO Core) consiste **solo en cambiar el nombre de la imagen**.

```bash
# Detener y eliminar la imagen anterior
docker stop digicode-compiler 2>/dev/null
docker rm digicode-compiler 2>/dev/null
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest 2>/dev/null

# Iniciar la nueva imagen
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

**Cambios:**

- Nombre de la imagen: `digicode-compile-server` → `digicode-compile-api`
- Nombre del contenedor: `digicode-compiler` → `digicode-compile-api` (opcional)
- Puerto: 3001 sin cambios
- Configuración de DigiCode (URL `http://localhost:3001`): sin cambios
- Contrato API: compatible — solo cambian los campos `service` / `version` en `/health`

El repositorio anterior [fablab-westharima/arduino-compile-server](https://github.com/fablab-westharima/arduino-compile-server) fue archivado el 2026-04-29. Las correcciones de librerías hechas en la nube (QTRSensors / MFRC522 I2C / NewPing v1.9, etc.) solo están en la nueva imagen, por lo que se recomienda migrar.

---

## Operaciones del servidor

```bash
# Detener
docker stop digicode-compile-api

# Reiniciar
docker start digicode-compile-api

# Ver logs
docker logs digicode-compile-api

# Eliminar por completo
docker rm -f digicode-compile-api
docker rmi ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## Actualizaciones

Cuando se publica una nueva versión:

```bash
# docker-compose
docker compose pull
docker compose up -d
```

```bash
# docker run
docker stop digicode-compile-api
docker rm digicode-compile-api
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## Solución de problemas

### Puerto 3001 en uso

Si otra aplicación usa el puerto 3001:

```bash
# Usa el puerto 3002
docker run -d -p 3002:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

Cambia la URL del servidor a `http://localhost:3002` en la configuración de DigiCode.

### Docker no inicia (Windows)

- Comprueba que WSL2 está instalado
- Verifica que la virtualización está activada en la BIOS/UEFI
- Reinicia el PC

### Docker no inicia (Mac)

- Permite Docker en Configuración del Sistema > Privacidad y Seguridad
- Reinicia el Mac

### Errores de compilación en Apple Silicon

- Comprueba que usas OrbStack o Docker Desktop para Apple Silicon
- Confirma que la emulación x86 no es necesaria (el core de ESP32 es arm64 nativo)

### Error de compilación

```bash
# Reinicia el contenedor
docker restart digicode-compile-api

# Si sigue fallando, recréalo
docker rm -f digicode-compile-api
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

### La caché no hace HIT (el mismo código provoca warm rebuild)

Revisa la sección `volumes` de tu `docker-compose.yml`. Los volúmenes con nombre `digicode-projects` y `digicode-cache` deben mantenerse.

---

## Ventajas y desventajas

| Aspecto | Contenido |
|---------|-----------|
| ✅ Compilaciones | **Ilimitadas** (no consume cuota de la nube) |
| ✅ Velocidad | cache HIT ~1 ms / warm rebuild ~9,6 s / cold ~30-60 s |
| ✅ Offline | Sin Internet tras la descarga inicial (framework + librerías en la imagen) |
| ✅ Igual que la nube | Misma imagen que la nube (ML30) — la salida binaria coincide físicamente (sin lib drift) |
| ⚠️ Descarga inicial | ~1 GB comprimido, ~3,8 GB descomprimido |
| ⚠️ Instalación | Se necesita instalar Docker |
| ⚠️ Recursos | Usa memoria y CPU del PC (mínimo 4 GB de RAM recomendados) |

---

## Documentos relacionados

- [Primeros pasos](./getting-started.md) — Uso básico
- [Solución de problemas](./troubleshooting.md) — Problemas y soluciones comunes
