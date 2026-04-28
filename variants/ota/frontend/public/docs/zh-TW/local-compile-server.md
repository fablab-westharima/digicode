# 本地編譯伺服器設定

**最後更新:** 2026-04-29

您可以在自己的電腦上執行編譯伺服器，而不是使用 DigiCode 的雲端伺服器。雲端與本地都使用 **同一個 Docker 映像**，因此編譯結果完全一致（無 lib drift）。

---

## 用途

- **編譯次數無限制** — 不消耗雲端編譯額度
- **高速編譯** — 無網路延遲，永久快取讓重新建置最少約 1 ms / 約 9.6 秒
- **離線使用** — 初次取得映像後不需網際網路

### 各方案推薦度

| 方案 | 推薦度 | 理由 |
|------|:------:|------|
| Free | — | 雲端額度（每月 50 次）通常足夠 |
| Lite | ▲ | 每月 250 次不夠時可考慮 |
| Pro | ◎ | 適合每月超過 500 次的高頻率使用者 |
| Enterprise | ◎ | 對全班同時編譯加速有效 |

---

## ⚠️ 注意事項（請務必閱讀）

> **重要: Docker 映像大小**
>
> 本地編譯伺服器的 Docker 映像大小如下（PlatformIO Core 基礎，v0.1.0）：
>
> - **下載（壓縮）: 約 1 GB**
> - **磁碟使用量（解壓縮後）: 約 3.8 GB**
>
> - **請勿透過手機分享網路下載** — 請使用穩定的固定線路（光纖等）
> - 估計時間：100 Mbps 光纖約 1〜2 分鐘

---

## 必要環境

需要可執行 Docker 的環境，請從以下選項中選一個。

### 選項 A: Docker Desktop（標準）

- 支援 **Windows / Mac / Linux**
- **個人使用免費**，商業使用需付費方案
- https://www.docker.com/products/docker-desktop/

### 選項 B: Docker Desktop 替代方案（輕量 / OSS）

如需商業使用或更輕量的環境：

| 工具 | 對應 OS | 特色 |
|------|--------|------|
| **OrbStack** | macOS | 輕量、快速、低記憶體用量、Apple Silicon 原生支援 |
| **Rancher Desktop** | Windows / macOS / Linux | OSS（免費） |
| **Podman Desktop** | Windows / macOS / Linux | OSS、無 daemon |

### 選項 C: 直接安裝 Docker Engine（Linux）

在 Linux 上可直接安裝 Docker Engine（不需要 Docker Desktop）。

---

## 步驟 1: 安裝 Docker 環境

### Windows

1. 從 https://www.docker.com/products/docker-desktop/ 下載 Docker Desktop for Windows
2. 執行安裝程式（需要 WSL2，安裝程式會引導）
3. 安裝完成後重新啟動電腦

### Mac（Intel）

1. 從 https://www.docker.com/products/docker-desktop/ 下載 Docker Desktop for Mac (Intel)
2. 開啟 `.dmg` 並拖曳至 Applications
3. 從 Applications 啟動「Docker」

### Mac（Apple Silicon: M1/M2/M3/M4）

**推薦: OrbStack**

Docker Desktop for Mac (Apple Silicon 版) 也可使用，但 OrbStack 較快且記憶體用量更低。

1. 從 https://orbstack.dev/ 下載 OrbStack
2. 安裝後即可直接使用 docker 命令

若使用 Docker Desktop，請安裝 Apple Silicon 版（`.dmg`）。

> ESP32 core 已原生支援 arm64，一般用途不需要 x86 模擬。

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# 登出並重新登入以套用群組變更
```

### 驗證安裝

```bash
docker --version
```

若顯示 `Docker version 20.x.x` 即代表 OK。

---

## 步驟 2: 下載並啟動編譯伺服器

### 方法 A: 一行命令啟動

```bash
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

初次執行會下載約 1 GB 的映像（解壓後 3.8 GB）。**請使用固定線路。**

### 方法 B: 使用 docker-compose.yml（推薦，含永久快取）

在任何資料夾中建立 `docker-compose.yml`：

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

在該資料夾開啟終端機：

```bash
docker compose up -d
```

> `digicode-projects` 與 `digicode-cache` 是命名磁碟區，會保留編譯狀態。**第二次以相同程式碼編譯約 1 ms（cache HIT）**，更動 1 byte 的 warm rebuild 約 9.6 秒。若使用暫時磁碟區（`docker run` 未指定 `-v`），刪除容器時快取會遺失。

---

## 步驟 3: 驗證

