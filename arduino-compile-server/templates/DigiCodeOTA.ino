/*
 * DigiCode OTA Firmware
 * 競技ロボット教育プラットフォーム用ファームウェア
 *
 * 機能:
 * - WiFi Stationモード（複数WiFi保存、フォールバックでAPモード）
 * - OTA (Over-The-Air) アップデート（Arduino OTA + HTTP）
 * - HTTP Webサーバー（デバイス情報、OTA更新UI）
 * - シリアル通信
 * - デバイスUUID/名前の永続化（Preferences）
 * - WiFi設定の永続化（最大5個）
 * - Blocklyから生成されたコードの実行
 */

#include <WiFi.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include <Preferences.h>
#include <WebServer.h>
#include <Update.h>

// WiFi設定
const char* ap_password = "digicode2025";
const int MAX_WIFI_COUNT = 5;

// WiFi保存用構造体
struct WiFiCredential {
  String ssid;
  String password;
};

// WiFi設定リスト
WiFiCredential wifiList[MAX_WIFI_COUNT];
int wifiCount = 0;
String connectedSSID = "";  // 現在接続中のSSID
bool isAPMode = false;      // APモードかどうか

// デバイス識別用UUID（Preferencesから読み込み）
String device_uuid = "robot001";  // デフォルト値
String device_name = "My Robot";   // デフォルト値

// Preferences（NVS）
Preferences preferences;

// シリアルコマンドバッファ
String serialBuffer = "";

// Webサーバー（Port 80）
WebServer server(80);

// 内蔵LED設定（ESP32では通常GPIO2）
#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif
const int LED_PIN = LED_BUILTIN;

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n\n================================");
  Serial.println("DigiCode OTA Firmware");
  Serial.println("Version: 1.3.3");
  Serial.println("================================\n");

  // 内蔵LED設定
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Preferencesから設定を読み込み
  loadDeviceConfig();
  loadWiFiList();

  // WiFi接続試行（Stationモード）
  String hostname = "digicode-" + device_uuid;
  bool wifiConnected = connectToWiFi();

  if (!wifiConnected) {
    // WiFi接続失敗 → APモードで起動
    isAPMode = true;
    Serial.println("Starting Access Point mode...");
    WiFi.mode(WIFI_AP);

    String ssid = "DigiCode-" + device_uuid;
    WiFi.softAP(ssid.c_str(), ap_password);

    IPAddress IP = WiFi.softAPIP();
    Serial.print("AP SSID: ");
    Serial.println(ssid);
    Serial.print("AP Password: ");
    Serial.println(ap_password);
    Serial.print("AP IP address: ");
    Serial.println(IP);
  } else {
    // WiFi接続成功
    isAPMode = false;
    Serial.println("Connected to WiFi: " + connectedSSID);
  }

  // mDNS設定
  if (MDNS.begin(hostname.c_str())) {
    Serial.print("mDNS responder started: ");
    Serial.print(hostname);
    Serial.println(".local");

    // mDNSサービス登録（デバイス探索用）
    // _digicode._tcp.local サービスとして登録
    MDNS.addService("digicode", "tcp", 80);
    MDNS.addServiceTxt("digicode", "tcp", "uuid", device_uuid.c_str());
    MDNS.addServiceTxt("digicode", "tcp", "name", device_name.c_str());
    MDNS.addServiceTxt("digicode", "tcp", "version", "1.3.3");
    Serial.println("mDNS service registered: _digicode._tcp");
  }

  // OTA設定
  ArduinoOTA.setHostname(hostname.c_str());
  ArduinoOTA.setPassword(ap_password);

  ArduinoOTA.onStart([&]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH) {
      type = "sketch";
    } else {  // U_SPIFFS
      type = "filesystem";
    }
    Serial.println("Start updating " + type);
    digitalWrite(LED_PIN, HIGH);
  });

  ArduinoOTA.onEnd([&]() {
    Serial.println("\nUpdate complete!");
    digitalWrite(LED_PIN, LOW);
  });

  ArduinoOTA.onProgress([&](unsigned int progress, unsigned int total) {
    static unsigned int lastPercent = 0;
    unsigned int percent = (progress / (total / 100));
    if (percent != lastPercent && percent % 10 == 0) {
      Serial.printf("Progress: %u%%\n", percent);
      lastPercent = percent;
    }
    // LED点滅でOTA進行を表示
    digitalWrite(LED_PIN, (millis() / 100) % 2);
  });

  ArduinoOTA.onError([&](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) {
      Serial.println("Auth Failed");
    } else if (error == OTA_BEGIN_ERROR) {
      Serial.println("Begin Failed");
    } else if (error == OTA_CONNECT_ERROR) {
      Serial.println("Connect Failed");
    } else if (error == OTA_RECEIVE_ERROR) {
      Serial.println("Receive Failed");
    } else if (error == OTA_END_ERROR) {
      Serial.println("End Failed");
    }
    digitalWrite(LED_PIN, LOW);
  });

  ArduinoOTA.begin();

  Serial.println("\n================================");
  Serial.println("System Ready!");
  Serial.println("Device UUID: " + device_uuid);
  Serial.println("Device Name: " + device_name);
  Serial.println("Waiting for OTA updates or user code...");
  Serial.println("================================\n");

  // Webサーバー設定
  setupWebServer();

  // 起動完了を示すLED点滅
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }

  // ユーザー初期化コード
  userSetup();
}

