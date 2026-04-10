# ローカルコンパイルサーバーのセットアップ

DigiCodeでは、クラウドコンパイルサーバーの代わりに、自分のパソコンでコンパイルサーバーを動かすことができます。これにより、コンパイル回数の制限なく、高速にプログラムを作成できます。

---

## ⚠️ 注意事項（必ずお読みください）

> **重要: Dockerイメージのサイズについて**
>
> ローカルコンパイルサーバーのDockerイメージは **約10GB** あります。
> ダウンロードに時間がかかりますので、以下の点にご注意ください：
>
> - **スマートフォンのテザリングでダウンロードしないでください**
>   - 通信量の上限を超える可能性があります
>   - 通信費が高額になる場合があります
> - **安定した固定回線（光回線など）でのダウンロードを推奨します**
> - ダウンロード時間の目安：
>   - 光回線（100Mbps）：約15〜20分
>   - モバイル回線：**非推奨**

---

## 必要なもの

- **Docker Desktop**（無料）
- 安定したインターネット接続（初回ダウンロード時のみ）
- ディスク空き容量：15GB以上

---

## ステップ1: Docker Desktopをインストール

### Windows

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) にアクセス
2. 「Download for Windows」をクリック
3. ダウンロードしたインストーラを実行
4. 画面の指示に従ってインストール
5. インストール完了後、PCを再起動

### Mac

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) にアクセス
2. 「Download for Mac」をクリック（Intel/Apple Siliconを選択）
3. ダウンロードした`.dmg`ファイルを開く
4. DockerアイコンをApplicationsフォルダにドラッグ
5. Applicationsから「Docker」を起動

### インストール確認

ターミナル（コマンドプロンプト）で以下を実行：

```bash
docker --version
```

`Docker version 20.x.x` のように表示されればOKです。

---

## ステップ2: コンパイルサーバーをダウンロード・起動

### 方法A: コマンド1行で起動（推奨）

ターミナル（コマンドプロンプト）で以下を実行：

```bash
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

初回実行時は約10GBのイメージをダウンロードします。**固定回線での実行を推奨します。**

### 方法B: docker-compose.ymlを使用

1. 任意のフォルダに `docker-compose.yml` ファイルを作成：

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

2. そのフォルダでターミナルを開き、以下を実行：

```bash
docker compose up -d
```

---

## ステップ3: 動作確認

### コマンドで確認

```bash
curl http://localhost:3001/health
```

以下のように表示されれば成功です：

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

### ブラウザで確認

`http://localhost:3001/health` にアクセスして、上記のJSONが表示されればOKです。

---

## ステップ4: DigiCodeで設定

1. DigiCodeを開く
2. ブロックエディタの「**書き込み**」ボタン横の▼をクリック
3. 「**ローカルサーバー**」を選択
4. コンパイルを実行して動作確認

---

## サーバーの操作

### 停止

```bash
docker stop digicode-compiler
```

### 再起動

```bash
docker start digicode-compiler
```

### ログ確認

```bash
docker logs digicode-compiler
```

### 完全削除

```bash
docker rm -f digicode-compiler
docker rmi ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## アップデート

新しいバージョンがリリースされた場合：

```bash
# 古いコンテナを停止・削除
docker stop digicode-compiler
docker rm digicode-compiler

# 新しいイメージをダウンロード
docker pull ghcr.io/fablab-westharima/digicode-compile-server:latest

# 再起動
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## トラブルシューティング

### ポート3001が使用中

別のアプリケーションがポート3001を使用している場合：

```bash
# ポート3002で起動
docker run -d -p 3002:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

DigiCodeの設定でサーバーURLを `http://localhost:3002` に変更してください。

### Dockerが起動しない（Windows）

- WSL2がインストールされているか確認
- Hyper-Vが有効になっているか確認
- PCを再起動

### Dockerが起動しない（Mac）

- システム環境設定 > セキュリティとプライバシー で Docker を許可
- Macを再起動

### コンパイルエラーが発生する

```bash
# コンテナを再起動
docker restart digicode-compiler

# それでも解決しない場合は再作成
docker rm -f digicode-compiler
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

---

## メリット・デメリット

### メリット

- コンパイル回数**無制限**
- ネットワーク遅延なしで**高速コンパイル**
- オフラインでも使用可能（初回ダウンロード後）

### デメリット

- 初回ダウンロードに約10GB必要
- Dockerのインストールが必要
- PCのリソース（メモリ・CPU）を使用

---

## 関連ドキュメント

- [はじめかた](./getting-started.md) - 基本的な使い方
- [トラブルシューティング](./troubleshooting.md) - よくある問題と解決方法
