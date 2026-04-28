# Local Compile Server Setup

**Last updated:** 2026-04-29

You can run a compile server on your own computer instead of DigiCode's cloud server. The cloud and local both use the **same Docker image**, so compile results are identical (no lib drift).

---

## Use Cases

- **Unlimited compilations** — no cloud quota used
- **Fast compilation** — no network latency, persistent cache delivers ~1 ms cache HIT or ~9.6 s warm rebuild
- **Offline use** — no internet needed after the initial image pull

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
> The local compile server Docker image (PlatformIO Core based, v0.1.0):
>
> - **Download (compressed): ~1 GB**
> - **Disk usage (uncompressed): ~3.8 GB**
>
> - **Do not download via smartphone tethering** — use a stable fixed-line connection (fiber, etc.)
> - Estimated download time: ~1-2 min on 100 Mbps fiber

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
2. Run the installer (WSL2 required, the installer guides you)
3. Restart the PC after installation

### Mac (Intel)

1. Download Docker Desktop for Mac (Intel) from https://www.docker.com/products/docker-desktop/
2. Open the `.dmg` and drag to Applications
3. Launch "Docker" from Applications

### Mac (Apple Silicon: M1/M2/M3/M4)

**Recommended: OrbStack**

While Docker Desktop for Mac (Apple Silicon) works, OrbStack is faster and uses less memory.

1. Download OrbStack from https://orbstack.dev/
2. After install, the `docker` command is immediately available

If you use Docker Desktop, install the Apple Silicon version (`.dmg`).

> The ESP32 core supports arm64 natively, so x86 emulation is not needed for typical use.

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in to apply the group change
```

### Verify Installation

```bash
docker --version
```

If you see `Docker version 20.x.x`, you're ready.

---

## Step 2: Download and Start the Compile Server

### Method A: One-line startup

```bash
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

The first run downloads ~1 GB image (3.8 GB uncompressed). **Use a fixed-line connection.**

### Method B: docker-compose.yml (recommended, with persistent cache)

Create a `docker-compose.yml` file in any folder:

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

Then in that folder:

```bash
docker compose up -d
```

> `digicode-projects` and `digicode-cache` are named volumes that persist build state. **Identical code on a second compile takes ~1 ms (cache HIT)**, while a 1-byte change finishes warm rebuild in ~9.6 s. With ephemeral volumes (`docker run` without `-v`), the cache is lost when the container is removed.

---

## Step 3: Verify

```bash
curl http://localhost:3001/health
```

You should see (check `service` and `version`):

```json
{
  "status": "ok",
  "service": "digicode-compile-api",
  "version": "0.1.0",
  "timestamp": "..."
}
```

You can also visit `http://localhost:3001/health` in your browser.

---

## Step 4: Configure DigiCode

1. Open DigiCode
2. Click ▼ next to the **"Upload"** button
3. Select **"Local Server"**
4. Run a compilation to verify

The first compile (cold) takes ~30-60 s — PlatformIO + framework + libs ship inside the image, so the result matches the cloud (ML30) build byte-for-byte.

---

## Migrating from the legacy image (existing users, 1 step)

Until 2026-04 we distributed `ghcr.io/fablab-westharima/digicode-compile-server` (arduino-cli based). Migration to the new `digicode-compile-api` (PlatformIO Core based) is **just an image name change**.

```bash
# Stop and remove the old image
docker stop digicode-compiler 2>/dev/null
docker rm digicode-compiler 2>/dev/null
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest 2>/dev/null

# Start the new image
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

**What changes:**

- Image name: `digicode-compile-server` → `digicode-compile-api`
- Container name: `digicode-compiler` → `digicode-compile-api` (optional, change to fit your needs)
- Port: 3001 unchanged
- DigiCode UI setting (URL `http://localhost:3001`): unchanged
- API contract: compatible — only the `service` / `version` fields in `/health` differ

The legacy repository [fablab-westharima/arduino-compile-server](https://github.com/fablab-westharima/arduino-compile-server) was archived on 2026-04-29. Cloud-side library fixes (QTRSensors / MFRC522 I2C / NewPing v1.9, etc.) only land in the new image, so migration is recommended.

---

## Server Operations

```bash
# Stop
docker stop digicode-compile-api

# Restart
docker start digicode-compile-api

# View logs
docker logs digicode-compile-api

# Remove completely
docker rm -f digicode-compile-api
docker rmi ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## Updates

When a new version is released:

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

## Troubleshooting

### Port 3001 in use

If another app is using port 3001:

```bash
# Use port 3002
docker run -d -p 3002:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

Change the server URL to `http://localhost:3002` in DigiCode settings.

### Docker won't start (Windows)

- Check WSL2 is installed
- Verify virtualization is enabled in BIOS/UEFI
- Restart the PC

### Docker won't start (Mac)

- Allow Docker in System Settings > Privacy & Security
- Restart the Mac

### Compile errors on Apple Silicon

- Verify you're using OrbStack or Docker Desktop for Apple Silicon
- Confirm x86 emulation is not needed (the ESP32 core is arm64-native)

### Compilation error

```bash
# Restart the container
docker restart digicode-compile-api

# If still failing, recreate
docker rm -f digicode-compile-api
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

### Cache doesn't HIT (same code triggers warm rebuild)

Check the `volumes` section of your `docker-compose.yml`. The named volumes `digicode-projects` and `digicode-cache` must be retained.

---

## Pros and Cons

| Item | Content |
|------|---------|
| ✅ Compilations | **Unlimited** (no cloud quota) |
| ✅ Speed | cache HIT ~1 ms / warm rebuild ~9.6 s / cold ~30-60 s |
| ✅ Offline | No internet needed after initial download (framework + libs ship in the image) |
| ✅ Same as cloud | Same image as cloud (ML30) — binary output matches physically (no lib drift) |
| ⚠️ Initial download | ~1 GB compressed, ~3.8 GB uncompressed |
| ⚠️ Setup | Docker installation required |
| ⚠️ Resources | Uses PC memory and CPU (4 GB RAM minimum recommended) |

---

## Related Documents

- [Getting Started](./getting-started.md) — Basic usage
- [Troubleshooting](./troubleshooting.md) — Common issues and solutions
