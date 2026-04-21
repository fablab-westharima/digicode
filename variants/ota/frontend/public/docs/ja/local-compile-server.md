# ローカルコンパイルサーバーのセットアップ

**最終更新:** 2026-04-21

DigiCodeのクラウドコンパイルサーバーの代わりに、自分のパソコンでコンパイルサーバーを動かすことができます。

---

## 用途

- **コンパイル回数無制限** — クラウドコンパイル枠を消費しない
- **高速コンパイル** — ネットワーク遅延なし
- **オフライン利用** — インターネット不要（初回ダウンロード後）

### プラン別推奨

| プラン | 推奨度 | 理由 |
|--------|:------:|------|
| Free | — | クラウドコンパイル枠（月50回）で通常は十分 |
| Lite | ▲ | 月250回で不足する場合に検討 |
| Pro | ◎ | 月500回でも不足する高頻度利用向け |
| Enterprise | ◎ | クラス全体でのコンパイル高速化に有効 |

---

## ⚠️ 注意事項（必ずお読みください）

> **重要: Dockerイメージのサイズについて**
>
> ローカルコンパイルサーバーのDockerイメージは **約10GB** あります。
>
> - **スマートフォンのテザリングでダウンロードしないでください**（通信量超過・高額請求の原因）
> - **安定した固定回線（光回線等）でのダウンロードを推奨します**
> - ダウンロード時間の目安：光回線（100Mbps）で約15〜20分

---

## 必要環境

Dockerが動作する環境が必要です。以下のいずれかをお選びください。

### オプションA: Docker Desktop（標準）

- **Windows / Mac / Linux** に対応
- **個人利用は無料**、商用利用は有料プランが必要
- https://www.docker.com/products/docker-desktop/

### オプションB: Docker Desktop 代替（軽量・OSS）

商用利用や、Docker Desktopより軽量な環境を求める場合:

| ツール | 対応OS | 特徴 |
|--------|--------|------|
| **OrbStack** | macOS | 軽量・高速・省メモリ、Apple Siliconネイティブ対応 |
| **Rancher Desktop** | Windows / macOS / Linux | OSS（無償） |
| **Podman Desktop** | Windows / macOS / Linux | OSS、デーモンレス |

### オプションC: Docker Engine 直接（Linux）

LinuxではDocker Engineを直接インストール可能（Docker Desktopは不要）。

---

## ステップ1: Docker環境をインストール

### Windows

1. https://www.docker.com/products/docker-desktop/ からDocker Desktop for Windowsをダウンロード
2. インストーラを実行（WSL2が必要、インストーラが案内）
3. インストール完了後、PCを再起動

### Mac（Intel）

1. https://www.docker.com/products/docker-desktop/ からDocker Desktop for Mac（Intel）をダウンロード
2. `.dmg` ファイルを開いてApplicationsにドラッグ
3. Applicationsから「Docker」を起動

### Mac（Apple Silicon: M1/M2/M3/M4）

**推奨: OrbStack**

Docker Desktop for Mac（Apple Silicon版）でも動作しますが、OrbStackの方が高速・省メモリです。

1. https://orbstack.dev/ からOrbStackをダウンロード
2. インストール後、そのままdockerコマンドが使用可能

Docker Desktopを使う場合は、Apple Silicon版（`.dmg`）をインストールしてください。

> ESP32コアはarm64ネイティブ対応済みのため、一般的な使用ではx86エミュレーションは不要です。

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

`Docker version 20.x.x` のように表示されればOKです。

---

## ステップ2: コンパイルサーバーをダウンロード・起動

### 方法A: コマンド1行で起動（推奨）

```bash
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

初回実行時は約10GBのイメージをダウンロードします。**固定回線での実行を推奨します。**

### 方法B: docker-compose.ymlを使用

任意のフォルダに `docker-compose.yml` ファイルを作成：

```yaml
services:
  digicode-compiler:
    image: ghcr.io/fablab-westharima/digicode-compile-server:latest
    container_name: digicode-compiler
    ports:
      - "3001:3001"
    restart: unless-stopped
```

そのフォルダでターミナルを開き：

```bash
docker compose up -d
```

---

## ステップ3: 動作確認

```bash
curl http://localhost:3001/health
```

以下のように表示されれば成功です：

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

ブラウザで `http://localhost:3001/health` にアクセスしても確認できます。

---

## ステップ4: DigiCodeで設定

1. DigiCodeを開く
2. 「**書き込み**」ボタン横の▼をクリック
3. 「**ローカルサーバー**」を選択
4. コンパイルを実行して動作確認

---

## サーバーの操作

```bash
# 停止
docker stop digicode-compiler

# 再起動
docker start digicode-compiler

# ログ確認
docker logs digicode-compiler

# 完全削除
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## アップデート

新しいバージョンがリリースされた場合：

```bash
docker stop digicode-compiler
docker rm digicode-compiler
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## トラブルシューティング

### ポート3001が使用中

別のアプリがポート3001を使用している場合：

```bash
# ポート3002で起動
docker run -d -p 3002:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

DigiCodeの設定でサーバーURLを `http://localhost:3002` に変更してください。

### Dockerが起動しない（Windows）

- WSL2がインストールされているか確認
- Hyper-Vが有効になっているか確認（BIOSでの仮想化を有効にする）
- PCを再起動

### Dockerが起動しない（Mac）

- システム設定 > プライバシーとセキュリティ で Docker を許可
- Macを再起動

### Apple Silicon でコンパイルエラー

- OrbStackまたはDocker Desktop for Apple Siliconを使用しているか確認
- x86エミュレーションが不要なことを確認（ESP32コアはarm64対応済み）

### コンパイルエラーが発生する

```bash
# コンテナを再起動
docker restart digicode-compiler

# それでも解決しない場合は再作成
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler \
  ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## メリット・デメリット

| 項目 | 内容 |
|------|------|
| ✅ コンパイル回数 | **無制限**（クラウド枠を消費しない） |
| ✅ 速度 | ネットワーク遅延なしで高速 |
| ✅ オフライン | 初回ダウンロード後はインターネット不要 |
| ⚠️ 初回ダウンロード | 約10GB（固定回線推奨） |
| ⚠️ インストール | Dockerのセットアップが必要 |
| ⚠️ リソース | PCのメモリ・CPUを使用（最低4GB RAM推奨） |

---

## 関連ドキュメント

- [はじめかた](./getting-started.md) — 基本的な使い方
- [トラブルシューティング](./troubleshooting.md) — よくある問題と解決方法
