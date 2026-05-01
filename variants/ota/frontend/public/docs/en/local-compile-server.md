# Local compile server

**Last updated:** 2026-05-01

Run the DigiCode compile server locally as a Docker container instead of using the cloud. Local and cloud share the **same Docker image**, so the compile output is byte-identical (no library drift).

---

## 🚀 Quick install

### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh)
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1 | iex
```

The script pulls the Docker image, starts the container, and verifies `http://localhost:3001/health` automatically.

> 💡 **Also available from inside DigiCode**
> Open Compile Settings → Local Server → **Set up button** to see the OS-specific command directly (with a copy button). No need to read the docs.

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

```bash
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh) uninstall
```

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1))) uninstall
```

> 💡 **Also available from inside DigiCode**
> Open Compile Settings → Local Server → **Uninstall button** to copy the same command.

The container, persistent volumes and config directory are removed; you're then asked whether to delete the Docker image too (keeping it makes a re-install faster).

> ⚠️ **The compile cache is wiped too**
> The next compile after uninstall is a cold start (~30–60s).

---

## ⚠️ Download size

| Item | Size |
|---|---|
| Docker image (compressed) | ~2.1 GB |
| Disk usage (extracted) | ~8.8 GB |

Use a stable wired connection (about 1–2 minutes on 100 Mbps fibre); a phone hotspot is not recommended.

---

## Installing Docker

The script detects when Docker is missing and prints OS-specific download URLs.

### macOS

| Recommended for | Tool | URL |
|---|---|---|
| Apple Silicon | **OrbStack** (lightweight, fast) | https://orbstack.dev/ |
| Intel / Apple Silicon | Docker Desktop for Mac | https://www.docker.com/products/docker-desktop/ |

### Windows

- **Docker Desktop for Windows** (WSL2 backend; the installer guides you): https://www.docker.com/products/docker-desktop/
- Lightweight / OSS alternatives: [Rancher Desktop](https://rancherdesktop.io/), [Podman Desktop](https://podman-desktop.io/)

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
| First compile (cold start + DL) | 30–60 s |
| Source-only change (warm rebuild) | ~9.6 s |
| Identical source compile (cache HIT) | ~1 ms |

The local server runs the same Docker image as the cloud (ML30), so binary output is bit-identical (no library drift).

---

## Related docs

- [Getting started](./getting-started.md)
- [Troubleshooting](./troubleshooting.md)
- Installer source: [`fablab-westharima/digicode-installer`](https://github.com/fablab-westharima/digicode-installer) (Public, MIT)
