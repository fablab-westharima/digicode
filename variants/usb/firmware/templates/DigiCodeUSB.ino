/**
 * DigiCode USB版ファームウェア
 *
 * USB書込み専用テンプレート（WiFi/OTA機能なし）
 *
 * 特徴:
 * - WiFi, mDNS, OTA, WebServerを全て削除
 * - シリアルコマンド最小限
 * - サイズ: 200-300KB（OTAの1/4）
 */

#include <ESP32Servo.h>

// UUID（デバイス識別子）
String deviceUUID = "";
const int UUID_LENGTH = 16;

// サーボ設定
const int MAX_SERVOS = 8;
Servo servos[MAX_SERVOS];
int servoPins[MAX_SERVOS] = {-1, -1, -1, -1, -1, -1, -1, -1};
int servoCount = 0;

// シリアル通信バッファ
String serialBuffer = "";

void setup() {
  // シリアル通信初期化
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }

  delay(1000);
  Serial.println("\n\n=== DigiCode USB ===");
  Serial.println("Version: 1.0.0");
  Serial.println("Mode: USB");

  // UUID生成または読み込み
  generateOrLoadUUID();
  Serial.print("UUID: ");
  Serial.println(deviceUUID);

  Serial.println("Ready.");

  // Blockly setup code will be inserted here
  {{BLOCKLY_SETUP_CODE}}
}

void loop() {
  // シリアルコマンド処理
  handleSerialCommands();

  // Blockly loop code will be inserted here
  {{BLOCKLY_LOOP_CODE}}

  delay(10);
}

/**
 * UUID生成または読み込み
 */
void generateOrLoadUUID() {
  // 簡易UUID生成（ESP32のMACアドレスベース）
  uint64_t chipid = ESP.getEfuseMac();
  char uuidStr[17];
  snprintf(uuidStr, sizeof(uuidStr), "%016llX", chipid);
  deviceUUID = String(uuidStr);
}

/**
 * シリアルコマンド処理
 */
void handleSerialCommands() {
  while (Serial.available()) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        processCommand(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += c;
    }
  }
}

/**
 * コマンド実行
 */
void processCommand(String command) {
  command.trim();

  if (command == "GET_CONFIG") {
    // デバイス設定取得
    Serial.println("OK:UUID=" + deviceUUID);
    Serial.print("OK:SERVO_COUNT=");
    Serial.println(servoCount);
    Serial.println("OK:MODE=USB");

  } else if (command.startsWith("SET_SERVO_CONFIG:")) {
    // サーボ設定
    // 形式: SET_SERVO_CONFIG:count,pin1,pin2,...
    String params = command.substring(17);
    int commaIndex = params.indexOf(',');

    if (commaIndex > 0) {
      int count = params.substring(0, commaIndex).toInt();
      servoCount = min(count, MAX_SERVOS);

      String pinsStr = params.substring(commaIndex + 1);
      int pinIndex = 0;
      int startPos = 0;

      for (int i = 0; i < servoCount && pinIndex < MAX_SERVOS; i++) {
        int nextComma = pinsStr.indexOf(',', startPos);
        String pinStr;

        if (nextComma > 0) {
          pinStr = pinsStr.substring(startPos, nextComma);
          startPos = nextComma + 1;
        } else {
          pinStr = pinsStr.substring(startPos);
        }

        int pin = pinStr.toInt();
        servoPins[pinIndex] = pin;
        servos[pinIndex].attach(pin);
        pinIndex++;
      }

      Serial.println("OK:SERVO_CONFIG_SET");
    } else {
      Serial.println("ERROR:INVALID_SERVO_CONFIG");
    }

  } else if (command == "RESET") {
    // リセット
    Serial.println("OK:RESETTING");
    delay(100);
    ESP.restart();

  } else {
    // 未知のコマンド
    Serial.print("ERROR:UNKNOWN_COMMAND:");
    Serial.println(command);
  }
}
