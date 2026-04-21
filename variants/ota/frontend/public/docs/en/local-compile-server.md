# Local Compile Server Setup

**Last updated:** 2026-04-21

You can run a compile server on your own computer instead of DigiCode's cloud server.

---

## Use Cases

- **Unlimited compilations** — no cloud quota used
- **Fast compilation** — no network latency
- **Offline use** — no internet needed after initial download

### Plan Recommendations

| Plan | Recommendation | Reason |
|------|:--------------:|--------|
| Free | — | Cloud quota (50/month) is usually sufficient |
| Lite | ▲ | Consider if 250/month is not enough |
| Pro | ◎ | For high-frequency use exceeding 500/month |
| Enterprise | ◎ | Effective for class-wide compilation |

---

## ⚠️ Important Notes

> **Note: Docker image size**
>
> The local compile server Docker image is **approximately 10 GB**.
>
> - **Do not download via smartphone tethering** (may exceed data limits or incur high charges)
> - **Use a stable fixed-line connection (fiber, etc.)**
> - Estimated download time: ~15-20 min on 100 Mbps fiber

---

## Requirements

You need a Docker-capable environment. Choose one of the following options.

### Option A: Docker Desktop (Standard)

- Supports **Windows / Mac / Linux**
- **Free for personal use**; paid plans required for commercial use
- https://www.docker.com/products/docker-desktop/

### Option B: Docker Desktop Alternatives (Lightweight / OSS)

For commercial use or if you prefer a lighter solution:

| Tool | OS | Features |
|------|----|---------:|
| **OrbStack** | macOS | Lightweight, fast, low memory, Apple Silicon native |
| **Rancher Desktop** | Windows / macOS / Linux | OSS (free) |
| **Podman Desktop** | Windows / macOS / Linux | OSS, daemonless |

### Option C: Docker Engine Directly (Linux)

On Linux, you can install Docker Engine directly without Docker Desktop.

---

## Step 1: Install Docker Environment

### Windows

1. Download Docker Desktop for Windows from https://www.docker.com/products/docker-desktop/
2. Run the installer (WSL2 required, installer will guide you)
3. Restart PC after installation

### Mac (Intel)

1. Download Docker Desktop for Mac (Intel) from https://www.docker.com/products/docker-desktop/
2. Open `.dmg` and drag to Applications
3. Launch "Docker" from Applications

### Mac (Apple Silicon: M1/M2/M3/M4)

**Recommended: OrbStack**

While Docker Desktop for Mac (Apple Silicon) works, OrbStack is faster and uses less memory.

1. Download OrbStack from https://orbstack.dev/
2. After install, the `docker` command is available immediately

If using Docker Desktop, install the Apple Silicon version (`.dmg`).

> The ESP32 core supports arm64 natively, so x86 emulation is generally not needed.

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in to apply group change
```

### Verify Installation

```bash
docker --version
```

If you see `Docker version 20.x.x`, you're ready.

---

## Step 2: Download and Start Compile Server

### Method A: One-line startup (recommended)

```bash
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

The first run downloads ~10 GB image. **Use a fixed-line connection.**

### Method B: docker-compose

Create a `docker-compose.yml` file in any folder:

```yaml
services:
  digicode-compiler:
    image: ghcr.io/fablab-westharima/digicode-compile-server:latest
    container_name: digicode-compiler
    ports:
      - "3001:3001"
    restart: unless-stopped
```

Then in that folder:

```bash
docker compose up -d
```

---

## Step 3: Verify

```bash
curl http://localhost:3001/health
```

If you see the following, it's working:

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

You can also visit `http://localhost:3001/health` in your browser.

---

## Step 4: Configure DigiCode

1. Open DigiCode
2. Click ▼ next to the **"Upload"** button
3. Select **"Local Server"**
4. Run a compilation to verify

---

## Server Operations

```bash
# Stop
docker stop digicode-compiler

# Restart
docker start digicode-compiler

# View logs
docker logs digicode-compiler

# Remove completely
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Updates

When a new version is released:

```bash
docker stop digicode-compiler
docker rm digicode-compiler
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Troubleshooting

### Port 3001 in use

If another app is using port 3001:

```bash
# Use port 3002
docker run -d -p 3002:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

Change the server URL to `http://localhost:3002` in DigiCode settings.

### Docker won't start (Windows)

- Check WSL2 is installed
- Verify virtualization is enabled in BIOS/UEFI
- Restart PC

### Docker won't start (Mac)

- Allow Docker in System Settings > Privacy & Security
- Restart Mac

### Compile errors on Apple Silicon

- Verify you're using OrbStack or Docker Desktop for Apple Silicon
- Confirm x86 emulation is not needed (ESP32 core is arm64-native)

### Compilation error

```bash
# Restart container
docker restart digicode-compiler

# If still failing, recreate
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Pros and Cons

| Item | Content |
|------|---------|
| ✅ Compilations | **Unlimited** (no cloud quota) |
| ✅ Speed | No network latency |
| ✅ Offline | No internet needed after download |
| ⚠️ Initial download | ~10 GB (fixed-line recommended) |
| ⚠️ Setup | Docker installation required |
| ⚠️ Resources | Uses PC memory and CPU (4 GB RAM minimum recommended) |

---

## Related Documents

- [Getting Started](./getting-started.md) — Basic usage
- [Troubleshooting](./troubleshooting.md) — Common issues and solutions