void loop() {
  // OTAハンドラ（必須）
  ArduinoOTA.handle();

  // Webサーバーハンドラ
  server.handleClient();

  // シリアルコマンド処理
  handleSerialCommand();

  // ユーザーループコード
  userLoop();

  // 接続クライアント数表示（デバッグ用）
  static unsigned long lastClientCheck = 0;
  if (millis() - lastClientCheck > 10000) {  // 10秒ごと
    int clients = WiFi.softAPgetStationNum();
    if (clients > 0) {
      Serial.print("Connected clients: ");
      Serial.println(clients);
    }
    lastClientCheck = millis();
  }
}

// ============================================
// 設定管理（Preferences / NVS）
// ============================================

void loadDeviceConfig() {
  preferences.begin("digicode", false);  // Read-Write mode

  // UUIDを読み込み（保存されていなければデフォルト値）
  device_uuid = preferences.getString("uuid", "robot001");
  device_name = preferences.getString("name", "My Robot");

  preferences.end();

  Serial.println("Device config loaded:");
  Serial.println("  UUID: " + device_uuid);
  Serial.println("  Name: " + device_name);
}

void saveDeviceConfig() {
  preferences.begin("digicode", false);

  preferences.putString("uuid", device_uuid);
  preferences.putString("name", device_name);

  preferences.end();

  Serial.println("Device config saved!");
  Serial.println("  UUID: " + device_uuid);
  Serial.println("  Name: " + device_name);
}

// ============================================
// WiFi管理（複数WiFi保存・接続）
// ============================================

void loadWiFiList() {
  preferences.begin("digicode", false);

  wifiCount = preferences.getInt("wifi_count", 0);
  if (wifiCount > MAX_WIFI_COUNT) wifiCount = MAX_WIFI_COUNT;

  Serial.printf("Loading %d WiFi credentials...\n", wifiCount);

  for (int i = 0; i < wifiCount; i++) {
    String ssidKey = "wifi_" + String(i) + "_ssid";
    String passKey = "wifi_" + String(i) + "_pass";

    wifiList[i].ssid = preferences.getString(ssidKey.c_str(), "");
    wifiList[i].password = preferences.getString(passKey.c_str(), "");

    Serial.printf("  [%d] %s\n", i, wifiList[i].ssid.c_str());
  }

  preferences.end();
}

void saveWiFiList() {
  preferences.begin("digicode", false);

  preferences.putInt("wifi_count", wifiCount);

  for (int i = 0; i < wifiCount; i++) {
    String ssidKey = "wifi_" + String(i) + "_ssid";
    String passKey = "wifi_" + String(i) + "_pass";

    preferences.putString(ssidKey.c_str(), wifiList[i].ssid);
    preferences.putString(passKey.c_str(), wifiList[i].password);
  }

  preferences.end();

  Serial.println("WiFi list saved!");
}

bool addWiFi(String ssid, String password) {
  // 既に存在するかチェック
  for (int i = 0; i < wifiCount; i++) {
    if (wifiList[i].ssid == ssid) {
      // 既存のパスワードを更新
      wifiList[i].password = password;
      Serial.println("WiFi updated: " + ssid);
      return true;
    }
  }

  // 新規追加
  if (wifiCount >= MAX_WIFI_COUNT) {
    Serial.println("ERROR: WiFi list full (max 5)");
    return false;
  }

  wifiList[wifiCount].ssid = ssid;
  wifiList[wifiCount].password = password;
  wifiCount++;

  Serial.println("WiFi added: " + ssid);
  return true;
}

