# Local Compile Server Setup

With DigiCode, you can run a compile server on your own computer instead of the cloud server. This allows unlimited compilations at high speed.

---

## ⚠️ Important Notice (Please Read)

> **Important: Docker Image Size**
>
> The local compile server Docker image is **approximately 10GB**.
> Download takes time, so please note the following:
>
> - **Do not download using mobile hotspot**
>   - May exceed data limits
>   - Could result in high charges
> - **Stable wired connection (fiber optic, etc.) recommended**
> - Estimated download time:
>   - Fiber optic (100Mbps): ~15-20 minutes
>   - Mobile connection: **Not recommended**

---

## Requirements

- **Docker Desktop** (free)
- Stable internet connection (initial download only)
- Disk space: 15GB or more

---

## Step 1: Install Docker Desktop

### Windows

1. Visit [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Click "Download for Windows"
3. Run the downloaded installer
4. Follow on-screen instructions
5. Restart PC after installation

### Mac

1. Visit [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Click "Download for Mac" (select Intel/Apple Silicon)
3. Open the downloaded `.dmg` file
4. Drag Docker icon to Applications folder
5. Launch "Docker" from Applications

### Verify Installation

Run in terminal (command prompt):

```bash
docker --version
```

If you see `Docker version 20.x.x` or similar, you're ready.

---

## Step 2: Download and Start Compile Server

### Method A: One-Line Command (Recommended)

Run in terminal (command prompt):

```bash
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

First run downloads ~10GB image. **Wired connection recommended.**

### Method B: Using docker-compose.yml

1. Create `docker-compose.yml` file in any folder:

```yaml
version: '3.8'

services:
  digicode-compiler:
    image: ghcr.io/fablab-westharima/digicode-compile-server:latest
    container_name: digicode-compiler
    ports:
      - "3001:3001"
    restart: unless-stopped
```

2. Open terminal in that folder and run:

```bash
docker compose up -d
```

---

## Step 3: Verify Operation

### Command Line

```bash
curl http://localhost:3001/health
```

If you see this, success:

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

### Browser

Access `http://localhost:3001/health` and verify the JSON above is displayed.

---

## Step 4: Configure DigiCode

1. Open DigiCode
2. Click ▼ next to "**Upload**" button in block editor
3. Select "**Local Server**"
4. Run compile to verify

---

## Server Operations

### Stop

```bash
docker stop digicode-compiler
```

### Restart

```bash
docker start digicode-compiler
```

### View Logs

```bash
docker logs digicode-compiler
```

### Complete Removal

```bash
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Updates

When new version is released:

```bash
# Stop and remove old container
docker stop digicode-compiler
docker rm digicode-compiler

# Download new image
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest

# Restart
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Troubleshooting

### Port 3001 in Use

If another application is using port 3001:

```bash
# Start on port 3002
docker run -d -p 3002:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

Change server URL to `http://localhost:3002` in DigiCode settings.

### Docker Won't Start (Windows)

- Verify WSL2 is installed
- Verify Hyper-V is enabled
- Restart PC

### Docker Won't Start (Mac)

- Allow Docker in System Preferences > Security & Privacy
- Restart Mac

### Compile Errors

```bash
# Restart container
docker restart digicode-compiler

# If that doesn't work, recreate
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## Advantages & Disadvantages

### Advantages

- **Unlimited** compilations
- **Fast compilation** with no network latency
- Works offline (after initial download)

### Disadvantages

- ~10GB initial download required
- Docker installation required
- Uses PC resources (memory, CPU)

---

## Related Documents

- [Getting Started](./getting-started.md) - Basic usage
- [Troubleshooting](./troubleshooting.md) - Common problems and solutions
