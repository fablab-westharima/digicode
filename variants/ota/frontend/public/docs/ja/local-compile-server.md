# ローカルコンパイルサーバーのセットアップ

**最終更新:** 2026-04-29

DigiCode のクラウドコンパイルサーバーの代わりに、自分のパソコンでコンパイルサーバーを動かすことができます。クラウドとローカルは **同じ Docker イメージ** で動作するため、コンパイル結果は完全に一致します（lib drift なし）。

---

## 用途

- **コンパイル回数無制限** — クラウドコンパイル枠を消費しない
- **高速コンパイル** — ネットワーク遅延なし、永続キャッシュで再ビルド最小 1 ms / 約 9.6 秒
- **オフライン利用** — インターネット不要（初回イメージ取得後）

### プラン別推奨

| プラン | 推奨度 | 理由 |
|--------|:------:|------|
| Free | — | クラウドコンパイル枠（月 50 回）で通常は十分 |
| Lite | ▲ | 月 250 回で不足する場合に検討 |
| Pro | ◎ | 月 500 回でも不足する高頻度利用向け |
| Enterprise | ◎ | クラス全体でのコンパイル高速化に有効 |

---

## ⚠️ 注意事項（必ずお読みください）

> **重要: Docker イメージのサイズについて**
>
> ローカルコンパイルサーバーの Docker イメージは以下の容量です（PlatformIO Core ベース、v0.1.0）:
>
> - **ダウンロード（圧縮）: 約 1 GB**
> - **ディスク使用量（展開後）: 約 3.8 GB**
>
> - スマートフォンのテザリングではなく、**安定した固定回線（光回線等）** でのダウンロードを推奨します
> - ダウンロード時間の目安：光回線（100 Mbps）で約 1〜2 分

---

## 必要環境

Docker が動作する環境が必要です。以下のいずれかをお選びください。

### オプション A: Docker Desktop（標準）

- **Windows / Mac / Linux** に対応
- **個人利用は無料**、商用利用は有料プランが必要
- https://www.docker.com/products/docker-desktop/

### オプション B: Docker Desktop 代替（軽量・OSS）

商用利用や、Docker Desktop より軽量な環境を求める場合:

| ツール | 対応 OS | 特徴 |
|--------|--------|------|
| **OrbStack** | macOS | 軽量・高速・省メモリ、Apple Silicon ネイティブ対応 |
| **Rancher Desktop** | Windows / macOS / Linux | OSS（無償） |
| **Podman Desktop** | Windows / macOS / Linux | OSS、デーモンレス |

### オプション C: Docker Engine 直接（Linux）

Linux では Docker Engine を直接インストール可能（Docker Desktop は不要）。

---

## ステップ 1: Docker 環境をインストール

### Windows

1. https://www.docker.com/products/docker-desktop/ から Docker Desktop for Windows をダウンロード
2. インストーラを実行（WSL2 が必要、インストーラが案内）
3. インストール完了後、PC を再起動

### Mac（Intel）

1. https://www.docker.com/products/docker-desktop/ から Docker Desktop for Mac (Intel) をダウンロード
2. `.dmg` ファイルを開いて Applications にドラッグ
3. Applications から「Docker」を起動

### Mac（Apple Silicon: M1/M2/M3/M4）

**推奨: OrbStack**

Docker Desktop for Mac (Apple Silicon 版) でも動作しますが、OrbStack の方が高速・省メモリです。

1. https://orbstack.dev/ から OrbStack をダウンロード
2. インストール後、そのまま docker コマンドが使用可能

Docker Desktop を使う場合は、Apple Silicon 版（`.dmg`）をインストールしてください。

> ESP32 コアは arm64 ネイティブ対応済みのため、一般的な使用では x86 エミュレーションは不要です。

### Linux

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# ログアウト/再ログインしてグループ変更を反映
```

### インストール確認

```bash
docker --version
```

`Docker version 20.x.x` のように表示されれば OK です。

---

## ステップ 2: コンパイルサーバーをダウンロード・起動

### 方法 A: コマンド 1 行で起動

```bash
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

初回実行時は約 1 GB のイメージをダウンロードします（展開後 3.8 GB）。**固定回線での実行を推奨します。**

### 方法 B: docker-compose.yml を使用（推奨、永続キャッシュ付き）

任意のフォルダに `docker-compose.yml` ファイルを作成：

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

そのフォルダでターミナルを開き：

```bash
docker compose up -d
```

> `digicode-projects` と `digicode-cache` は永続ボリュームです。コンパイル結果と project 状態が保持され、**2 回目以降の同一コードは約 1 ms（cache HIT）**、1 バイト変更時の warm rebuild は約 9.6 秒で完了します。一時ボリューム（`docker run` で `-v` 指定なし）の場合、container 削除でキャッシュが消失します。

---

## ステップ 3: 動作確認