bool removeWiFi(String ssid) {
  int foundIndex = -1;

  for (int i = 0; i < wifiCount; i++) {
    if (wifiList[i].ssid == ssid) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex == -1) {
    Serial.println("ERROR: WiFi not found: " + ssid);
    return false;
  }

  // リストを詰める
  for (int i = foundIndex; i < wifiCount - 1; i++) {
    wifiList[i] = wifiList[i + 1];
  }

  wifiCount--;
  Serial.println("WiFi removed: " + ssid);
  return true;
}

void listWiFi() {
  Serial.println("=== Saved WiFi List ===");
  Serial.printf("Count: %d / %d\n", wifiCount, MAX_WIFI_COUNT);

  if (wifiCount == 0) {
    Serial.println("  (No WiFi saved)");
  } else {
    for (int i = 0; i < wifiCount; i++) {
      String mask = "";
      for (int j = 0; j < wifiList[i].password.length(); j++) {
        mask += "*";
      }

      String status = "";
      if (wifiList[i].ssid == connectedSSID) {
        status = " [CONNECTED]";
      }

      Serial.printf("  [%d] %s (password: %s)%s\n",
                    i,
                    wifiList[i].ssid.c_str(),
                    mask.c_str(),
                    status.c_str());
    }
  }
  Serial.println("=======================");
}

void clearAllWiFi() {
  wifiCount = 0;
  preferences.begin("digicode", false);
  preferences.putInt("wifi_count", 0);
  preferences.end();
  Serial.println("All WiFi credentials cleared!");
}

bool connectToWiFi() {
  if (wifiCount == 0) {
    Serial.println("No WiFi credentials saved. Starting AP mode...");
    return false;
  }

  Serial.println("Trying to connect to saved WiFi networks...");

  WiFi.mode(WIFI_STA);

  for (int i = 0; i < wifiCount; i++) {
    Serial.printf("[%d/%d] Trying: %s ", i + 1, wifiCount, wifiList[i].ssid.c_str());

    WiFi.begin(wifiList[i].ssid.c_str(), wifiList[i].password.c_str());

    // 10秒待機
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println(" OK!");
      connectedSSID = wifiList[i].ssid;
      Serial.println("WiFi connected!");
      Serial.print("IP address: ");
      Serial.println(WiFi.localIP());
      return true;
    } else {
      Serial.println(" Failed");
    }
  }

  Serial.println("All WiFi attempts failed. Starting AP mode...");
  return false;
}

// ============================================
// シリアルコマンド処理
// ============================================

