# Configuración del Servidor de Compilación Local

**Última actualización:** 2026-04-21

Puedes ejecutar un servidor de compilación en tu propia computadora en lugar del servidor en la nube de DigiCode.

---

## Casos de Uso

- **Compilaciones ilimitadas** — sin consumo de cuota de nube
- **Compilación rápida** — sin latencia de red
- **Uso sin conexión** — sin internet después de la descarga inicial

### Recomendaciones por Plan

| Plan | Recomendación | Razón |
|------|:-------------:|-------|
| Free | — | La cuota de compilación en nube (50/mes) suele ser suficiente |
| Lite | ▲ | Considera si 250/mes no es suficiente |
| Pro | ◎ | Para uso de alta frecuencia que supera los 500/mes |
| Enterprise | ◎ | Efectivo para compilación a nivel de toda la clase |

---

## ⚠️ Notas Importantes

> **Nota: Tamaño de la imagen Docker**
>
> La imagen Docker del servidor de compilación local es de aproximadamente **10 GB**.
>
> - **No descargues mediante tethering de teléfono** (puede superar el límite de datos o generar cargos altos)
> - **Usa una conexión fija estable (fibra óptica, etc.)**
> - Tiempo estimado de descarga: ~15-20 min a 100 Mbps de fibra

---

## Requisitos

Necesitas un entorno con Docker. Elige una de las siguientes opciones.

### Opción A: Docker Desktop (Estándar)

- Compatible con **Windows / Mac / Linux**
- **Gratis para uso personal**; planes de pago requeridos para uso comercial
- https://www.docker.com/products/docker-desktop/

### Opción B: Alternativas a Docker Desktop (Ligero / OSS)

Para uso comercial o si prefieres una solución más ligera:

| Herramienta | SO | Características |
|-------------|----|--------------:|
| **OrbStack** | macOS | Ligero, rápido, bajo consumo de memoria, nativo Apple Silicon |
| **Rancher Desktop** | Windows / macOS / Linux | OSS (gratuito) |
| **Podman Desktop** | Windows / macOS / Linux | OSS, sin demonio |

### Opción C: Docker Engine Directamente (Linux)

En Linux puedes instalar Docker Engine directamente sin Docker Desktop.

---

## Paso 1: Instalar el Entorno Docker

### Windows

1. Descarga Docker Desktop for Windows desde https://www.docker.com/products/docker-desktop/
2. Ejecuta el instalador (se necesita WSL2, el instalador te guiará)
3. Reinicia el PC después de la instalación

### Mac (Intel)

1. Descarga Docker Desktop for Mac (Intel) desde https://www.docker.com/products/docker-desktop/
2. Abre el `.dmg` y arrastra a Applications
3. Abre "Docker" desde Applications

### Mac (Apple Silicon: M1/M2/M3/M4)

**Recomendado: OrbStack**

Docker Desktop for Mac (versión Apple Silicon) funciona, pero OrbStack es más rápido y usa menos memoria.

1. Descarga OrbStack desde https://orbstack.dev/
2. Después de instalar, el comando `docker` está disponible inmediatamente

Si usas Docker Desktop, instala la versión Apple Silicon (`.dmg`).

> El núcleo ESP32 ya soporta arm64 nativamente, por lo que generalmente no se necesita emulación x86.

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Cierra sesión y vuelve a entrar para aplicar el cambio de grupo
```

### Verificar Instalación

```bash
docker --version
```

Si ves `Docker version 20.x.x`, estás listo.

---

## Paso 2: Descargar e Iniciar el Servidor de Compilación

### Método A: Inicio con un comando (recomendado)

```bash
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

La primera ejecución descarga ~10 GB de imagen. **Usa una conexión fija.**

### Método B: Usar docker-compose

Crea un archivo `docker-compose.yml` en cualquier carpeta:

```yaml
services:
  digicode-compiler:
    image: ghcr.io/fablab-westharima/digicode-compile-server:latest
    container_name: digicode-compiler
    ports:
      - "3001:3001"
    restart: unless-stopped
```

Luego en esa carpeta:

```bash
docker compose up -d
```

---

## Paso 3: Verificar

```bash
curl http://localhost:3001/health
```

Si ves lo siguiente, está funcionando:

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

También puedes visitar `http://localhost:3001/health` en tu navegador.

---

## Paso 4: Configurar en DigiCode

1. Abre DigiCode
2. Haz clic en ▼ junto al botón **"Cargar"**
3. Selecciona **"Servidor Local"**
4. Ejecuta una compilación para verificar

---

## Operaciones del Servidor

```bash
# Detener
docker stop digicode-compiler

# Reiniciar
docker start digicode-compiler

# Ver registros
docker logs digicode-compiler

# Eliminar completamente
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Actualizaciones

Cuando se lanza una nueva versión:

```bash
docker stop digicode-compiler
docker rm digicode-compiler
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Solución de Problemas

### Puerto 3001 en Uso

Si otra aplicación usa el puerto 3001:

```bash
# Usar puerto 3002
docker run -d -p 3002:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

Cambia la URL del servidor a `http://localhost:3002` en la configuración de DigiCode.

### Docker No Inicia (Windows)

- Verifica que WSL2 esté instalado
- Verifica que la virtualización esté habilitada en BIOS/UEFI
- Reinicia el PC

### Docker No Inicia (Mac)

- Permite Docker en Configuración del sistema > Privacidad y seguridad
- Reinicia el Mac

### Errores de Compilación en Apple Silicon

- Verifica que estés usando OrbStack o Docker Desktop for Apple Silicon
- Confirma que no se necesita emulación x86 (el núcleo ESP32 ya es arm64 nativo)

### Error de Compilación

```bash
# Reiniciar el contenedor
docker restart digicode-compiler

# Si aún falla, recrear
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Pros y Contras

| Elemento | Contenido |
|----------|-----------|
| ✅ Compilaciones | **Ilimitadas** (sin cuota de nube) |
| ✅ Velocidad | Sin latencia de red |
| ✅ Sin conexión | Sin internet después de la descarga |
| ⚠️ Descarga inicial | ~10 GB (se recomienda conexión fija) |
| ⚠️ Instalación | Requiere configurar Docker |
| ⚠️ Recursos | Usa memoria y CPU del PC (mínimo 4 GB RAM recomendado) |

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md) — Uso básico
- [Solución de Problemas](./troubleshooting.md) — Problemas comunes y soluciones
