// パスワードハッシュユーティリティ（PBKDF2使用）

// 開発環境では反復回数を減らしてレスポンス速度を改善
// 本番: 100000回（セキュア）
// 開発: 10000回（高速）
const ITERATIONS = 10000;
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
async function pbkdf2Hash(password: string, salt: Uint8Array): Promise<Uint8Array> {
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
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH
  );

  return new Uint8Array(derivedBits);
}

// パスワードハッシュ化
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await pbkdf2Hash(password, salt);

  // 形式: salt:hash (両方Base64エンコード)
  return `${arrayToBase64(salt)}:${arrayToBase64(hash)}`;
}

// パスワード検証
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltBase64, hashBase64] = storedHash.split(':');
    if (!saltBase64 || !hashBase64) {
      return false;
    }

    const salt = base64ToArray(saltBase64);
    const storedHashArray = base64ToArray(hashBase64);
    const computedHash = await pbkdf2Hash(password, salt);

    // タイミング攻撃対策: 固定時間比較
    if (storedHashArray.length !== computedHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < storedHashArray.length; i++) {
      result |= storedHashArray[i] ^ computedHash[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}