void handleSerialCommand() {
  while (Serial.available() > 0) {
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

void processCommand(String command) {
  command.trim();

  if (command.startsWith("SET_UUID:")) {
    String newUuid = command.substring(9);
    newUuid.trim();

    if (newUuid.length() >= 3 && newUuid.length() <= 20) {
      device_uuid = newUuid;
      Serial.println("OK:UUID=" + device_uuid);
    } else {
      Serial.println("ERROR:Invalid UUID length (3-20 chars required)");
    }
  }
  else if (command.startsWith("SET_NAME:")) {
    String newName = command.substring(9);
    newName.trim();

    if (newName.length() > 0) {
      device_name = newName;
      Serial.println("OK:NAME=" + device_name);
    } else {
      Serial.println("ERROR:Invalid device name");
    }
  }
  else if (command == "SAVE_CONFIG") {
    saveDeviceConfig();
    Serial.println("OK:CONFIG_SAVED");
    Serial.println("INFO:Please restart ESP32 to apply new settings");
  }
  else if (command == "GET_CONFIG") {
    Serial.println("OK:UUID=" + device_uuid);
    Serial.println("OK:NAME=" + device_name);
    Serial.println("OK:SSID=DigiCode-" + device_uuid);
  }
  else if (command == "RESTART") {
    Serial.println("OK:RESTARTING");
    delay(1000);
    ESP.restart();
  }
  else if (command.startsWith("ADD_WIFI:")) {
    // フォーマット: ADD_WIFI:ssid,password
    String params = command.substring(9);
    int commaIndex = params.indexOf(',');

    if (commaIndex > 0) {
      String ssid = params.substring(0, commaIndex);
      String password = params.substring(commaIndex + 1);

      ssid.trim();
      password.trim();

      if (addWiFi(ssid, password)) {
        saveWiFiList();
        Serial.println("OK:WIFI_ADDED");
      } else {
        Serial.println("ERROR:WIFI_ADD_FAILED");
      }
    } else {
      Serial.println("ERROR:Invalid format. Use: ADD_WIFI:ssid,password");
    }
  }
  else if (command.startsWith("REMOVE_WIFI:")) {
    String ssid = command.substring(12);
    ssid.trim();

    if (removeWiFi(ssid)) {
      saveWiFiList();
      Serial.println("OK:WIFI_REMOVED");
    } else {
      Serial.println("ERROR:WIFI_REMOVE_FAILED");
    }
  }
  else if (command == "LIST_WIFI") {
    listWiFi();
    Serial.println("OK:WIFI_LIST_SHOWN");
  }
  else if (command == "GET_CURRENT_WIFI") {
    if (isAPMode) {
      Serial.println("OK:MODE=AP");
      Serial.println("OK:SSID=DigiCode-" + device_uuid);
    } else {
      Serial.println("OK:MODE=STATION");
      Serial.println("OK:CONNECTED_SSID=" + connectedSSID);
      Serial.println("OK:IP=" + WiFi.localIP().toString());
    }
  }
  else if (command == "CLEAR_WIFI") {
    clearAllWiFi();
    Serial.println("OK:WIFI_CLEARED");
    Serial.println("INFO:Please restart ESP32 to apply changes");
  }
  else {
    // 未知のコマンドは無視（ユーザーコード実行など）
  }
}

// ============================================
// Webサーバー設定
// ============================================

// CORSヘッダーを追加するヘルパー関数
void sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void setupWebServer() {
  // CORS Preflight対応
  server.on("/", HTTP_OPTIONS, [](){
    sendCORSHeaders();
    server.send(204);
  });

  // ルート: デバイス情報ページ
  server.on("/", [](){
    sendCORSHeaders();
    String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DigiCode Device Info</title>
  <style>
    body { font-family: Arial; margin: 40px; background: #f0f0f0; }
    .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    .info { margin: 20px 0; }
    .info-item { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #4CAF50; }
    .info-label { font-weight: bold; color: #666; }
    .info-value { color: #333; }
    .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .button:hover { background: #45a049; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 DigiCode Device</h1>
    <div class="info">
      <div class="info-item">
        <span class="info-label">Device Name:</span>
        <span class="info-value">)" + device_name + R"(</span>
      </div>
      <div class="info-item">
        <span class="info-label">Device UUID:</span>
        <span class="info-value">)" + device_uuid + R"(</span>
      </div>
      <div class="info-item">
        <span class="info-label">WiFi Mode:</span>
        <span class="info-value">)" + String(isAPMode ? "AP Mode" : "Station Mode") + R"(</span>
      </div>
      <div class="info-item">
        <span class="info-label">)" + String(isAPMode ? "AP SSID:" : "Connected to:") + R"(</span>
        <span class="info-value">)" + String(isAPMode ? "DigiCode-" + device_uuid : connectedSSID) + R"(</span>
      </div>
      <div class="info-item">
        <span class="info-label">IP Address:</span>
        <span class="info-value">)" + String(isAPMode ? "192.168.4.1" : WiFi.localIP().toString()) + R"(</span>
      </div>
      <div class="info-item">
        <span class="info-label">mDNS:</span>
        <span class="info-value">digicode-)" + device_uuid + R"(.local</span>
      </div>
      <div class="info-item">
        <span class="info-label">Firmware Version:</span>
        <span class="info-value">1.3.3</span>
      </div>
    </div>
    <a href="/update" class="button">🔄 OTA Update</a>
  </div>
</body>
</html>
    )";
    server.send(200, "text/html", html);
  });

  // ルート: OTA更新フォーム
  server.on("/update", HTTP_GET, [](){
    String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DigiCode OTA Update</title>
  <style>
    body { font-family: Arial; margin: 40px; background: #f0f0f0; }
    .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #FF5722; padding-bottom: 10px; }
    .warning { background: #FFF3CD; border: 1px solid #FFE69C; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .form-group { margin: 20px 0; }
    label { display: block; margin-bottom: 5px; font-weight: bold; color: #666; }
    input[type="file"] { width: 100%; padding: 10px; border: 2px dashed #ccc; border-radius: 5px; }
    button { width: 100%; padding: 15px; background: #FF5722; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
    button:hover { background: #E64A19; }
    .progress { display: none; margin-top: 20px; }
    .progress-bar { width: 100%; height: 30px; background: #f0f0f0; border-radius: 5px; overflow: hidden; }
    .progress-fill { height: 100%; background: #4CAF50; transition: width 0.3s; }
    .progress-text { text-align: center; margin-top: 10px; font-weight: bold; }
    .success { background: #D4EDDA; border: 2px solid #4CAF50; padding: 20px; border-radius: 5px; color: #155724; font-size: 18px; }
    .error { background: #F8D7DA; border: 2px solid #DC3545; padding: 20px; border-radius: 5px; color: #721C24; font-size: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔄 ファームウェアOTA更新</h1>
    <div class="warning">
      ⚠️ <strong>警告:</strong> 更新中は絶対に電源を切らないでください！
    </div>
    <form id="uploadForm" enctype="multipart/form-data">
      <div class="form-group">
        <label for="firmware">ファームウェアファイル (.bin):</label>
        <input type="file" id="firmware" name="firmware" accept=".bin" required>
      </div>
      <button type="submit">アップロード＆更新</button>
    </form>
    <div class="progress" id="progress">
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
      <div class="progress-text" id="progressText">アップロード中: 0%</div>
    </div>
  </div>
  <script>
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('firmware');
      const file = fileInput.files[0];
      if (!file) return;

      const progress = document.getElementById('progress');
      const progressFill = document.getElementById('progressFill');
      const progressText = document.getElementById('progressText');

      progress.style.display = 'block';
      document.querySelector('button').disabled = true;

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          progressFill.style.width = percent + '%';
          progressText.textContent = 'アップロード中: ' + Math.round(percent) + '%';
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          progressText.textContent = '✅ 更新成功！再起動しています...';
          progressText.className = 'progress-text success';
          progressFill.style.width = '100%';
          setTimeout(() => {
            progressText.textContent = '✅ 更新完了！デバイスが再起動しました。5秒後にトップページに戻ります...';
          }, 1000);
          setTimeout(() => {
            window.location.href = '/';
          }, 5000);
        } else {
          progressText.textContent = '❌ 更新失敗: ' + xhr.responseText;
          progressText.className = 'progress-text error';
          document.querySelector('button').disabled = false;
        }
      });

      xhr.addEventListener('error', () => {
        progressText.textContent = '❌ アップロードエラー';
        progressText.className = 'progress-text error';
        document.querySelector('button').disabled = false;
      });

      xhr.open('POST', '/doUpdate');
      const formData = new FormData();
      formData.append('firmware', file);
      xhr.send(formData);
    });
  </script>
</body>
</html>
    )";
    server.send(200, "text/html", html);
  });

  // CORS Preflight対応: /doUpdate
  server.on("/doUpdate", HTTP_OPTIONS, [](){
    sendCORSHeaders();
    server.send(204);
  });

  // ルート: OTA更新実行（POST）
  server.on("/doUpdate", HTTP_POST, [](){
    sendCORSHeaders();
    server.sendHeader("Connection", "close");
    server.send(200, "text/plain", (Update.hasError()) ? "FAIL" : "OK");
    ESP.restart();
  }, [](){
    HTTPUpload& upload = server.upload();
    if (upload.status == UPLOAD_FILE_START) {
      Serial.println("OTA Update Start");
      Serial.printf("Filename: %s\n", upload.filename.c_str());
      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_END) {
      if (Update.end(true)) {
        Serial.printf("Update Success: %u bytes\n", upload.totalSize);
      } else {
        Update.printError(Serial);
      }
    }
  });

  server.begin();
  Serial.println("HTTP server started on http://192.168.4.1");
}

// ============================================
// ユーザーコード（Blocklyから生成される部分）
// ============================================

void userSetup() {
  // Blocklyから生成されたセットアップコードがここに挿入される
  // 例: モーター初期化、センサー初期化など

  Serial.println("User setup completed.");
}

void userLoop() {
  // Blocklyから生成されたループコードがここに挿入される
  // 例: センサー読み取り、モーター制御など

  // デフォルト動作：LED点滅（動作確認用）
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 1000) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    lastBlink = millis();
  }
}
