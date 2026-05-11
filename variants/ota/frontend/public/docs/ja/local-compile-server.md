# ローカルコンパイルサーバー

**最終更新:** 2026-05-11

DigiCode のクラウドコンパイルサーバーの代わりに、自分のパソコンで Docker コンテナとしてコンパイルサーバーを動かせます。クラウドとローカルは **同じ Docker イメージ** で動作するため、コンパイル結果は完全に一致します（lib drift なし）。

---

## 🟡 まず: 推奨度と前提知識

| OS | ローカルサーバー構築 | 補足 |
|---|---|---|
| **macOS** | 🥇 標準ユーザー OK | OrbStack (Apple Silicon 推奨) で 1 click + Terminal で `bash <(curl ...)` 1 行 |
| **Linux** | 🥇 標準ユーザー OK | apt / dnf / pacman で Docker install + sh 1 行 |
| **Windows** | 🟡 **上級者向け** | BIOS / WSL / Docker Desktop の前提条件が複数あり、初心者には負担大 |

> ⚠️ **Windows ユーザーの方へ**
>
> ローカルコンパイルサーバー構築 (本ページ) と **WiFi OTA 書き込み** は Windows では **上級者向け** です。Windows 環境固有の前提条件 (BIOS で仮想化を有効化 / WSL2 update / Docker Desktop install + setup) が複数あり、初学者には負担が大きいため。
>
> **Windows 初心者の方には:**
> - 🥇 **クラウドコンパイル** (Free プランでも月 50 回、有料プランで増枠) を推奨
> - 🥇 書き込みは **USB 書き込み** または **Bluetooth (BLE) OTA** を推奨 (どちらも DigiCode が標準 GUI で案内、追加の install 不要)
>
> ローカルサーバー / WiFi OTA は dev 環境に慣れた段階で挑戦してください。下記のトラブルシュート section で Windows 固有の問題を網羅していますが、最初からスムーズに通るとは限りません。
>
> Mac / Linux ユーザーの方はそのまま下のクイックインストールへ進んでください。

---

## 🚀 クイックインストール

### 🥇 推奨: Docker Desktop GUI 経路 (Mac / Windows)

**DockerHub に publish 済みの公式イメージ `digicollc/digicode-compile-server` を Docker Desktop GUI から 1 click pull + run できます。** ターミナル操作なしで完結します。