```bash
curl http://localhost:3001/health
```

若顯示以下訊息即為成功（請確認 `service` 與 `version`）：

```json
{
  "status": "ok",
  "service": "digicode-compile-api",
  "version": "0.1.0",
  "timestamp": "..."
}
```

也可從瀏覽器開啟 `http://localhost:3001/health` 確認。

---

## 步驟 4: 在 DigiCode 中設定

1. 開啟 DigiCode
2. 點選「**上傳**」按鈕旁的 ▼
3. 選擇「**本地伺服器**」
4. 執行編譯以驗證

第一次編譯（cold）約 30〜60 秒 — PlatformIO + framework + 函式庫已包含在映像內，輸出結果與雲端 (ML30) 在 byte 等級一致。

---

## 從舊映像遷移（既有使用者，1 個步驟）

到 2026-04 為止我們發行的是 `ghcr.io/fablab-westharima/digicode-compile-server`（arduino-cli 基礎）。遷移到新映像 `digicode-compile-api`（PlatformIO Core 基礎）**只需更換映像名稱**。

```bash
# 停止並移除舊映像
docker stop digicode-compiler 2>/dev/null
docker rm digicode-compiler 2>/dev/null
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest 2>/dev/null

# 啟動新映像
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

**變更點：**

- 映像名稱: `digicode-compile-server` → `digicode-compile-api`
- 容器名稱: `digicode-compiler` → `digicode-compile-api`（可選）
- 連接埠: 3001 不變
- DigiCode UI 設定（URL `http://localhost:3001`）: 不變
- API contract: 相容 — 僅 `/health` 的 `service` / `version` 欄位變動

舊版 repository [fablab-westharima/arduino-compile-server](https://github.com/fablab-westharima/arduino-compile-server) 已於 2026-04-29 封存。雲端側修正的函式庫問題（QTRSensors / MFRC522 I2C / NewPing v1.9 等）僅反映在新映像，建議遷移。

---

## 伺服器操作

```bash
# 停止
docker stop digicode-compile-api

# 重新啟動
docker start digicode-compile-api

# 查看日誌
docker logs digicode-compile-api

# 完全移除
docker rm -f digicode-compile-api
docker rmi ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## 更新

新版本發布時：

```bash
# docker-compose 方式
docker compose pull
docker compose up -d
```

```bash
# docker run 方式
docker stop digicode-compile-api
docker rm digicode-compile-api
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## 疑難排解

### 連接埠 3001 已被使用

若其他應用程式佔用了 3001：

```bash
# 改用 3002
docker run -d -p 3002:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

請在 DigiCode 設定中將伺服器 URL 改為 `http://localhost:3002`。

### Docker 無法啟動（Windows）

- 確認已安裝 WSL2
- 確認 BIOS/UEFI 中已啟用虛擬化
- 重新啟動電腦

### Docker 無法啟動（Mac）

- 在系統設定 > 隱私權與安全性 中允許 Docker
- 重新啟動 Mac

### 在 Apple Silicon 上發生編譯錯誤

- 確認使用 OrbStack 或 Docker Desktop for Apple Silicon
- 確認不需要 x86 模擬（ESP32 core 已支援 arm64）

### 發生編譯錯誤

```bash
# 重新啟動容器
docker restart digicode-compile-api

# 仍無法解決時請重新建立
docker rm -f digicode-compile-api
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

### 快取沒有命中（相同程式碼觸發 warm rebuild）

請檢查 `docker-compose.yml` 的 `volumes` 區段。命名磁碟區 `digicode-projects` 與 `digicode-cache` 必須保留。

---

## 優缺點

| 項目 | 內容 |
|------|------|
| ✅ 編譯次數 | **無限制**（不消耗雲端額度） |
| ✅ 速度 | cache HIT 約 1 ms / warm rebuild 約 9.6 秒 / cold 約 30〜60 秒 |
| ✅ 離線 | 初次下載後不需網際網路（framework + 函式庫已包含於映像中） |
| ✅ 與雲端一致 | 與雲端 (ML30) 使用相同映像，輸出 binary 物理上一致（無 lib drift） |
| ⚠️ 初次下載 | 約 1 GB 壓縮、3.8 GB 解壓 |
| ⚠️ 安裝 | 需要設定 Docker |
| ⚠️ 資源 | 使用 PC 的記憶體與 CPU（建議至少 4 GB RAM） |

---

## 相關文件

- [快速入門](./getting-started.md) — 基本用法
- [疑難排解](./troubleshooting.md) — 常見問題與解法
