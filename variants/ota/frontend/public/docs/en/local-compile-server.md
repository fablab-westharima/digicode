# Local compile server

**Last updated:** 2026-05-11

Run the DigiCode compile server locally as a Docker container instead of using the cloud. Local and cloud share the **same Docker image**, so the compile output is byte-identical (no library drift).

---

## 🟡 Before you start: OS recommendation

| OS | Local server setup | Notes |
|---|---|---|
| **macOS** | 🥇 OK for general users | OrbStack (recommended on Apple Silicon) is one click + a single `bash <(curl ...)` line |
| **Linux** | 🥇 OK for general users | apt / dnf / pacman to install Docker, then one sh line |
| **Windows** | 🟡 **Advanced users** | Multiple Windows-specific prerequisites (BIOS / WSL / Docker Desktop) make this hard for beginners |

> ⚠️ **Heads-up for Windows users**
>
> Setting up the local compile server (this page) and **WiFi OTA upload** are **advanced** on Windows. They depend on multiple Windows-specific prerequisites (enable virtualization in BIOS, update WSL2, install + configure Docker Desktop) that pile up for someone new to development environments.
>
> **For Windows beginners we recommend:**
> - 🥇 **Cloud compile** — even the Free plan gives you 50 compiles/month, with more on paid plans
> - 🥇 **USB upload** or **Bluetooth (BLE) OTA** — both are guided by DigiCode's built-in GUI, no extra install needed
>
> Try the local server / WiFi OTA path once you're comfortable with dev environments. The Troubleshooting section below covers the Windows-specific walls, but expect the first run to take some patience.
>
> Mac / Linux users: skip ahead to Quick install below.

---

## 🚀 Quick install

### 🥇 Recommended: Docker Desktop GUI (Mac / Windows)

**The official `digicollc/digicode-compile-server` image is published on DockerHub. Pull and run it from the Docker Desktop GUI in just a few clicks** — no terminal commands required.

