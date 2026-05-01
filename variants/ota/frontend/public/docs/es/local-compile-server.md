# Servidor de compilación local

**Última actualización:** 2026-05-01

Ejecuta el servidor de compilación de DigiCode en tu propio ordenador como contenedor Docker, en lugar de usar el servidor en la nube. La nube y el local utilizan **la misma imagen Docker**, así que el resultado de compilación es idéntico (sin desfase de bibliotecas).

---

## 🚀 Instalación rápida

### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh)
```

### Windows (PowerShell)

Abre **"Windows PowerShell"** desde el menú Inicio — la versión estándar de 64 bits, *no* las variantes "x86" o "ISE" que el buscador de Windows también muestra. En Windows 11 con PowerShell 7 instalado, también vale **"PowerShell"**. No se requieren permisos de administrador.

```powershell
irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1 | iex
```

El script descarga la imagen Docker, arranca el contenedor y verifica `http://localhost:3001/health` automáticamente.

> 💡 **También disponible dentro de DigiCode**
> Abre Configuración de Compilación → Servidor Local → **botón "Configurar"** para ver el comando específico de tu sistema operativo (con botón de copia). No es necesario leer la documentación.

---

## Cinco pasos para terminar

1. Asegúrate de tener **Docker** instalado (si no, consulta los [enlaces de descarga de Docker](#instalación-de-docker) más abajo; el script también te avisa cuando falta)
2. Ejecuta el **comando de instalación rápida** anterior en tu Terminal / PowerShell
3. Confirma el **número de puerto** en el prompt (Enter para 3001 si está libre, o usa el puerto alternativo sugerido si 3001 está ocupado)
4. En DigiCode abre **Configuración de Compilación → Servidor Local** (introduce el mismo puerto en el campo Puerto si elegiste algo distinto a 3001)
5. Pulsa **«Probar conexión»** y comprueba que aparece «OK»

Listo. Las compilaciones siguientes usarán el servidor local.

---

## 🗑️ Desinstalación

```bash
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh) uninstall
```

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1))) uninstall
```

> 💡 **También disponible dentro de DigiCode**
> Abre Configuración de Compilación → Servidor Local → **botón "Desinstalar"** para copiar el mismo comando.

Se eliminarán el contenedor, los volúmenes persistentes y la carpeta de configuración; al final se preguntará si también deseas eliminar la imagen Docker (mantenerla acelera una posible reinstalación).

> ⚠️ **La caché de compilación también se borra**
> La primera compilación tras la desinstalación será un arranque en frío (~30–60 s).

---

## ⚠️ Tamaño de descarga

| Elemento | Tamaño |
|---|---|
| Imagen Docker (comprimida) | ~2.1 GB |
| Uso de disco (extraída) | ~8.8 GB |

Usa una **conexión cableada estable** (aproximadamente 1–2 minutos en fibra de 100 Mbps); el tethering del móvil no es recomendable.

---

## Instalación de Docker

Si el script detecta que Docker no está instalado, mostrará URL de descarga específicas del sistema operativo.

### macOS

| Recomendado para | Herramienta | URL |
|---|---|---|
| Apple Silicon | **OrbStack** (ligera, rápida) | https://orbstack.dev/ |
| Intel / Apple Silicon | Docker Desktop for Mac | https://www.docker.com/products/docker-desktop/ |

### Windows

- **Docker Desktop for Windows** (backend WSL2; el instalador te guía): https://www.docker.com/products/docker-desktop/
- Alternativas ligeras / OSS: [Rancher Desktop](https://rancherdesktop.io/), [Podman Desktop](https://podman-desktop.io/)

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER     # cierra sesión y vuelve a entrar para aplicar el cambio

# Fedora / RHEL / CentOS
sudo dnf install -y docker docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# Arch / Manjaro
sudo pacman -S --needed docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

---

## Subcomandos

```bash
bash install.sh [subcomando] [--port N]
# Windows
.\install.ps1 [subcomando] [-Port N]
```

| Subcomando | Acción |
|---|---|
| `install` (por defecto) | Pregunta el puerto → descarga la imagen → arranca el contenedor → verifica `/health` |
| `update` | Descarga la última imagen y recrea el contenedor (mantiene el puerto anterior) |
| `uninstall` | Detiene y elimina el contenedor, borra los volúmenes y el directorio de instalación (pregunta por la imagen) |
| `status` | Muestra estado del contenedor, imagen, puerto y resultado del health check |
| `start` | Arranca un contenedor (detenido) existente |
| `stop` | Detiene el contenedor sin eliminarlo (conserva volúmenes; reinicio rápido) |
| `help` | Ayuda integrada |

`update` / `status` / `start` / `stop` leen automáticamente el puerto activo del `docker-compose.yml` generado.

---

## Sobre el puerto

`install` siempre pregunta qué puerto usar.

- Si 3001 está **libre**, el valor por defecto es 3001 (basta con pulsar Enter)
- Si 3001 está **ocupado**, el script muestra quién lo retiene (pid + nombre del proceso) y sugiere el siguiente puerto libre (p. ej. 3002)

Cuando `curl ... | bash` (canalizado) impide el prompt, define `PORT` antes:

```bash
PORT=3001 bash -c "$(curl -fsSL .../install.sh)"
```

```powershell
$env:PORT = 3001
irm .../install.ps1 | iex
```

**Si eliges un puerto distinto a 3001**, introduce el mismo valor en Configuración de Compilación → Servidor Local → Puerto en DigiCode. Se guarda en `localStorage`, así que solo lo configuras una vez por navegador.

---

## Solución de problemas

### "Docker not found"

El script imprimió una URL de descarga específica del SO. Instala Docker y vuelve a ejecutar.

### "Docker is installed but not running"

Arranca Docker Desktop / OrbStack, espera a que el icono se estabilice, y vuelve a ejecutar.

### Puerto 3001 ya en uso

El script lo detecta y sugiere un puerto alternativo. Acepta el valor por defecto o introduce el tuyo — no es necesario editar `docker-compose.yml` a mano. Refleja el mismo valor en el campo Puerto de la UI de DigiCode y listo.

### Health check agotado

El arranque en frío puede ser lento en hardware modesto. Inspecciona los registros:

```bash
docker logs digicode-compile-api
```

Si ves un panic, abre un issue en <https://github.com/fablab-westharima/digicode-installer/issues> con el extracto del log.

### Compilaciones lentas en Apple Silicon

Asegúrate de usar Docker Desktop (build de Apple Silicon) o OrbStack — ambos corren arm64 nativo. La imagen compile-api es multi-arch; no debería hacer falta emulación x86.

---

## ¿Por qué usarlo?

- ✅ **Compilaciones ilimitadas** — no consumen la cuota de la nube
- ✅ **Menor latencia** — sin viaje de ida y vuelta de red; recompilaciones cálidas en segundos
- ✅ **Sin conexión** — una vez descargada la imagen, no requiere internet
- ✅ **Resultado idéntico** — misma imagen Docker que el servidor en la nube

### Recomendación por plan

| Plan | Recomendación | Por qué |
|---|---|---|
| Free | — | Las 50 compilaciones/mes en la nube suelen bastar |
| Lite | ▲ | Considéralo si superas las 250/mes |
| Pro | ◎ | Incluso 500/mes pueden quedarse cortas en uso intensivo |
| Enterprise | ◎ | Acelera la compilación de toda la clase; soporte sin conexión en aulas |

### Tiempos de compilación esperados

| Escenario | Tiempo total |
|---|---|
| Primera compilación (arranque en frío + DL) | 30–60 s |
| Cambio solo de fuente (warm rebuild) | ~9.6 s |
| Compilación idéntica (cache HIT) | ~1 ms |

El servidor local usa la misma imagen Docker que la nube (ML30), así que el binario es bit-idéntico (sin desfase de bibliotecas).

---

## Documentación relacionada

- [Empezar](./getting-started.md)
- [Solución de problemas](./troubleshooting.md)
- Código del instalador: [`fablab-westharima/digicode-installer`](https://github.com/fablab-westharima/digicode-installer) (Public, MIT)