1. Docker Desktop を起動 (未インストールの場合は[後述の OS 別 DL URL](#docker-環境のインストール)を参照)
2. 上部検索バーに次のイメージ名を入力 → **「Pull」**
   ```
   digicollc/digicode-compile-server
   ```
3. **Images** タブで該当イメージの **「Run」** をクリック → **Optional settings** を展開
4. 設定:
   - **Container name**: `digicode-compile-server` (任意)
   - **Host port**: `3001`
   - **Container port**: `3001`
5. **「Run」** で起動 → 左サイドバーの **「Containers」** タブに切り替え、`digicode-compile-server` 行が **緑色の「Running」** 表示で **Port(s)** 列に `3001:3001` と並んでいることを確認
6. 仕上げにブラウザで [http://localhost:3001/health](http://localhost:3001/health) を開く (`{"status":"ok",...}` が表示されれば成功)

> 📖 **Docker Desktop の UI はバージョンで変わります**
> 用語が変わった場合は公式ガイドを参照:
> - Pull / Run 手順: <https://docs.docker.com/desktop/use-desktop/images/>
> - Containers タブ: <https://docs.docker.com/desktop/use-desktop/>

> 💡 **DigiCode UI からもガイド表示**
> 「コンパイル設定」ダイアログ → ローカルサーバー → **「セットアップ」ボタン**で、上記手順がそのまま表示されます (DockerHub イメージ名コピー機能付き)。

---

### 🛠 上級者向け: コマンドライン経路

サーバ運用 / 自動化 / Linux 環境向け。スクリプトが Docker check + container 起動 + port 衝突回避 + DigiCode UI 連携まで自動化します。

#### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh)
```

#### Windows (PowerShell)

スタートメニューから **「Windows PowerShell」** (64-bit 標準版、検索結果に出る `x86` や `ISE` ではない方) を起動してください。Windows 11 で PowerShell 7 を入れている場合は **「PowerShell」** でも OK。管理者権限は不要です。

```powershell
irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1 | iex
```

実行すると Docker イメージを取得してコンテナを起動し、`http://localhost:3001/health` で動作確認まで自動で行います。

---

## 5 ステップで完了

1. **Docker** がインストールされていることを確認 (未インストールの場合は[後述の OS 別 DL URL](#docker-環境のインストール)を参照、スクリプトも自動で案内します)
2. 上の **クイックインストールコマンド** をターミナル / PowerShell で実行
3. プロンプトで **ポート番号** を確認 (3001 が空いていれば Enter、使用中なら別ポートを提示)
4. DigiCode で **「コンパイル設定」 → ローカルサーバー** を選択 (ポート 3001 以外を選んだ場合はポート番号入力欄に同じ値を入力)
5. **「接続テスト」** ボタンで「接続OK」表示を確認

完了です。以後コンパイルはローカル経由で実行されます。

---

## 🗑️ アンインストール

### 🥇 推奨: Docker Desktop GUI 経路

1. Docker Desktop の **「Containers」** タブを開く
2. `digicode-compile-server` コンテナを **Stop → Delete**
3. **「Volumes」** タブで `digicode-projects` / `digicode-cache` を **Delete** (キャッシュも消えます)
4. **「Images」** タブで `digicollc/digicode-compile-server` を **Delete** (任意、再 install 時間短縮のために残してもよい)

### 🛠 上級者向け: コマンドライン経路

```bash
# macOS / Linux
bash <(curl -fsSL https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.sh) uninstall
```

```powershell
# Windows (PowerShell)
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main/install.ps1))) uninstall
```

> 💡 **DigiCode UI からもガイド表示**
> 「コンパイル設定」ダイアログ → ローカルサーバー → **「アンインストール」ボタン**で同じ手順が表示されます。

実行するとコンテナ + 永続ボリューム + 設定フォルダが削除され、最後に Docker イメージを削除するか確認されます (拒否すると再インストールが速くなります)。

> ⚠️ **コンパイルキャッシュも消えます**
> アンインストール後の最初のコンパイルは ~30〜60 秒の cold start になります。

---

## ⚠️ ダウンロードサイズと初回時間

| 項目 | サイズ / 時間 |
|---|---|
| Docker イメージ (DL 圧縮) | 約 5 GB |
| ディスク使用量 (展開後) | **約 14 GB** (PlatformIO フレームワーク + lib 同梱) |
| 初回 pull 時間 (光回線 100 Mbps) | 約 7〜10 分 |
| 初回コンパイル (template caching) | 数分 |
| 2 回目以降コンパイル (cache HIT) | 数秒 |

> ⚠️ **ディスク空き容量を確認してから pull してください**
> 約 **20 GB 以上**の空きを確保推奨 (展開後 14 GB + 一時ファイル + コンパイルキャッシュ用余裕)。
>
> スマートフォンのテザリングではなく、**安定した固定回線 / WiFi** でのダウンロードを推奨します (通信量超過対策)。

---

## Docker 環境のインストール

スクリプトが Docker 未インストールを検出すると、OS に応じて以下の URL を案内します。

### macOS

| 推奨度 | ツール | URL |
|---|---|---|
| ◎ Apple Silicon | **OrbStack** (軽量・高速) | https://orbstack.dev/ |
| ◎ | Docker Desktop for Mac | https://www.docker.com/products/docker-desktop/ |

### Windows

**🥇 推奨: Microsoft Store**

Microsoft Store で「Docker Desktop」を検索 → 発行元が **Docker Inc** であることを確認 → 「インストール」をクリック。MSIX で OS が install を一元管理するため、install 中に追加 window が出ず、ストア経由で自動更新される。一般 user / 老若男女向けの第一候補。

**直接 install (.exe)**

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (WSL2 必須、インストーラが案内)

> ⚠️ **重要**: Installer が起動するすべての window (cmd / PowerShell の subprocess を含む) は **install 完了まで絶対に閉じないでください**。途中で window を閉じると `C:\ProgramData\DockerDesktop` が壊れた状態で残り、以降の install で「ProgramData\DockerDesktop must be owned by an elevated account」エラーが連発します (下記 [トラブルシュート](#docker-install-が-programdatadockerdesktop-must-be-owned-by-an-elevated-account-で失敗する) 参照)。

**軽量・OSS 代替**

[Rancher Desktop](https://rancherdesktop.io/) / [Podman Desktop](https://podman-desktop.io/)

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER     # ログアウト/再ログインで反映

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

## サブコマンド一覧

```bash
bash install.sh [サブコマンド] [--port N]
# Windows
.\install.ps1 [サブコマンド] [-Port N]
```

| サブコマンド | 動作 |
|---|---|
| `install` (デフォルト) | ポートを確認 → イメージ pull → コンテナ起動 → /health で動作確認 |
| `update` | 最新イメージを pull してコンテナ再作成 (ポートは前回値を保持) |
| `uninstall` | コンテナ + ボリューム + 設定フォルダを削除 (イメージ削除は確認あり) |
| `status` | コンテナの状態 / イメージ / ホストポート / health check 結果を表示 |
| `start` | 停止中のコンテナを起動 |
| `stop` | コンテナを停止 (ボリュームは保持、再 start で素早く復帰) |
| `help` | 内蔵ヘルプ表示 |

`update` / `status` / `start` / `stop` は生成済みの `docker-compose.yml` から実際のホストポートを自動読み取りします。

---

## ポート番号について

`install` は常にどのホストポートを使うか確認します。

- 3001 が **空いていれば** デフォルト 3001 (そのまま Enter で OK)
- 3001 が **使用中なら** スクリプトが占有元 (pid + プロセス名) を表示し、次の空きポート (3002 等) を提示

`curl ... | bash` (パイプ実行) で対話プロンプトを使えない場合は、環境変数で事前指定:

```bash
PORT=3001 bash -c "$(curl -fsSL .../install.sh)"
```

```powershell
$env:PORT = 3001
irm .../install.ps1 | iex
```

**3001 以外のポートを選んだ場合**は、DigiCode の「コンパイル設定 → ローカルサーバー → ポート番号」欄に同じ値を入力してください。`localStorage` に保存されるので一度入力すれば次回以降は不要です。

---

## トラブルシューティング

### 「Docker not found」

スクリプトが OS 別の DL URL を表示します。インストールしてから再実行してください。

### 「Docker is installed but not running」

Docker Desktop / OrbStack を起動して、アイコンが落ち着くまで待ってから再実行してください。

### Port 3001 already in use

スクリプトが自動検出して別ポートを提示します。Enter で受け入れるか、独自ポートを入力してください。`docker-compose.yml` を手動編集する必要はありません。DigiCode UI のポート番号入力欄に同じ値を入れれば動作します。

### Health check timed out

低スペックマシンでは初回 cold start が長くなることがあります。コンテナログを確認:

```bash
docker logs digicode-compile-api
```

panic / エラーが出ている場合は <https://github.com/fablab-westharima/digicode-installer/issues> に log 抜粋を添えて報告してください。

### Apple Silicon でコンパイルが遅い

Docker Desktop (Apple Silicon ビルド) または OrbStack を使っているか確認してください。両方とも arm64 ネイティブで動作します (compile-api イメージは multi-arch、x86 エミュレーション不要)。

### Docker install が「ProgramData\DockerDesktop must be owned by an elevated account」で失敗する

**原因**: 過去の Docker Desktop install が途中で失敗 (例: installer が spawn した cmd / PowerShell window をユーザーが意図せず閉じた) して、`C:\ProgramData\DockerDesktop` が誤った所有者で残ったまま。以降の install attempt は同じ場所をチェックして reject し続ける。

**対処**: **管理者 PowerShell** (スタートメニュー → PowerShell 右クリック → 「管理者として実行」) で以下 4 行を実行 → installer を再実行。

```powershell
Remove-Item "C:\ProgramData\DockerDesktop" -Recurse -Force
New-Item -ItemType Directory -Path "C:\ProgramData\DockerDesktop" -Force | Out-Null
icacls "C:\ProgramData\DockerDesktop" /setowner "*S-1-5-32-544" /T
icacls "C:\ProgramData\DockerDesktop" /grant "*S-1-5-32-544:(OI)(CI)F" /T
```

`*S-1-5-32-544` は Administrators グループの SID (英語/日本語 Windows どちらでも有効)。Microsoft Store 版 install でも同じ所有権チェックを行うため、Store 版で hit した場合も同じ手順で対処できる。

> 💡 **再発防止**: 直接 install (.exe) は途中で installer の subprocess window を閉じないこと。心配なら Microsoft Store 版が安全 (subprocess window を出さない)。

### Docker Desktop が「Virtualization support not detected」で起動失敗

**原因**: BIOS / UEFI で CPU の仮想化機能 (Intel VT-x / AMD-V) が無効になっている。CPU 自体は対応しているが OS から見えない状態。

**確認**: タスクマネージャー (Ctrl + Shift + Esc) → 「パフォーマンス」タブ → CPU を選択 → 右下の「仮想化」項目。「無効」なら BIOS 修正が必要。

**対処**:

1. PC を再起動 → 起動ロゴで BIOS キーを連打 (機種別: DELL / ASUS = `F2` or `Del`、HP = `F10`、Lenovo = `F1` or `F2`、自作 PC はマザボメーカーによる)
2. BIOS / UEFI 画面で以下のいずれかを探して **Enabled** に変更:
   - Intel CPU: **Virtualization Technology (VTx)** / **Intel VT-x**
   - AMD CPU: **SVM Mode** / **AMD-V**
3. 設定場所は機種により `Advanced` / `System Options` / `CPU Configuration` / `Security` 配下のどこか
4. `F10` (Save & Exit) → Yes → 再起動
5. Windows 起動後、再度タスクマネージャーで「仮想化: 有効」を確認 → Docker Desktop を起動

> ⚠️ `Intel Trusted Execution Technology (TXT)` や `DMA Protection` 等は触らないこと (Windows 起動不能になる場合あり、Docker には不要)。

### Docker Desktop が「WSL needs updating」で起動失敗

WSL2 (Windows Subsystem for Linux) のカーネルバージョンが古いと Docker Desktop は起動できない。

**対処**: PowerShell (admin 推奨) で:

```powershell
wsl --update
```

ダウンロード + install ~30-60 秒。完了したら Docker Desktop の画面に戻り **Try Again** をクリック。ステータスバー右下が `Engine starting` → `Engine running` に変われば OK。

> `wsl --update` が「WSL がインストールされていません」エラーで失敗する場合は、**管理者 PowerShell** で `wsl --install` (clean install)。Windows 再起動が必要になることあり。

### Docker Desktop 初回起動時の「Welcome to Docker」サインイン画面

右上の **Skip** をクリックで OK。DigiCode のローカルコンパイルサーバーは Docker Hub のサインイン不要で動作する (image は GitHub Container Registry `ghcr.io` にあり、anonymous pull 可能)。

---

## 用途・メリット

- ✅ **コンパイル回数無制限**: クラウドコンパイル枠を消費しない
- ✅ **高速コンパイル**: ネットワーク遅延なし、永続キャッシュで再ビルド最小 1 ms / 約 9.6 秒
- ✅ **オフライン利用**: 初回イメージ取得後はインターネット不要
- ✅ **クラウドと同じ結果**: 同じ Docker イメージ → バイナリ完全一致

### プラン別推奨

| プラン | 推奨度 | 理由 |
|---|---|---|
| Free | — | クラウドコンパイル枠 (月 50 回) で通常は十分 |
| Lite | ▲ | 月 250 回で不足する場合に検討 |
| Pro | ◎ | 月 500 回でも不足する高頻度利用向け |
| Enterprise | ◎ | クラス全体でのコンパイル高速化に有効 |

### コンパイル所要時間

| シナリオ | 所要時間 |
|---|---|
| Docker pull 直後の初回コンパイル | 数分 (template + lib のキャッシュ生成) |
| cold start (コンテナ再起動後初回) | 30〜60 秒 |
| 1 バイトの変更 (warm rebuild) | 約 9.6 秒 |
| 同じコードの再コンパイル (cache HIT) | 約 1 ms |

クラウド (ML30) と同じイメージで動作するため、バイナリ出力は物理的に完全一致します (lib drift なし)。

---

## 関連ドキュメント

- [はじめかた](./getting-started.md)
- [トラブルシューティング](./troubleshooting.md)
- インストーラのソース: [`fablab-westharima/digicode-installer`](https://github.com/fablab-westharima/digicode-installer) (Public、MIT)
