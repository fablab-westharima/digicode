# API リファレンス

DigiCode Backend APIの仕様書です。

## 概要

- **ベースURL**: `https://api.digicode.example.com` (本番) / `http://localhost:8787` (開発)
- **認証方式**: JWT Bearer Token
- **コンテンツタイプ**: `application/json`

---

## 認証

### JWT認証

保護されたエンドポイントにアクセスするには、Authorizationヘッダーが必要です：

```
Authorization: Bearer <JWT_TOKEN>
```

トークンには以下のクレームが含まれます：
- `userId`: ユーザーID
- `email`: メールアドレス
- `iat`: 発行時刻
- `exp`: 有効期限

---

## エンドポイント一覧

### ヘルスチェック

#### GET /

APIのウェルカムメッセージを返します。

**レスポンス:**
```json
{
  "message": "ESP32 Blockly Backend API"
}
```

#### GET /health

ヘルスチェック用エンドポイント。

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-30T12:00:00.000Z"
}
```

---

### 認証 API

#### POST /api/auth/register

新規ユーザー登録。

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**レスポンス (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "subscriptionPlan": "free"
  }
}
```

**エラーレスポンス:**
| ステータス | 説明 |
|-----------|------|
| 400 | 無効なメールまたはパスワード |
| 409 | メールアドレスが既に登録済み |

---

#### POST /api/auth/login

ユーザーログイン。

**リクエスト:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**レスポンス (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "subscriptionPlan": "free"
  }
}
```

**エラーレスポンス:**
| ステータス | 説明 |
|-----------|------|
| 401 | 認証失敗（メールまたはパスワードが不正） |

---

#### GET /api/auth/me

現在のユーザー情報を取得。

**認証:** 必須

**レスポンス (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "subscriptionPlan": "free",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**エラーレスポンス:**
| ステータス | 説明 |
|-----------|------|
| 401 | 認証トークンが無効または期限切れ |

---

### プロジェクト API

#### GET /api/projects

ユーザーのプロジェクト一覧を取得。

**認証:** 必須

**レスポンス (200 OK):**
```json
[
  {
    "id": 1,
    "title": "LED点滅プロジェクト",
    "description": "基本的なLED制御",
    "language": "arduino",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-02T00:00:00.000Z"
  },
  {
    "id": 2,
    "title": "OTTO歩行テスト",
    "description": "OTTOロボットの歩行プログラム",
    "language": "micropython",
    "createdAt": "2025-01-03T00:00:00.000Z",
    "updatedAt": "2025-01-03T00:00:00.000Z"
  }
]
```

---

#### GET /api/projects/:id

特定のプロジェクトを取得。

**認証:** 必須

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | number | プロジェクトID |

**レスポンス (200 OK):**
```json
{
  "id": 1,
  "title": "LED点滅プロジェクト",
  "description": "基本的なLED制御",
  "blocklyXml": "<xml>...</xml>",
  "generatedCode": "void setup() { ... }",
  "language": "arduino",
  "isPublic": false,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

**エラーレスポンス:**
| ステータス | 説明 |
|-----------|------|
| 404 | プロジェクトが見つからない |
| 403 | アクセス権限がない（非公開プロジェクト） |

---

#### POST /api/projects

新規プロジェクトを作成。

**認証:** 必須

**リクエスト:**
```json
{
  "title": "新規プロジェクト",
  "description": "プロジェクトの説明（オプション）",
  "blocklyXml": "<xml>...</xml>",
  "language": "arduino"
}
```

**パラメータ:**
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| title | string | ✓ | プロジェクト名 |
| description | string | | 説明 |
| blocklyXml | string | ✓ | BlocklyワークスペースのXML |
| language | string | | `arduino` または `micropython`（デフォルト: `micropython`） |

**レスポンス (201 Created):**
```json
{
  "id": 3,
  "title": "新規プロジェクト",
  "description": "プロジェクトの説明",
  "blocklyXml": "<xml>...</xml>",
  "language": "arduino",
  "createdAt": "2025-01-04T00:00:00.000Z",
  "updatedAt": "2025-01-04T00:00:00.000Z"
}
```

---

#### PUT /api/projects/:id

プロジェクトを更新。

**認証:** 必須（オーナーのみ）

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | number | プロジェクトID |

**リクエスト:**
```json
{
  "title": "更新されたタイトル",
  "description": "更新された説明",
  "blocklyXml": "<xml>...</xml>",
  "generatedCode": "void setup() { ... }",
  "language": "arduino"
}
```

**レスポンス (200 OK):**
```json
{
  "id": 1,
  "title": "更新されたタイトル",
  "description": "更新された説明",
  "blocklyXml": "<xml>...</xml>",
  "generatedCode": "void setup() { ... }",
  "language": "arduino",
  "updatedAt": "2025-01-05T00:00:00.000Z"
}
```

**エラーレスポンス:**
| ステータス | 説明 |
|-----------|------|
| 403 | 更新権限がない |
| 404 | プロジェクトが見つからない |

---

#### DELETE /api/projects/:id

プロジェクトを削除。

**認証:** 必須（オーナーのみ）

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | number | プロジェクトID |

**レスポンス (200 OK):**
```json
{
  "message": "Project deleted successfully"
}
```

**エラーレスポンス:**
| ステータス | 説明 |
|-----------|------|
| 403 | 削除権限がない |
| 404 | プロジェクトが見つからない |

---

### サブスクリプション API

#### GET /api/subscriptions/status

サブスクリプション状態を取得（未実装）。

**認証:** 必須

**レスポンス (501 Not Implemented):**
```json
{
  "message": "Not implemented"
}
```

---

### Webhook

#### POST /webhooks/square

Square決済Webhook（未実装）。

**レスポンス (501 Not Implemented):**
```json
{
  "message": "Not implemented"
}
```

---

## エラーレスポンス形式

すべてのエラーは以下の形式で返されます：

```json
{
  "error": "エラーメッセージ"
}
```

または：

```json
{
  "message": "エラーメッセージ"
}
```

---

## CORS設定

許可されたオリジン：
- `http://localhost:5173` (開発用フロントエンド)
- `http://localhost:3000` (代替ポート)

許可されたメソッド：
- GET, POST, PUT, DELETE, OPTIONS

許可されたヘッダー：
- Content-Type
- Authorization

---

## レート制限

現在、レート制限は実装されていません。将来的に以下の制限が追加される予定です：

| エンドポイント | 制限 |
|---------------|------|
| 認証 | 10リクエスト/分 |
| プロジェクトCRUD | 60リクエスト/分 |
| コンパイル | 10リクエスト/分 |

---

## コード例

### JavaScript (fetch)

```javascript
// ログイン
const login = async (email, password) => {
  const response = await fetch('http://localhost:8787/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

// プロジェクト取得
const getProjects = async (token) => {
  const response = await fetch('http://localhost:8787/api/projects', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};
```

### curl

```bash
# ログイン
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# プロジェクト一覧取得
curl http://localhost:8787/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 関連ドキュメント

- [アーキテクチャ概要](../architecture.md)
- [デプロイ手順](./deployment.md)
