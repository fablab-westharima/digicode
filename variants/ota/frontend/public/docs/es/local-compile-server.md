# Servidor de compilación local

**Última actualización:** 2026-05-08

Ejecuta el servidor de compilación de DigiCode en tu propio ordenador como contenedor Docker, en lugar de usar el servidor en la nube. La nube y el local utilizan **la misma imagen Docker**, así que el resultado de compilación es idéntico (sin desfase de bibliotecas).

---

## 🟡 Antes de empezar: recomendación por SO

| SO | Servidor local | Notas |
|---|---|---|
| **macOS** | 🥇 OK para uso general | OrbStack (recomendado en Apple Silicon) un clic + una línea `bash <(curl ...)` |
| **Linux** | 🥇 OK para uso general | apt / dnf / pacman para instalar Docker y una línea sh |
| **Windows** | 🟡 **Usuarios avanzados** | Varios prerrequisitos específicos de Windows (BIOS / WSL / Docker Desktop) lo hacen complicado para principiantes |

> ⚠️ **Aviso para usuarios de Windows**
>
> Configurar el servidor de compilación local (esta página) y **subida WiFi OTA** son **avanzados** en Windows. Dependen de varios prerrequisitos específicos de Windows (activar virtualización en BIOS, actualizar WSL2, instalar y configurar Docker Desktop) que se acumulan para alguien nuevo en entornos de desarrollo.
>
> **Para usuarios principiantes de Windows recomendamos:**
> - 🥇 **Compilación en la nube** — incluso el plan Free da 50 compilaciones/mes, con más en planes de pago
> - 🥇 **Subida USB** o **Bluetooth (BLE) OTA** — ambos guiados por la GUI integrada de DigiCode, sin instalación adicional
>
> Prueba la ruta servidor local / WiFi OTA cuando estés cómodo con entornos de desarrollo. La sección de Solución de problemas más abajo cubre los obstáculos específicos de Windows, pero la primera vez suele requerir paciencia.
>
> Usuarios Mac / Linux: salta directamente a la instalación rápida abajo.

---

## 🚀 Instalación rápida

### 🥇 Recomendado: Docker Desktop GUI (Mac / Windows)

**La imagen oficial `digicollc/digicode-compile-server` está publicada en DockerHub. Pull y Run desde la GUI de Docker Desktop con unos clics** — sin necesidad de terminal.

