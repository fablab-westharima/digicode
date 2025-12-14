/**
 * ADC2 + WiFi 制約チェック
 *
 * ESP32のハードウェア制約:
 * WiFi使用中はADC2のアナログ読み取りが正常に動作しない
 *
 * ADC1 (WiFi使用時も正常): GPIO 32, 33, 34, 35, 36, 39
 * ADC2 (WiFi使用時に不安定): GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27
 */

// ADC2ピンリスト
const ADC2_PINS = [0, 2, 4, 12, 13, 14, 15, 25, 26, 27];

// ADC1ピンリスト (推奨代替ピン)
const ADC1_PINS = [32, 33, 34, 35, 36, 39];

// 検出パターン: analogRead(0), analogRead(2), ... を検出
const ADC2_ANALOG_PATTERN = /analogRead\s*\(\s*(0|2|4|12|13|14|15|25|26|27)\s*\)/g;

export interface ADC2Warning {
  pin: number;
  message: string;
}

/**
 * 生成されたコード内のADC2ピン使用をチェック
 * @param generatedCode BlocklyからArduino C++コード
 * @returns ADC2警告の配列（問題なければ空配列）
 */
export function checkADC2Usage(generatedCode: string): ADC2Warning[] {
  const warnings: ADC2Warning[] = [];
  const matches = generatedCode.match(ADC2_ANALOG_PATTERN);

  if (matches) {
    // 重複を除去してユニークなピン番号を取得
    const uniquePins = [...new Set(matches.map(m => {
      const pinMatch = m.match(/\d+/);
      return pinMatch ? parseInt(pinMatch[0], 10) : -1;
    }).filter(pin => pin !== -1))];

    uniquePins.forEach(pin => {
      warnings.push({
        pin,
        message: `GPIO${pin}をアナログ入力で使用しています。OTAファームウェアはWiFi常時接続のため、ADC2ピン（GPIO 0, 2, 4, 12-15, 25-27）のアナログ読み取りは正常に動作しません。ADC1ピン（GPIO 32-36, 39）に変更してください。`
      });
    });
  }

  return warnings;
}

/**
 * ADC2ピンかどうかを判定
 */
export function isADC2Pin(pin: number): boolean {
  return ADC2_PINS.includes(pin);
}

/**
 * ADC1ピンかどうかを判定
 */
export function isADC1Pin(pin: number): boolean {
  return ADC1_PINS.includes(pin);
}

/**
 * 推奨されるADC1ピンのリストを取得
 */
export function getRecommendedADC1Pins(): number[] {
  return [...ADC1_PINS];
}
