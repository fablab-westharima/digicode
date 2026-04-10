# 本地編譯伺服器設定

透過 DigiCode，您可以在自己的電腦上執行編譯伺服器，而不是使用雲端伺服器。這允許無限次數的高速編譯。

---

## ⚠️ 重要注意事項（請閱讀）

> **重要：Docker 映像檔大小**
>
> 本地編譯伺服器的 Docker 映像檔**約 10GB**。
> 下載需要時間，請注意以下事項：
>
> - **請勿使用手機熱點下載**
>   - 可能超過流量限制
>   - 可能產生高額費用
> - **建議使用穩定的有線連接（光纖等）**
> - 預估下載時間：
>   - 光纖（100Mbps）：約 15-20 分鐘
>   - 行動網路：**不建議**

---

## 需求

- **Docker Desktop**（免費）
- 穩定的網路連接（僅首次下載時）
- 硬碟空間：15GB 以上

---

## 步驟1：安裝 Docker Desktop

### Windows

1. 前往 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 點選「Download for Windows」
3. 執行下載的安裝程式
4. 按照螢幕上的指示操作
5. 安裝後重新啟動電腦

### Mac

1. 前往 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. 點選「Download for Mac」（選擇 Intel/Apple Silicon）
3. 開啟下載的 `.dmg` 檔案
4. 將 Docker 圖示拖到應用程式資料夾
5. 從應用程式啟動「Docker」

### 驗證安裝

在終端機（命令提示字元）中執行：

```bash
docker --version
```

如果看到 `Docker version 20.x.x` 或類似內容，表示已準備就緒。

---

## 步驟2：下載並啟動編譯伺服器

### 方法 A：一行指令（推薦）

在終端機（命令提示字元）中執行：

```bash
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

首次執行會下載約 10GB 映像檔。**建議使用有線連接。**

### 方法 B：使用 docker-compose.yml

1. 在任意資料夾建立 `docker-compose.yml` 檔案：

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

2. 在該資料夾開啟終端機並執行：

```bash
docker compose up -d
```

---

## 步驟3：驗證運作

### 命令列

```bash
curl http://localhost:3001/health
```

如果看到以下內容表示成功：

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

### 瀏覽器

前往 `http://localhost:3001/health` 並確認顯示上述 JSON。

---

## 步驟4：設定 DigiCode

1. 開啟 DigiCode
2. 在積木編輯器中點選「**燒錄**」按鈕旁的 ▼
3. 選擇「**本地伺服器**」
4. 執行編譯以驗證

---

## 伺服器操作

### 停止

```bash
docker stop digicode-compiler
```

### 重新啟動

```bash
docker start digicode-compiler
```

### 查看日誌

```bash
docker logs digicode-compiler
```

### 完全移除

```bash
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## 更新

當新版本發布時：

```bash
# 停止並移除舊容器
docker stop digicode-compiler
docker rm digicode-compiler

# 下載新映像檔
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest

# 重新啟動
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## 故障排除

### 連接埠 3001 被佔用

如果其他應用程式正在使用連接埠 3001：

```bash
# 在連接埠 3002 啟動
docker run -d -p 3002:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

在 DigiCode 設定中將伺服器 URL 變更為 `http://localhost:3002`。

### Docker 無法啟動（Windows）

- 確認 WSL2 已安裝
- 確認 Hyper-V 已啟用
- 重新啟動電腦

### Docker 無法啟動（Mac）

- 在系統偏好設定 > 安全性與隱私中允許 Docker
- 重新啟動 Mac

### 編譯錯誤

```bash
# 重新啟動容器
docker restart digicode-compiler

# 如果無效，重新建立
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## 優點與缺點

### 優點

- **無限次**編譯
- 無網路延遲的**快速編譯**
- 離線運作（首次下載後）

### 缺點

- 需要約 10GB 初次下載
- 需要安裝 Docker
- 使用電腦資源（記憶體、CPU）

---

## 相關文件

- [開始使用](./getting-started.md) - 基本用法
- [故障排除](./troubleshooting.md) - 常見問題與解決方法