1. Launch Docker Desktop (if not installed, see [OS-specific download URLs](#installing-docker) below)
2. Type the following image name into the top search bar → click **"Pull"**
   ```
   digicollc/digicode-compile-server
   ```
3. On the **Images** tab, click **"Run"** for that image → expand **Optional settings**
4. Configure:
   - **Container name**: `digicode-compile-server` (any)
   - **Host port**: `3001`
   - **Container port**: `3001`
5. Click **"Run"** → switch to the **Containers** tab in the left sidebar and confirm the `digicode-compile-server` row shows a green **"Running"** indicator with `3001:3001` in the **Port(s)** column
6. As a final check, open [http://localhost:3001/health](http://localhost:3001/health) in your browser (`{"status":"ok",...}` = success)

> 📖 **Docker Desktop UI changes between versions**
> If labels differ, see the official guides:
> - Pull / Run flow: <https://docs.docker.com/desktop/use-desktop/images/>
> - Containers tab: <https://docs.docker.com/desktop/use-desktop/>

> 💡 **The same guide is available inside DigiCode**
> Open Compile Settings → Local Server → **Set up** to see the same steps right there (image name has a copy button).

---

### 🛠 Advanced: Command-line install

For server use, automation, or Linux. The script handles Docker checks, container startup, port-conflict avoidance, and DigiCode UI integration end-to-end.

#### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh)
```

#### Windows (PowerShell)

Open **"Windows PowerShell"** from the Start menu — the 64-bit standard
build, *not* the "x86" or "ISE" variants Windows search also lists. On
Windows 11 with PowerShell 7 installed, plain **"PowerShell"** works too.
No admin privileges required.

```powershell
irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1 | iex
```

The script pulls the Docker image, starts the container, and verifies `http://localhost:3001/health` automatically.

---

## Five steps to finish

1. Make sure **Docker** is installed (if not, see [Docker install URLs](#installing-docker) below; the script also tells you when missing)
2. Run the **quick install command** above in your Terminal / PowerShell
3. Confirm the **port number** at the prompt (Enter for 3001 if free, or use the suggested alternate if 3001 is busy)
4. In DigiCode open **Compile Settings → Local Server** (set the same port in the Port field if you chose anything other than 3001)
5. Click **"Connection test"** and look for "OK"

You're done. Subsequent compiles use the local server.

---

## 🗑️ Uninstall

### 🥇 Recommended: Docker Desktop GUI

1. Open the **Containers** tab in Docker Desktop
2. **Stop → Delete** the `digicode-compile-server` container
3. On the **Volumes** tab, **Delete** `digicode-projects` / `digicode-cache` (the cache will be erased)
4. On the **Images** tab, **Delete** `digicollc/digicode-compile-server` (optional; keep it to make re-install faster)

### 🛠 Advanced: Command-line uninstall

```bash
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh) uninstall
```

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1))) uninstall
```

> 💡 **The same guide is available inside DigiCode**
> Open Compile Settings → Local Server → **Uninstall** to see the same steps.

The container, persistent volumes and config directory are removed; you're then asked whether to delete the Docker image too (keeping it makes a re-install faster).

> ⚠️ **The compile cache is wiped too**
> The next compile after uninstall is a cold start (~30–60s).

---

## ⚠️ Download size and first-run timing

| Item | Size / time |
|---|---|
| Docker image (compressed pull) | ~5 GB |
| Disk usage (extracted) | **~14 GB** (PlatformIO frameworks + libraries embedded) |
| First pull (100 Mbps fibre) | ~7–10 minutes |
| First compile (template caching) | a few minutes |
| Subsequent compiles (cache HIT) | a few seconds |

> ⚠️ **Check free disk space before pulling**
> We recommend at least **20 GB free** (14 GB extracted + temp files + room for the compile cache).
>
> Use a stable wired connection or WiFi rather than a mobile hotspot — large transfers over cellular can blow through your data cap.

---

## Installing Docker

The script detects when Docker is missing and prints OS-specific download URLs.

### macOS

| Recommended for | Tool | URL |
|---|---|---|
| Apple Silicon | **OrbStack** (lightweight, fast) | https://orbstack.dev/ |
| Intel / Apple Silicon | Docker Desktop for Mac | https://www.docker.com/products/docker-desktop/ |

### Windows

**🥇 Recommended: Microsoft Store**

Search for "Docker Desktop" in the Microsoft Store, verify the publisher is **Docker Inc**, and click Install. The MSIX package is OS-managed, doesn't open extra subprocess windows during install, and updates automatically. Best default for general / non-technical users.

**Direct installer (.exe)**

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (WSL2 backend; the installer guides you)

> ⚠️ **Important**: Do NOT close any window the installer opens (including spawned cmd / PowerShell subprocesses) until install finishes. Closing one mid-flight leaves `C:\ProgramData\DockerDesktop` in a broken state and every subsequent install attempt fails with "ProgramData\DockerDesktop must be owned by an elevated account" (see [Troubleshooting](#docker-install-fails-with-cprogramdatadockerdesktop-must-be-owned-by-an-elevated-account) below).

**Lightweight / OSS alternatives**

[Rancher Desktop](https://rancherdesktop.io/), [Podman Desktop](https://podman-desktop.io/)

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER     # log out / back in for it to take effect

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

## Subcommand reference

```bash
bash install.sh [subcommand] [--port N]
# Windows
.\install.ps1 [subcommand] [-Port N]
```

| Subcommand | Action |
|---|---|
| `install` (default) | Prompt for the port → pull image → start container → verify `/health` |
| `update` | Pull the latest image and recreate the container (keeps the previous port) |
| `uninstall` | Stop + remove container, delete volumes and install dir (asks about the image) |
| `status` | Container state, image, host port, and a live health check |
| `start` | Start an existing (stopped) container |
| `stop` | Stop the container without removing it (volumes preserved, fast restart) |
| `help` | Built-in help |

`update` / `status` / `start` / `stop` automatically read the active host port from the generated `docker-compose.yml`.

---

## About the port

`install` always asks which host port to use.

- If 3001 is **free**, the default is 3001 (just press Enter)
- If 3001 is **in use**, the script prints who's holding it (pid + process name) and suggests the next free port (e.g. 3002)

If `curl ... | bash` (piped) prevents the prompt, set `PORT` ahead of time:

```bash
PORT=3001 bash -c "$(curl -fsSL .../install.sh)"
```

```powershell
$env:PORT = 3001
irm .../install.ps1 | iex
```

**If you choose a port other than 3001**, type the same value into DigiCode's Compile Settings → Local Server → Port field. It is persisted in `localStorage`, so you only have to do it once per browser.

---

## Troubleshooting

### "Docker not found"

The script printed an OS-specific download URL — install Docker, then re-run.

### "Docker is installed but not running"

Start Docker Desktop / OrbStack, wait for the icon to settle, and re-run.

### Port 3001 already in use

The script auto-detects and suggests an alternate port. Accept the default or type your own — no need to edit `docker-compose.yml` by hand. Mirror the same value in the DigiCode UI's Port field and you're set.

### Health check timed out

Cold start can be slow on weaker hardware. Inspect logs:

```bash
docker logs digicode-compile-api
```

If you see a panic, file an issue at <https://github.com/fablab-westharima/digicode-installer/issues> with the log excerpt.

### Slow compiles on Apple Silicon

Make sure you're on Docker Desktop (Apple Silicon build) or OrbStack — both run native arm64. The compile-api image is multi-arch; you should not need x86 emulation.

### Docker install fails with "C:\ProgramData\DockerDesktop must be owned by an elevated account"

**Cause**: a previous Docker Desktop install was interrupted — typically the installer spawned a cmd / PowerShell subprocess and the user closed it before install finished. The leftover `C:\ProgramData\DockerDesktop` folder is owned by the wrong account, and every subsequent install (including the Microsoft Store version) hits the same ownership check and refuses to proceed.

**Fix**: open **Administrator PowerShell** (Start menu → right-click PowerShell → "Run as administrator"), run the four commands below, then re-run the Docker Desktop installer:

```powershell
Remove-Item "C:\ProgramData\DockerDesktop" -Recurse -Force
New-Item -ItemType Directory -Path "C:\ProgramData\DockerDesktop" -Force | Out-Null
icacls "C:\ProgramData\DockerDesktop" /setowner "*S-1-5-32-544" /T
icacls "C:\ProgramData\DockerDesktop" /grant "*S-1-5-32-544:(OI)(CI)F" /T
```

`*S-1-5-32-544` is the Administrators group SID and works on both English and Japanese Windows. Apply the same fix if the Microsoft Store version hits this — its install path runs Docker's permission check too.

> 💡 **Prevention**: with the direct .exe installer, never close subprocess windows during install. If you'd rather not worry about it, use the Microsoft Store install — MSIX doesn't spawn extra windows.

### Docker Desktop fails to start with "Virtualization support not detected"

**Cause**: hardware virtualization (Intel VT-x / AMD-V) is disabled in BIOS / UEFI. The CPU supports it but the OS can't see it.

**Check**: Task Manager (Ctrl + Shift + Esc) → Performance tab → CPU → "Virtualization" field. If it shows "Disabled", you need to fix BIOS.

**Fix**:

1. Reboot → spam the BIOS key during the boot logo (DELL / ASUS = `F2` or `Del`, HP = `F10`, Lenovo = `F1` / `F2`, custom builds depend on the motherboard vendor)
2. In BIOS / UEFI, enable one of:
   - Intel CPU: **Virtualization Technology (VTx)** / **Intel VT-x**
   - AMD CPU: **SVM Mode** / **AMD-V**
3. Location varies by vendor: usually under `Advanced`, `System Options`, `CPU Configuration`, or `Security`
4. `F10` (Save & Exit) → Yes → reboot
5. After Windows boots, recheck Task Manager → CPU → Virtualization shows "Enabled" → start Docker Desktop

> ⚠️ Don't touch `Intel Trusted Execution Technology (TXT)` or `DMA Protection` — those can break Windows boot and aren't required by Docker.

### Docker Desktop fails to start with "WSL needs updating"

WSL2 (Windows Subsystem for Linux) has an outdated kernel, blocking Docker Desktop start.

**Fix**: open PowerShell (admin recommended):

```powershell
wsl --update
```

Download + install takes ~30-60 seconds. When done, return to Docker Desktop and click **Try Again**. The status bar should change from `Engine starting` to `Engine running`.

> If `wsl --update` itself fails with "WSL is not installed", run `wsl --install` from **Administrator PowerShell** instead (clean install path; may require a Windows reboot).

### Docker Desktop's "Welcome to Docker" sign-in screen at first launch

Click **Skip** in the top-right. DigiCode's local compile-server works without a Docker Hub account — our image lives on GitHub Container Registry (`ghcr.io`) and is pulled anonymously.

---

## Why use it?

- ✅ **Unlimited compiles** — local doesn't count against the cloud quota
- ✅ **Lower latency** — no network round trip; warm rebuilds in seconds
- ✅ **Offline** — once the image is pulled, no internet required
- ✅ **Identical output** — same Docker image as the cloud server

### Recommended by plan

| Plan | Recommendation | Why |
|---|---|---|
| Free | — | The 50 cloud compiles/month is usually enough |
| Lite | ▲ | Consider it if you exceed 250/month |
| Pro | ◎ | Even 500/month can be tight for heavy users |
| Enterprise | ◎ | Class-wide compile speed-up; offline classroom support |

### Compile latency expectations

| Scenario | Wall time |
|---|---|
| First compile after Docker pull | a few minutes (template + lib cache build) |
| Cold start (after container restart) | 30–60 s |
| Source-only change (warm rebuild) | ~9.6 s |
| Identical source compile (cache HIT) | ~1 ms |

The local server runs the same Docker image as the cloud (ML30), so binary output is bit-identical (no library drift).

---

## Related docs

- [Getting started](./getting-started.md)
- [Troubleshooting](./troubleshooting.md)
- Installer source: [`fablab-westharima/digicode-installer`](https://github.com/fablab-westharima/digicode-installer) (Public, MIT)