```bash
curl http://localhost:3001/health
```

以下のように表示されれば成功です（`service` と `version` を確認してください）：

```json
{
  "status": "ok",
  "service": "digicode-compile-api",
  "version": "0.1.0",
  "timestamp": "..."
}
```

ブラウザで `http://localhost:3001/health` にアクセスしても確認できます。

---

## ステップ 4: DigiCode で設定

1. DigiCode を開く
2. 「**書き込み**」ボタン横の▼をクリック
3. 「**ローカルサーバー**」を選択
4. コンパイルを実行して動作確認

初回コンパイル（cold）は約 30〜60 秒です（PlatformIO + framework + lib はイメージに同梱済み、cloud (ML30) と同じバイナリが出力されます）。

---

## 旧イメージからの移行（旧 user 向け、1 ステップ）

2026-04 までは `ghcr.io/fablab-westharima/digicode-compile-server`（arduino-cli ベース）を配布していました。新イメージ `digicode-compile-api`（PlatformIO Core ベース）への移行は **イメージ名の変更のみ** で完了します。

```bash
# 旧 image を停止・削除
docker stop digicode-compiler 2>/dev/null
docker rm digicode-compiler 2>/dev/null
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest 2>/dev/null

# 新 image を起動
docker pull ghcr.io/fablab-westharima/digicode-compile-api:latest
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

**変更点:**

- イメージ名: `digicode-compile-server` → `digicode-compile-api`
- コンテナ名: `digicode-compiler` → `digicode-compile-api`（任意、用途で変更可）
- ポート: 3001 据え置き
- DigiCode UI 設定（URL `http://localhost:3001`）: 据え置き、変更不要
- API contract: 互換（`/health` の `service` / `version` フィールドのみ変更）

旧イメージのリポジトリ [fablab-westharima/arduino-compile-server](https://github.com/fablab-westharima/arduino-compile-server) は 2026-04-29 にアーカイブ済です。クラウド側で修正した lib drift（QTRSensors / MFRC522 I2C / NewPing v1.9 等）は新イメージのみに反映されているため、移行を推奨します。

---

## サーバーの操作

```bash
# 停止
docker stop digicode-compile-api

# 再起動
docker start digicode-compile-api

# ログ確認
docker logs digicode-compile-api

# 完全削除
docker rm -f digicode-compile-api
docker rmi ghcr.io/fablab-westharima/digicode-compile-api:latest
```

---

## アップデート

新しいバージョンがリリースされた場合：

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

## トラブルシューティング

### ポート 3001 が使用中

別のアプリがポート 3001 を使用している場合：

```bash
# ポート 3002 で起動
docker run -d -p 3002:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

DigiCode の設定でサーバー URL を `http://localhost:3002` に変更してください。

### Docker が起動しない（Windows）

- WSL2 がインストールされているか確認
- Hyper-V が有効になっているか確認（BIOS で仮想化を有効にする）
- PC を再起動

### Docker が起動しない（Mac）

- システム設定 > プライバシーとセキュリティ で Docker を許可
- Mac を再起動

### Apple Silicon でコンパイルエラー

- OrbStack または Docker Desktop for Apple Silicon を使用しているか確認
- x86 エミュレーションが不要なことを確認（ESP32 コアは arm64 対応済み）

### コンパイルエラーが発生する

```bash
# コンテナを再起動
docker restart digicode-compile-api

# それでも解決しない場合は再作成
docker rm -f digicode-compile-api
docker run -d -p 3001:3001 --name digicode-compile-api \
  ghcr.io/fablab-westharima/digicode-compile-api:latest
```

### cache HIT しない（同じコードでも warm rebuild になる）

`docker-compose.yml` の `volumes` 指定を確認してください。`digicode-projects` と `digicode-cache` の名前付きボリュームが保持されている必要があります。

---

## メリット・デメリット

| 項目 | 内容 |
|------|------|
| ✅ コンパイル回数 | **無制限**（クラウド枠を消費しない） |
| ✅ 速度 | cache HIT 約 1 ms / warm rebuild 約 9.6 秒 / cold 約 30〜60 秒 |
| ✅ オフライン | 初回ダウンロード後はインターネット不要（framework + lib はイメージ同梱） |
| ✅ クラウドと同じ結果 | クラウド (ML30) と同じイメージを使用、バイナリ出力が物理的に一致（lib drift なし） |
| ⚠️ 初回ダウンロード | 約 1 GB（圧縮）、展開後 3.8 GB |
| ⚠️ インストール | Docker のセットアップが必要 |
| ⚠️ リソース | PC のメモリ・CPU を使用（最低 4 GB RAM 推奨） |

---

## 関連ドキュメント

- [はじめかた](./getting-started.md) — 基本的な使い方
- [トラブルシューティング](./troubleshooting.md) — よくある問題と解決方法
