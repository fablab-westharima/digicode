// JWT ユーティリティ（Web Crypto API使用）

import { constantTimeEqual } from './crypto';

interface JWTPayload {
  userId: number;
  email: string;
  exp: number;
  iat: number;
}

// Base64URL エンコード
function base64UrlEncode(data: Uint8Array | string): string {
  const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Base64URL デコード
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// HMAC-SHA256 署名生成
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature).reduce((s, b) => s + String.fromCharCode(b), ''));
}

// HMAC-SHA256 署名検証
// 固定時間文字列比較は ./crypto.ts に集約 (NEW-9 Session 121、F-F2 Session 118 由来)
async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await createSignature(data, secret);
  return constantTimeEqual(signature, expectedSignature);
}

// JWT トークン生成
export async function generateToken(
  payload: { userId: number; email: string },
  secret: string,
  expiresInDays: number = 7
): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInDays * 24 * 60 * 60,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = await createSignature(dataToSign, secret);

  return `${dataToSign}.${signature}`;
}

// JWT トークン検証
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    // 署名検証
    const isValid = await verifySignature(dataToVerify, signature, secret);
    if (!isValid) {
      return null;
    }

    // ペイロードデコード
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // 有効期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// リフレッシュトークン生成（ランダム文字列）
export function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// アクセストークンとリフレッシュトークンのペアを生成
export async function generateTokenPair(
  payload: { userId: number; email: string },
  secret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  // アクセストークン: 1時間
  const accessToken = await generateToken(payload, secret, 1 / 24);
  // リフレッシュトークン: ランダム文字列（DBに保存）
  const refreshToken = generateRefreshToken();

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1時間（秒）
  };
}
