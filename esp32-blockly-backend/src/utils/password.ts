// パスワードハッシュユーティリティ（PBKDF2使用）
//
// ハッシュ形式:
//   - 新形式 (v1): `pbkdf2-<iterations>:<salt_b64>:<hash_b64>` (3 splits)
//   - 旧形式 (legacy): `<salt_b64>:<hash_b64>` (2 splits、iterations=10000 として検証)
//
// iterations は用途別:
//   - DEFAULT_ITERATIONS = 100000: パスワード用 (Cloudflare Workers crypto.subtle.deriveBits の上限)
//     Note: OWASP 2023 は 600000 推奨だが Workers は 100000 超を NotSupportedError で reject するため
//     現実的上限の 100000 を採用。従来 10000 比で 10倍 強化。
//   - RECOVERY_CODE_ITERATIONS = 100000: recovery code 用
//   - LEGACY_ITERATIONS = 10000: 旧形式 fallback 専用

const DEFAULT_ITERATIONS = 100000;
export const RECOVERY_CODE_ITERATIONS = 100000;
const LEGACY_ITERATIONS = 10000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;

// ランダムソルト生成
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Uint8Array を Base64 に変換
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

// Base64 を Uint8Array に変換
function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

// PBKDF2 でハッシュ生成
async function pbkdf2Hash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH
  );

  return new Uint8Array(derivedBits);
}

// パスワードハッシュ化
export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_ITERATIONS,
): Promise<string> {
  const salt = generateSalt();
  const hash = await pbkdf2Hash(password, salt, iterations);

  return `pbkdf2-${iterations}:${arrayToBase64(salt)}:${arrayToBase64(hash)}`;
}

// パスワード検証
// 戻り値: { valid, needsRehash }
//   - valid: パスワード一致 or 不一致
//   - needsRehash: 旧形式 or DEFAULT_ITERATIONS 未満で保存されている (呼び出し側で UPDATE 推奨)
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  try {
    const parts = storedHash.split(':');
    let iterations: number;
    let saltBase64: string;
    let hashBase64: string;

    if (parts.length === 3 && parts[0].startsWith('pbkdf2-')) {
      // 新形式
      const parsed = parseInt(parts[0].substring(7), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { valid: false, needsRehash: false };
      }
      iterations = parsed;
      saltBase64 = parts[1];
      hashBase64 = parts[2];
    } else if (parts.length === 2) {
      // 旧形式 (legacy, iterations=10000 固定)
      iterations = LEGACY_ITERATIONS;
      saltBase64 = parts[0];
      hashBase64 = parts[1];
    } else {
      return { valid: false, needsRehash: false };
    }

    if (!saltBase64 || !hashBase64) {
      return { valid: false, needsRehash: false };
    }

    const salt = base64ToArray(saltBase64);
    const storedHashArray = base64ToArray(hashBase64);
    const computedHash = await pbkdf2Hash(password, salt, iterations);

    // タイミング攻撃対策: 固定時間比較
    if (storedHashArray.length !== computedHash.length) {
      return { valid: false, needsRehash: false };
    }

    let result = 0;
    for (let i = 0; i < storedHashArray.length; i++) {
      result |= storedHashArray[i] ^ computedHash[i];
    }

    const valid = result === 0;
    const needsRehash = valid && iterations < DEFAULT_ITERATIONS;
    return { valid, needsRehash };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