1. Inicia Docker Desktop (si no está instalado, consulta los [enlaces de descarga](#instalación-de-docker) más abajo)
2. Escribe el siguiente nombre de imagen en la barra de búsqueda superior → **"Pull"**
   ```
   digicollc/digicode-compile-server
   ```
3. En la pestaña **Images**, haz clic en **"Run"** sobre esa imagen → expande **Optional settings**
4. Configura:
   - **Container name**: `digicode-compile-server` (cualquiera)
   - **Host port**: `3001`
   - **Container port**: `3001`
5. Haz clic en **"Run"** → abre [http://localhost:3001/health](http://localhost:3001/health) en el navegador para verificar (OK = éxito)

> 💡 **La misma guía está disponible dentro de DigiCode**
> Abre Configuración de Compilación → Servidor Local → **Configurar** para ver los mismos pasos (con botón de copia para el nombre de la imagen).

---

### 🛠 Avanzado: instalación por línea de comandos

Para uso en servidor, automatización o Linux. El script gestiona la verificación de Docker, el arranque del contenedor, evita conflictos de puerto e integra con la UI de DigiCode.

#### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh)
```

#### Windows (PowerShell)

Abre **"Windows PowerShell"** desde el menú Inicio — la versión estándar de 64 bits, *no* las variantes "x86" o "ISE" que el buscador de Windows también muestra. En Windows 11 con PowerShell 7 instalado, también vale **"PowerShell"**. No se requieren permisos de administrador.

```powershell
irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1 | iex
```

El script descarga la imagen Docker, arranca el contenedor y verifica `http://localhost:3001/health` automáticamente.

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

### 🥇 Recomendado: Docker Desktop GUI

1. Abre la pestaña **Containers** en Docker Desktop
2. **Stop → Delete** del contenedor `digicode-compile-server`
3. En la pestaña **Volumes**, **Delete** `digicode-projects` / `digicode-cache` (la caché se borrará)
4. En la pestaña **Images**, **Delete** `digicollc/digicode-compile-server` (opcional; mantenerla acelera la reinstalación)

### 🛠 Avanzado: desinstalación por línea de comandos

```bash
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh) uninstall
```

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1))) uninstall
```

> 💡 **La misma guía está disponible dentro de DigiCode**
> Abre Configuración de Compilación → Servidor Local → **Desinstalar** para ver los mismos pasos.

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

**🥇 Recomendado: Microsoft Store**

Busca «Docker Desktop» en Microsoft Store, verifica que el editor sea **Docker Inc** y haz clic en «Instalar». MSIX está gestionado por el sistema operativo, no abre ventanas adicionales durante la instalación y se actualiza automáticamente. La mejor opción por defecto para usuarios generales.

**Instalador directo (.exe)**

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (backend WSL2; el instalador te guía)

> ⚠️ **Importante**: NO cierres ninguna ventana que abra el instalador (incluidos los subprocesos cmd / PowerShell que lance) hasta que termine la instalación. Cerrar uno a mitad deja `C:\ProgramData\DockerDesktop` en estado dañado y todos los intentos posteriores fallan con «ProgramData\DockerDesktop must be owned by an elevated account» (consulta [Solución de problemas](#la-instalación-de-docker-falla-con-cprogramdatadockerdesktop-must-be-owned-by-an-elevated-account) abajo).

**Alternativas ligeras / OSS**

[Rancher Desktop](https://rancherdesktop.io/), [Podman Desktop](https://podman-desktop.io/)

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

### La instalación de Docker falla con «C:\ProgramData\DockerDesktop must be owned by an elevated account»

**Causa**: una instalación previa de Docker Desktop quedó interrumpida — normalmente porque el instalador lanzó una ventana cmd / PowerShell secundaria y el usuario la cerró antes de terminar. La carpeta `C:\ProgramData\DockerDesktop` queda con un propietario incorrecto, y todos los intentos posteriores (incluida la versión de Microsoft Store) chocan con la misma comprobación de permisos.

**Solución**: abre **PowerShell como administrador** (menú Inicio → clic derecho en PowerShell → «Ejecutar como administrador»), ejecuta los 4 comandos siguientes y vuelve a ejecutar el instalador de Docker Desktop:

```powershell
Remove-Item "C:\ProgramData\DockerDesktop" -Recurse -Force
New-Item -ItemType Directory -Path "C:\ProgramData\DockerDesktop" -Force | Out-Null
icacls "C:\ProgramData\DockerDesktop" /setowner "*S-1-5-32-544" /T
icacls "C:\ProgramData\DockerDesktop" /grant "*S-1-5-32-544:(OI)(CI)F" /T
```

`*S-1-5-32-544` es el SID del grupo Administradores y funciona tanto en Windows en inglés como en japonés. Aplica el mismo procedimiento si la versión Store da el mismo error — su ruta de instalación también ejecuta la comprobación de permisos de Docker.

> 💡 **Prevención**: con el instalador .exe nunca cierres las ventanas secundarias durante la instalación. Si prefieres evitar el riesgo, usa la instalación desde Microsoft Store — MSIX no abre ventanas adicionales.

### Docker Desktop falla al iniciar con «Virtualization support not detected»

**Causa**: la virtualización por hardware (Intel VT-x / AMD-V) está deshabilitada en BIOS / UEFI. La CPU lo admite pero el sistema operativo no lo ve.

**Comprobación**: Administrador de tareas (Ctrl + Shift + Esc) → pestaña «Rendimiento» → CPU → campo «Virtualización». Si dice «Deshabilitado», hay que cambiar la BIOS.

**Solución**:

1. Reinicia → durante el logo de arranque pulsa la tecla de BIOS (DELL / ASUS = `F2` o `Del`, HP = `F10`, Lenovo = `F1` / `F2`, equipos hechos a medida según la placa base)
2. En BIOS / UEFI, activa una de:
   - CPU Intel: **Virtualization Technology (VTx)** / **Intel VT-x**
   - CPU AMD: **SVM Mode** / **AMD-V**
3. La ubicación depende del fabricante: normalmente bajo `Advanced`, `System Options`, `CPU Configuration` o `Security`
4. `F10` (Save & Exit) → Sí → reinicia
5. Tras arrancar Windows, vuelve a comprobar el Administrador de tareas → CPU → «Virtualización: Habilitado» → arranca Docker Desktop

> ⚠️ No toques `Intel Trusted Execution Technology (TXT)` ni `DMA Protection` — pueden impedir el arranque de Windows y Docker no los necesita.

### Docker Desktop falla al iniciar con «WSL needs updating»

El kernel de WSL2 (Subsistema de Windows para Linux) está desactualizado y Docker Desktop no puede iniciarse.

**Solución**: abre PowerShell (administrador recomendado):

```powershell
wsl --update
```

La descarga + instalación dura ~30-60 segundos. Al terminar, vuelve a Docker Desktop y haz clic en **Try Again**. La barra de estado debería pasar de `Engine starting` a `Engine running`.

> Si `wsl --update` falla con «WSL no está instalado», ejecuta `wsl --install` desde **PowerShell como administrador** (camino de instalación limpia; puede requerir reiniciar Windows).

### Pantalla de inicio de sesión «Welcome to Docker» al abrir Docker Desktop por primera vez

Haz clic en **Skip** en la esquina superior derecha. El servidor de compilación local de DigiCode funciona sin cuenta de Docker Hub — nuestra imagen está en GitHub Container Registry (`ghcr.io`) y se descarga de forma anónima.

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
