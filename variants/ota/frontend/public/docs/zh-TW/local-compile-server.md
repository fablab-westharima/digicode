# 本地編譯伺服器設定

**最後更新:** 2026-04-21

您可以在自己的電腦上執行編譯伺服器，而不是使用 DigiCode 的雲端伺服器。

---

## 用途

- **無限次編譯** — 不消耗雲端編譯配額
- **高速編譯** — 無網路延遲
- **離線使用** — 初次下載後不需網際網路

### 方案別推薦

| 方案 | 推薦度 | 原因 |
|------|:------:|------|
| Free | — | 雲端編譯配額（每月 50 次）通常已足夠 |
| Lite | ▲ | 每月 250 次不足時考慮 |
| Pro | ◎ | 適合超過每月 500 次的高頻率使用 |
| Enterprise | ◎ | 對整個班級的編譯加速很有效 |

---

## ⚠️ 重要注意事項

> **注意: Docker 映像大小**
>
> 本地編譯伺服器的 Docker 映像約 **10 GB**。
>
> - **請勿透過手機熱點下載**（可能超出流量上限或產生高額費用）
> - **推薦使用穩定的固定寬頻（光纖等）**
> - 預估下載時間：100 Mbps 光纖約 15〜20 分鐘

---

## 所需環境

需要可執行 Docker 的環境。請從以下選項中選擇。

### 選項 A: Docker Desktop（標準）

- 支援 **Windows / Mac / Linux**
- **個人使用免費**，商業用途需要付費方案
- https://www.docker.com/products/docker-desktop/

### 選項 B: Docker Desktop 替代品（輕量・OSS）

商業使用或想要更輕量環境時：

| 工具 | 作業系統 | 特色 |
|------|---------|------|
| **OrbStack** | macOS | 輕量・高速・省記憶體、Apple Silicon 原生支援 |
| **Rancher Desktop** | Windows / macOS / Linux | OSS（免費） |
| **Podman Desktop** | Windows / macOS / Linux | OSS、無守護程序 |

### 選項 C: 直接安裝 Docker Engine（Linux）

在 Linux 上可以直接安裝 Docker Engine，不需要 Docker Desktop。

---

## 步驟 1: 安裝 Docker 環境

### Windows

1. 從 https://www.docker.com/products/docker-desktop/ 下載 Docker Desktop for Windows
2. 執行安裝程式（需要 WSL2，安裝程式會引導）
3. 安裝完成後重新啟動電腦

### Mac（Intel）

1. 從 https://www.docker.com/products/docker-desktop/ 下載 Docker Desktop for Mac（Intel）
2. 開啟 `.dmg` 並拖放到 Applications
3. 從 Applications 啟動「Docker」

### Mac（Apple Silicon: M1/M2/M3/M4）

**推薦: OrbStack**

Docker Desktop for Mac（Apple Silicon 版）也可以運作，但 OrbStack 更快速、省記憶體。

1. 從 https://orbstack.dev/ 下載 OrbStack
2. 安裝後即可使用 docker 指令

如果使用 Docker Desktop，請安裝 Apple Silicon 版（`.dmg`）。

> ESP32 核心已支援 arm64 原生，一般使用不需要 x86 模擬。

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# 登出並重新登入以套用群組變更
```

### 確認安裝

```bash
docker --version
```

顯示 `Docker version 20.x.x` 即可。

---

## 步驟 2: 下載・啟動編譯伺服器

### 方法 A: 一行指令啟動（推薦）

```bash
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

初次執行時下載約 10 GB 的映像。**推薦使用固定寬頻。**

### 方法 B: 使用 docker-compose

在任意資料夾中建立 `docker-compose.yml` 檔案：

```yaml
services:
  digicode-compiler:
    image: ghcr.io/fablab-westharima/digicode-compile-server:latest
    container_name: digicode-compiler
    ports:
      - "3001:3001"
    restart: unless-stopped
```

在該資料夾中開啟終端機並執行：

```bash
docker compose up -d
```

---

## 步驟 3: 確認動作

```bash
curl http://localhost:3001/health
```

顯示以下內容即為成功：

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

也可以在瀏覽器存取 `http://localhost:3001/health` 確認。

---

## 步驟 4: 在 DigiCode 中設定

1. 開啟 DigiCode
2. 點擊「**燒錄**」按鈕旁的▼
3. 選擇「**本地伺服器**」
4. 執行編譯並確認動作

---

## 伺服器操作

```bash
# 停止
docker stop digicode-compiler

# 重新啟動
docker start digicode-compiler

# 查看日誌
docker logs digicode-compiler

# 完全刪除
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## 更新

發布新版本時：

```bash
docker stop digicode-compiler
docker rm digicode-compiler
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## 故障排除

### 埠 3001 已被使用

其他應用程式使用埠 3001 時：

```bash
# 使用埠 3002 啟動
docker run -d -p 3002:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

在 DigiCode 設定中將伺服器 URL 改為 `http://localhost:3002`。

### Docker 無法啟動（Windows）

- 確認 WSL2 已安裝
- 確認 BIOS/UEFI 中已啟用虛擬化
- 重新啟動電腦

### Docker 無法啟動（Mac）

- 在系統設定 > 隱私與安全性 中允許 Docker
- 重新啟動 Mac

### Apple Silicon 上編譯錯誤

- 確認使用 OrbStack 或 Docker Desktop for Apple Silicon
- 確認不需要 x86 模擬（ESP32 核心已支援 arm64 原生）

### 發生編譯錯誤

```bash
# 重新啟動容器
docker restart digicode-compiler

# 仍無法解決時重新建立
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## 優點・缺點

| 項目 | 內容 |
|------|------|
| ✅ 編譯次數 | **無限制**（不消耗雲端配額） |
| ✅ 速度 | 無網路延遲、高速 |
| ✅ 離線 | 初次下載後不需網際網路 |
| ⚠️ 初次下載 | 約 10 GB（推薦固定寬頻） |
| ⚠️ 安裝 | 需要設定 Docker |
| ⚠️ 資源 | 使用電腦的記憶體和 CPU（推薦至少 4 GB RAM） |

---

## 相關文件

- [開始使用](./getting-started.md) — 基本使用方法
- [故障排除](./troubleshooting.md) — 常見問題與解決方法
