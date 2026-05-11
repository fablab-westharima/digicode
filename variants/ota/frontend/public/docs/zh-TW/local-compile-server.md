# 本機編譯伺服器

**最後更新:** 2026-05-11

DigiCode 的雲端編譯伺服器之外,你也可以用 Docker 容器在自己的電腦上跑編譯伺服器。雲端與本機使用 **相同的 Docker 映像**,因此編譯結果完全一致 (無函式庫漂移)。

---

## 🟡 開始前: 各 OS 推薦度

| OS | 本機伺服器架設 | 說明 |
|---|---|---|
| **macOS** | 🥇 一般使用者 OK | OrbStack (Apple Silicon 推薦) 一鍵安裝 + 終端機 `bash <(curl ...)` 一行 |
| **Linux** | 🥇 一般使用者 OK | apt / dnf / pacman 安裝 Docker + sh 一行 |
| **Windows** | 🟡 **進階使用者** | BIOS / WSL / Docker Desktop 多項前提條件,初學者負擔較大 |

> ⚠️ **Windows 使用者請注意**
>
> 本機編譯伺服器 (本頁) 與 **WiFi OTA 燒錄** 在 Windows 上屬於 **進階功能**。Windows 環境特有的前提條件 (BIOS 啟用虛擬化 / WSL2 升級 / Docker Desktop 安裝設定) 對初學者較為繁瑣。
>
> **Windows 初學者建議:**
> - 🥇 **雲端編譯** (Free 方案每月 50 次,付費方案額度更多)
> - 🥇 **USB 燒錄** 或 **Bluetooth (BLE) OTA** (DigiCode 內建 GUI 引導,無需額外安裝)
>
> 等熟悉開發環境後再嘗試本機伺服器 / WiFi OTA。下方疑難排解章節涵蓋 Windows 特有問題,但首次設定通常需要點耐心。
>
> Mac / Linux 使用者: 直接跳到下方快速安裝。

---

## 🚀 快速安裝

### 🥇 建議: Docker Desktop GUI 路徑 (Mac / Windows)

**官方映像 `digicollc/digicode-compile-server` 已發佈到 DockerHub。可從 Docker Desktop GUI 一鍵 Pull + Run**,無需操作終端機即可完成。

