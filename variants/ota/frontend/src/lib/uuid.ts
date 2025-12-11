/**
 * 短いUUID生成（8文字の英数字）
 * 例: "a1b2c3d4"
 */
export function generateShortUuid(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * UUIDからSSID名を生成
 * 例: "ESP32-a1b2c3d4"
 */
export function uuidToSsid(uuid: string): string {
  return `ESP32-${uuid}`;
}

/**
 * UUIDからmDNSホスト名を生成
 * 例: "digicode-robot001.local"
 */
export function uuidToMdns(uuid: string): string {
  return `digicode-${uuid}.local`;
}

/**
 * UUIDが有効かチェック（英数字とハイフンのみ、3-20文字）
 */
export function isValidUuid(uuid: string): boolean {
  return /^[a-zA-Z0-9-]{3,20}$/.test(uuid);
}