1. 啟動 Docker Desktop (尚未安裝請參考下方[各 OS 下載連結](#安裝-docker))
2. 在上方搜尋列輸入下列映像名稱 → 點擊 **「Pull」**
   ```
   digicollc/digicode-compile-server
   ```
3. 切換到 **Images** 分頁 → 對該映像點擊 **「Run」** → 展開 **Optional settings**
4. 設定:
   - **Container name**: `digicode-compile-server` (任意)
   - **Host port**: `3001`
   - **Container port**: `3001`
5. 點擊 **「Run」** → 切換到左側欄的 **「Containers」** 分頁,確認 `digicode-compile-server` 該列顯示綠色的 **「Running」** 標示,且 **Port(s)** 欄位顯示 `3001:3001`
6. 最後在瀏覽器開啟 [http://localhost:3001/health](http://localhost:3001/health) (`{"status":"ok",...}` = 成功)

> 📖 **Docker Desktop UI 因版本而異**
> 若用詞不同,請參考官方文件:
> - Pull / Run 流程: <https://docs.docker.com/desktop/use-desktop/images/>
> - Containers 分頁: <https://docs.docker.com/desktop/use-desktop/>

#### 🤖 取得映像、啟動容器卡住時請問 AI

複製下方提示詞,貼到 Gemini / ChatGPT 等 AI 助理。

```
請告訴我在最新版 Docker Desktop UI 中,如何從 DockerHub 搜尋映像、
Pull 並啟動容器。
請先查詢目前 Docker Desktop 的畫面構成,再回答。
- 映像名稱: digicollc/digicode-compile-server
- Container name: digicode-compile-server
- Host port: 3001
請以上述設定值,以新手為對象一步一步說明啟動步驟。
```

#### 🤖 啟動確認、故障排除卡住時請問 AI

```
請告訴我如何在 Docker Desktop 中確認容器是否正常運作。
請先查詢目前 Docker Desktop 的畫面構成,再回答。
容器名稱為 digicode-compile-server,連接埠為 3001。
請包含透過瀏覽器存取 http://localhost:3001/health 確認的方法。
```

> 💡 **DigiCode 內也提供相同指引**
> 開啟「編譯設定」→ 本機伺服器 → **「設定」**即可看到上述步驟 (DockerHub 映像名稱附複製按鈕)。

---

### 🛠 進階: 命令列路徑

伺服器運維 / 自動化 / Linux 環境適用。腳本會處理 Docker 檢查、容器啟動、連接埠衝突回避以及 DigiCode UI 整合。

#### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh)
```

#### Windows (PowerShell)

從開始選單啟動 **「Windows PowerShell」** (64 位元標準版,而非搜尋結果中也會出現的「x86」或「ISE」版本)。在 Windows 11 上若已安裝 PowerShell 7,使用 **「PowerShell」** 亦可。不需系統管理員權限。

```powershell
irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1 | iex
```

腳本會自動下載 Docker 映像、啟動容器,並透過 `http://localhost:3001/health` 確認運作正常。

---

## 五個步驟完成

1. 確認已安裝 **Docker** (若尚未安裝,參考下方 [Docker 下載連結](#安裝-docker);腳本也會在偵測到時提示)
2. 在終端機 / PowerShell 執行上方的 **快速安裝指令**
3. 在提示中確認 **連接埠** (3001 可用就直接 Enter,被佔用則接受建議的替代埠)
4. 在 DigiCode 中開啟 **「編譯設定 → 本機伺服器」** (若選了 3001 以外的連接埠,請在連接埠欄位填入相同值)
5. 點擊 **「連線測試」** 看到「OK」即完成

完成。後續編譯會走本機伺服器。

---

## 🗑️ 解除安裝

### 🥇 建議: Docker Desktop GUI 路徑

1. 開啟 Docker Desktop 的 **Containers** 分頁
2. **Stop → Delete** `digicode-compile-server` 容器
3. 在 **Volumes** 分頁刪除 `digicode-projects` / `digicode-cache` (快取會被清除)
4. 在 **Images** 分頁刪除 `digicollc/digicode-compile-server` (可選;保留可加速重新安裝)

### 🛠 進階: 命令列路徑

```bash
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh) uninstall
```

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1))) uninstall
```

> 💡 **DigiCode 內也提供相同指引**
> 開啟「編譯設定」→ 本機伺服器 → **「解除安裝」**即可看到相同步驟。

執行後會刪除容器、永續性磁碟區與設定資料夾,最後會詢問是否一併刪除 Docker 映像 (保留可加快重新安裝)。

> ⚠️ **編譯快取也會被清除**
> 解除安裝後第一次編譯會是冷啟動 (約 30〜60 秒)。

---

## ⚠️ 下載大小與首次執行時間

| 項目 | 大小 |
|---|---|
| Docker 映像 (壓縮 pull) | 約 5 GB |
| 磁碟使用量 (展開後) | **約 14 GB** (內含 PlatformIO frameworks + 函式庫) |
| 首次 pull (光纖 100 Mbps) | 約 7〜10 分鐘 |
| 首次編譯 (template caching) | 數分鐘 |
| 第二次以後編譯 (cache HIT) | 數秒 |

> ⚠️ **pull 之前請確認磁碟空間**
> 建議至少 **20 GB 以上**空閒空間 (展開後 14 GB + 暫存檔 + 編譯快取餘裕)。
>
> 請使用穩定的有線或 WiFi 連線,避免使用手機分享熱點 (大流量傳輸可能超過你的行動數據用量)。

建議使用 **穩定的有線連線** (100 Mbps 光纖約 1〜2 分鐘);手機熱點不建議。

---

## 安裝 Docker

腳本偵測到沒有 Docker 時,會顯示對應作業系統的下載網址。

### macOS

| 推薦對象 | 工具 | 網址 |
|---|---|---|
| Apple Silicon | **OrbStack** (輕量、快速) | https://orbstack.dev/ |
| Intel / Apple Silicon | Docker Desktop for Mac | https://www.docker.com/products/docker-desktop/ |

### Windows

**🥇 推薦: Microsoft Store**

在 Microsoft Store 搜尋「Docker Desktop」→ 確認發行者為 **Docker Inc** → 點擊「安裝」。MSIX 由 OS 統一管理,安裝過程中不會跳出額外 window,並可自動更新。一般使用者首選。

**直接安裝 (.exe)**

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (需 WSL2,安裝程式會引導)

> ⚠️ **重要**: 安裝程式啟動的所有 window (包含 cmd / PowerShell 子處理程序) 在安裝完成前 **絕對不要關閉**。中途關閉會導致 `C:\ProgramData\DockerDesktop` 處於損壞狀態,之後每次安裝都會出現「ProgramData\DockerDesktop must be owned by an elevated account」錯誤 (詳見下方[疑難排解](#docker-安裝出現-cprogramdatadockerdesktop-must-be-owned-by-an-elevated-account-錯誤))。

**輕量 / OSS 替代方案**

[Rancher Desktop](https://rancherdesktop.io/)、[Podman Desktop](https://podman-desktop.io/)

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER     # 登出後重新登入才會生效

# Fedora / RHEL / CentOS
sudo dnf install -y docker docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# Arch / Manjaro
sudo pacman -S --needed docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### 🤖 安裝 Docker Desktop 卡住時請問 AI

複製下方提示詞,貼到 Gemini / ChatGPT 等 AI 助理。請將 `[Windows/Mac]` 改成你自己的作業系統。

```
請告訴我如何在 [Windows/Mac] 安裝最新版 Docker Desktop。
請先查詢最新的官方資訊,然後以新手為對象一步一步說明。
```

---

## 子指令一覽

```bash
bash install.sh [子指令] [--port N]
# Windows
.\install.ps1 [子指令] [-Port N]
```

| 子指令 | 動作 |
|---|---|
| `install` (預設) | 詢問連接埠 → 拉取映像 → 啟動容器 → 用 `/health` 驗證 |
| `update` | 拉取最新映像並重建容器 (沿用先前的連接埠) |
| `uninstall` | 停止並移除容器、刪除磁碟區與設定資料夾 (映像會詢問) |
| `status` | 顯示容器狀態、映像、主機連接埠與 health check 結果 |
| `start` | 啟動已存在的 (停止中) 容器 |
| `stop` | 停止容器但不移除 (保留磁碟區、可快速重啟) |
| `help` | 內建說明 |

`update` / `status` / `start` / `stop` 會自動從生成的 `docker-compose.yml` 讀取目前的主機連接埠。

---

## 關於連接埠

`install` 一定會問你要用哪個主機連接埠。

- 3001 **未被佔用** → 預設 3001 (直接按 Enter 即可)
- 3001 **已被佔用** → 腳本會顯示佔用者 (pid + 程式名) 並建議下一個空閒連接埠 (例如 3002)

當 `curl ... | bash` 之類的 pipe 模式無法互動時,可預先設定環境變數:

```bash
PORT=3001 bash -c "$(curl -fsSL .../install.sh)"
```

```powershell
$env:PORT = 3001
irm .../install.ps1 | iex
```

**選擇 3001 以外的連接埠時**,請在 DigiCode 的「編譯設定 → 本機伺服器 → 連接埠」欄位填入相同數值。值會儲存在 `localStorage`,只需設定一次。

---

## 疑難排解

### 「Docker not found」

腳本已顯示對應作業系統的下載網址。安裝後重新執行即可。

### 「Docker is installed but not running」

啟動 Docker Desktop / OrbStack,等到圖示穩定後再重新執行。

### 連接埠 3001 已被佔用

腳本會自動偵測並建議替代連接埠。直接接受預設值或自行輸入即可,**不需要手動編輯 `docker-compose.yml`**。在 DigiCode UI 的連接埠欄位填入相同值即可。

### Health check 逾時

低規格機器的冷啟動較慢。檢查容器日誌:

```bash
docker logs digicode-compile-api
```

若看到 panic,請到 <https://github.com/fablab-westharima/digicode-installer/issues> 提交 issue 並附上日誌片段。

### Apple Silicon 編譯緩慢

請確認使用 Docker Desktop (Apple Silicon 版) 或 OrbStack。兩者皆原生支援 arm64;compile-api 映像為 multi-arch,不需 x86 模擬。

### Docker 安裝出現「C:\ProgramData\DockerDesktop must be owned by an elevated account」錯誤

**原因**: 先前的 Docker Desktop 安裝在中途失敗 — 通常是安裝程式啟動的 cmd / PowerShell 子視窗被使用者意外關閉。`C:\ProgramData\DockerDesktop` 殘留資料夾擁有者錯誤,之後所有安裝 (含 Microsoft Store 版) 都會被同一個權限檢查擋下。

**解法**: 開啟 **管理員 PowerShell** (開始選單 → PowerShell 右鍵 → 「以系統管理員身分執行」),執行下列 4 行指令後重新執行 Docker Desktop 安裝程式:

```powershell
Remove-Item "C:\ProgramData\DockerDesktop" -Recurse -Force
New-Item -ItemType Directory -Path "C:\ProgramData\DockerDesktop" -Force | Out-Null
icacls "C:\ProgramData\DockerDesktop" /setowner "*S-1-5-32-544" /T
icacls "C:\ProgramData\DockerDesktop" /grant "*S-1-5-32-544:(OI)(CI)F" /T
```

`*S-1-5-32-544` 是 Administrators 群組 SID,英文版/日文版 Windows 都適用。Microsoft Store 版安裝若遇到同樣錯誤,套用相同步驟即可。

> 💡 **預防**: 直接安裝 (.exe) 過程中切勿關閉子處理程序視窗。若想避免此風險,改用 Microsoft Store 版 (MSIX 不會啟動額外視窗)。

### Docker Desktop 啟動失敗,顯示「Virtualization support not detected」

**原因**: BIOS / UEFI 中 CPU 的硬體虛擬化 (Intel VT-x / AMD-V) 被關閉。CPU 本身支援,但作業系統看不到。

**確認**: 工作管理員 (Ctrl + Shift + Esc) → 「效能」分頁 → CPU → 右下「虛擬化」欄位。若顯示「停用」則需修改 BIOS。

**解法**:

1. 重新啟動 → 開機 logo 出現時連按 BIOS 鍵 (DELL / ASUS = `F2` 或 `Del`、HP = `F10`、Lenovo = `F1` / `F2`、自組電腦依主機板廠商)
2. BIOS / UEFI 中將下列其中之一改為 **Enabled**:
   - Intel CPU: **Virtualization Technology (VTx)** / **Intel VT-x**
   - AMD CPU: **SVM Mode** / **AMD-V**
3. 位置依機型: 通常在 `Advanced`、`System Options`、`CPU Configuration` 或 `Security` 之下
4. `F10` (Save & Exit) → Yes → 重新啟動
5. Windows 啟動後重新檢查工作管理員 → CPU → 虛擬化顯示「已啟用」→ 啟動 Docker Desktop

> ⚠️ 不要動 `Intel Trusted Execution Technology (TXT)` 與 `DMA Protection` — 可能導致 Windows 無法開機,且 Docker 不需要這些。

### Docker Desktop 啟動失敗,顯示「WSL needs updating」

WSL2 (Windows Subsystem for Linux) 核心版本太舊,Docker Desktop 無法啟動。

**解法**: 開啟 PowerShell (建議系統管理員):

```powershell
wsl --update
```

下載 + 安裝約 30-60 秒。完成後回到 Docker Desktop 畫面點 **Try Again**。狀態列右下從 `Engine starting` 變為 `Engine running` 即成功。

> 若 `wsl --update` 出現「WSL 未安裝」錯誤,改用 **管理員 PowerShell** 執行 `wsl --install` (clean install)。Windows 可能需要重新啟動。

### Docker Desktop 首次啟動的「Welcome to Docker」登入畫面

點選右上的 **Skip** 即可。DigiCode 本機編譯伺服器不需要 Docker Hub 帳號 — 我們的映像放在 GitHub Container Registry (`ghcr.io`),可匿名 pull。

---

## 為什麼使用本機伺服器?

- ✅ **編譯次數無限**: 不消耗雲端編譯額度
- ✅ **低延遲**: 無網路往返;暖編譯只需數秒
- ✅ **可離線**: 第一次拉取映像後就不需網路
- ✅ **結果一致**: 與雲端使用相同 Docker 映像

### 各方案推薦度

| 方案 | 推薦度 | 原因 |
|---|---|---|
| Free | — | 雲端 50 次/月通常已足夠 |
| Lite | ▲ | 月 250 次不夠時可考慮 |
| Pro | ◎ | 月 500 次仍不足的重度使用者 |
| Enterprise | ◎ | 全班同時編譯加速、可離線教學 |

### 編譯耗時參考

| 情境 | 耗時 |
|---|---|
| Docker pull 後第一次編譯 | 數分鐘 (template + lib cache 建立) |
| 冷啟動 (容器重啟後第一次) | 30〜60 秒 |
| 變更一個位元組 (warm rebuild) | 約 9.6 秒 |
| 相同程式碼重新編譯 (cache HIT) | 約 1 ms |

本機伺服器與雲端 (ML30) 使用相同 Docker 映像,二進位輸出實體完全一致 (無函式庫漂移)。

---

## 相關文件

- [快速上手](./getting-started.md)
- [疑難排解](./troubleshooting.md)
- 安裝程式原始碼: [`fablab-westharima/digicode-installer`](https://github.com/fablab-westharima/digicode-installer) (Public、MIT)
