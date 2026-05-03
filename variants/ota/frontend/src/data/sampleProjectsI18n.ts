/**
 * Sample project translations for non-Japanese languages.
 *
 * Structure mirrors tutorialsI18n.ts:
 * - `sampleProjects.ts` holds canonical Japanese text + blocklyXml (fallback).
 * - This file layers id-based overrides per locale.
 * - `useLocalizedSampleProjects()` merges at render time.
 * - Adding a new sample: edit only `sampleProjects.ts`. Translations optional.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { sampleProjects as baseSamples, sampleCategories as baseCategories, type SampleProject } from './sampleProjects';

interface SampleOverride {
  title?: string;
  description?: string;
}
interface CategoryOverride {
  name?: string;
}
interface LocaleOverride {
  categories?: Partial<Record<keyof typeof baseCategories, CategoryOverride>>;
  samples?: Record<string, SampleOverride>;
}

const overrides: Record<string, LocaleOverride> = {
  en: {
    categories: {
      basic: { name: 'Basics' },
      sensor: { name: 'Sensors' },
      motor: { name: 'Motors / LEDs' },
      robots: { name: 'Robots' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'LED Blink',
        description: 'A basic program that blinks an LED every second',
      },
      'serial-hello': {
        title: 'Serial Communication',
        description: 'Print "Hello DigiCode!" to the serial monitor',
      },
      'ultrasonic-distance': {
        title: 'Ultrasonic Distance Sensor',
        description: 'Measure distance with HC-SR04 and print to serial',
      },
      'dht-sensor': {
        title: 'Temperature/Humidity Sensor',
        description: 'Measure temperature and humidity with a DHT sensor',
      },
      'servo-sweep': {
        title: 'Servo Sweep',
        description: 'Sweep a servo motor between 0° and 180°',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel Rainbow',
        description: 'Display rainbow colors on NeoPixel LEDs',
      },
      'wheel-obstacle': {
        title: 'Wheel Robot Obstacle Avoidance',
        description: 'Detect and avoid obstacles with the ultrasonic sensor',
      },
      'transform-ninja': {
        title: 'Transform Robot',
        description: 'Move while switching between Walk/Roll modes',
      },
      'humanoid-dance': {
        title: 'Humanoid Dance',
        description: 'Make the humanoid robot perform various dances',
      },
      'ha-temperature-sensor': {
        title: 'HA Temperature Sensor',
        description: 'Auto-register a temperature sensor with Home Assistant',
      },
      'ha-led-control': {
        title: 'Home Assistant LED Control',
        description: 'Toggle an LED from Home Assistant via MQTT',
      },
      'ha-smart-relay': {
        title: 'HA Smart Relay',
        description: 'Smart relay controllable from Home Assistant',
      },
      'ha-rgb-led': {
        title: 'HA RGB LED',
        description: 'Control an RGB LED color from Home Assistant',
      },
      'ha-multi-sensor': {
        title: 'HA Multi-Sensor Node',
        description: 'Combined temperature/humidity/motion sensor node',
      },
      'temp-alert': {
        title: 'Temperature Alert',
        description: 'Send BLE alert when temperature exceeds 30°C, otherwise turn off LED',
      },
      'proximity-stop': {
        title: 'Proximity Stop',
        description: 'Stop when obstacle within 20cm, otherwise drive forward',
      },
      'ble-uart-receive': {
        title: 'BLE UART Receive',
        description: 'Flash LED for 200ms when BLE message received',
      },
      'ble-uart-command-control': {
        title: 'BLE Command Control',
        description: 'Switch LED HIGH/LOW based on received "ON"/"OFF" command (BLE branching pattern)',
      },
      'ble-beacon-scanner': {
        title: 'BLE Beacon Scanner',
        description: 'Scan nearby BLE devices and log to serial',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT Custom',
        description: 'Periodically notify a custom GATT characteristic',
      },
      'ble-gatt-command-control': {
        title: 'BLE GATT Command Control',
        description: 'Switch LED HIGH/LOW based on GATT Write received "ON"/"OFF" command (GATT branching pattern)',
      },
      'ble-scan-filter-by-name': {
        title: 'BLE Scan Filter by Name',
        description: 'Log address and RSSI to serial when a specific device name is detected during scan (scan-result branching pattern)',
      },
      'humanoid-walk': {
        title: 'Humanoid Walk',
        description: 'Humanoid robot walks back and forth (basic motion)',
      },
      'wheel-line-follow': {
        title: 'Wheel Line Follow',
        description: 'Follow a line forward using light sensors',
      },
      'transform-morph': {
        title: 'Transform Morph',
        description: 'Move while morphing between Walk and Roll modes',
      },
      'http-get-request': {
        title: 'HTTP GET Request',
        description: 'Fetch data from URL via HTTP GET and print to serial',
      },
      'mqtt-direct': {
        title: 'MQTT Direct Publish',
        description: 'Publish DHT temperature directly to MQTT broker (no HA)',
      },
      'ntp-time-sync': {
        title: 'NTP Time Sync',
        description: 'Sync time via NTP and print to serial periodically',
      },
      'sensor-actuator-combo': {
        title: 'Sensor + Actuator Combo',
        description: 'Control servo angle and LED based on temperature',
      },
      'humanoid-gesture': {
        title: 'Humanoid Gestures',
        description: 'Humanoid performs Wave / Happy / Magic gestures in sequence',
      },
      'wheel-remote-control': {
        title: 'Wheel Remote Control',
        description: 'Drive Wheel forward for 1 s on BLE message, then stop',
      },
      'multi-sensor-dashboard': {
        title: 'Multi-Sensor Dashboard',
        description: 'Print temperature, humidity and distance to serial as a dashboard',
      },
      'neopixel-animation': {
        title: 'NeoPixel Fade Animation',
        description: 'Fade NeoPixel brightness from 0 to 255 step by step',
      },
      'nvs-counter': {
        title: 'NVS Boot Counter',
        description: 'Persist boot count in NVS (Preferences) and increment on every boot',
      },
      'interrupt-button': {
        title: 'Button Interrupt',
        description: 'Detect button press via interrupt and log to serial (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'I2C LCD Text Display',
        description: 'Show two lines of text on a 16x2 I2C LCD',
      },
      'dfplayer-music': {
        title: 'DFPlayer Music Playback',
        description: 'Play two tracks in sequence on DFPlayer Mini (10 s each)',
      },
      'wifi-controller-mix': {
        title: 'WiFi Controller Combo (LED + Servo + Temperature)',
        description: 'Bundle LED toggle / servo slider / temperature display on one ESP32 and control them from any browser via the WebSocket controller',
      },
    },
  },
  es: {
    categories: {
      basic: { name: 'Básicos' },
      sensor: { name: 'Sensores' },
      motor: { name: 'Motores / LEDs' },
      robots: { name: 'Robots' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'Parpadeo de LED',
        description: 'Programa básico que hace parpadear un LED cada segundo',
      },
      'serial-hello': {
        title: 'Comunicación serie',
        description: 'Imprime "Hello DigiCode!" en el monitor serie',
      },
      'ultrasonic-distance': {
        title: 'Sensor de distancia ultrasonido',
        description: 'Mide la distancia con HC-SR04 y muéstrala por serie',
      },
      'dht-sensor': {
        title: 'Sensor de temperatura/humedad',
        description: 'Mide temperatura y humedad con un sensor DHT',
      },
      'servo-sweep': {
        title: 'Barrido de servo',
        description: 'Barrido de servo entre 0° y 180°',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel arcoíris',
        description: 'Muestra colores del arcoíris en LEDs NeoPixel',
      },
      'wheel-obstacle': {
        title: 'Evitar obstáculos robot Wheel',
        description: 'Detecta y evita obstáculos con el sensor de ultrasonidos',
      },
      'transform-ninja': {
        title: 'Robot Transform',
        description: 'Se mueve alternando entre modos Walk/Roll',
      },
      'humanoid-dance': {
        title: 'Baile robot Humanoid',
        description: 'Hace que el robot humanoide ejecute varios bailes',
      },
      'ha-temperature-sensor': {
        title: 'HA sensor de temperatura',
        description: 'Auto-registrar un sensor de temperatura en Home Assistant',
      },
      'ha-led-control': {
        title: 'Home Assistant control LED',
        description: 'Enciende/apaga un LED desde Home Assistant por MQTT',
      },
      'ha-smart-relay': {
        title: 'HA relé inteligente',
        description: 'Relé inteligente controlable desde Home Assistant',
      },
      'ha-rgb-led': {
        title: 'HA LED RGB',
        description: 'Controla el color de un LED RGB desde Home Assistant',
      },
      'ha-multi-sensor': {
        title: 'HA nodo multi-sensor',
        description: 'Nodo sensor combinado de temperatura/humedad/movimiento',
      },
      'temp-alert': {
        title: 'Alerta de temperatura',
        description: 'Envía alerta BLE cuando la temperatura supera 30°C, si no apaga el LED',
      },
      'proximity-stop': {
        title: 'Parada por proximidad',
        description: 'Para cuando hay obstáculo a menos de 20cm, si no avanza',
      },
      'ble-uart-receive': {
        title: 'Recepción BLE UART',
        description: 'Parpadea el LED 200ms al recibir un mensaje BLE',
      },
      'ble-uart-command-control': {
        title: 'Control por comando BLE',
        description: 'Enciende/apaga el LED según el comando "ON"/"OFF" recibido por BLE (patrón de bifurcación BLE)',
      },
      'ble-beacon-scanner': {
        title: 'Escáner de beacons BLE',
        description: 'Escanea dispositivos BLE cercanos y muestra por serie',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT personalizado',
        description: 'Notifica periódicamente una característica GATT personalizada',
      },
      'ble-gatt-command-control': {
        title: 'Control por comando GATT BLE',
        description: 'Enciende/apaga el LED según el comando "ON"/"OFF" recibido por GATT Write (patrón de bifurcación GATT)',
      },
      'ble-scan-filter-by-name': {
        title: 'Filtro de escaneo BLE por nombre',
        description: 'Registra address y RSSI por serie al detectar un nombre específico durante el escaneo (patrón de bifurcación por resultado de escaneo)',
      },
      'humanoid-walk': {
        title: 'Caminata Humanoid',
        description: 'El robot humanoide camina hacia adelante y atrás',
      },
      'wheel-line-follow': {
        title: 'Seguimiento de línea Wheel',
        description: 'Sigue una línea hacia adelante con sensores de luz',
      },
      'transform-morph': {
        title: 'Transformación Transform',
        description: 'Se mueve cambiando entre modos Walk y Roll',
      },
      'http-get-request': {
        title: 'Petición HTTP GET',
        description: 'Obtiene datos de una URL por HTTP GET y los imprime',
      },
      'mqtt-direct': {
        title: 'MQTT publicación directa',
        description: 'Publica la temperatura DHT directamente al broker MQTT',
      },
      'ntp-time-sync': {
        title: 'Sincronización NTP',
        description: 'Sincroniza la hora vía NTP e imprime periódicamente',
      },
      'sensor-actuator-combo': {
        title: 'Combo sensor + actuador',
        description: 'Controla ángulo de servo y LED según temperatura',
      },
      'humanoid-gesture': {
        title: 'Gestos Humanoid',
        description: 'El humanoide realiza los gestos Wave / Happy / Magic en secuencia',
      },
      'wheel-remote-control': {
        title: 'Wheel control remoto',
        description: 'Avanza Wheel 1 s al recibir un mensaje BLE y luego se detiene',
      },
      'multi-sensor-dashboard': {
        title: 'Dashboard multi-sensor',
        description: 'Imprime temperatura, humedad y distancia en serie como un dashboard',
      },
      'neopixel-animation': {
        title: 'Animación de fundido NeoPixel',
        description: 'Aumenta el brillo del NeoPixel de 0 a 255 paso a paso',
      },
      'nvs-counter': {
        title: 'Contador de arranques en NVS',
        description: 'Guarda el contador de arranques en NVS (Preferences) e incrementa en cada arranque',
      },
      'interrupt-button': {
        title: 'Botón con interrupción',
        description: 'Detecta la pulsación del botón por interrupción y la registra en serie (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'LCD I2C texto',
        description: 'Muestra dos líneas de texto en un LCD I2C de 16x2',
      },
      'dfplayer-music': {
        title: 'Reproducción musical DFPlayer',
        description: 'Reproduce dos pistas en orden con DFPlayer Mini (10 s cada una)',
      },
      'wifi-controller-mix': {
        title: 'Combo controlador WiFi (LED + Servo + Temperatura)',
        description: 'Agrupa toggle LED / slider de servo / display de temperatura en un ESP32 y contrólalos desde cualquier navegador vía el controlador WebSocket',
      },
    },
  },
  'pt-PT': {
    categories: {
      basic: { name: 'Básico' },
      sensor: { name: 'Sensores' },
      motor: { name: 'Motores / LEDs' },
      robots: { name: 'Robôs' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'LED a piscar',
        description: 'Programa básico que pisca um LED a cada segundo',
      },
      'serial-hello': {
        title: 'Comunicação série',
        description: 'Imprime "Hello DigiCode!" no monitor série',
      },
      'ultrasonic-distance': {
        title: 'Sensor de distância ultrassónico',
        description: 'Mede a distância com HC-SR04 e imprime na série',
      },
      'dht-sensor': {
        title: 'Sensor de temperatura/humidade',
        description: 'Mede temperatura e humidade com um sensor DHT',
      },
      'servo-sweep': {
        title: 'Varrimento do servo',
        description: 'Servo a varrer entre 0° e 180°',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel arco-íris',
        description: 'Mostra cores do arco-íris em LEDs NeoPixel',
      },
      'wheel-obstacle': {
        title: 'Robot Wheel a evitar obstáculos',
        description: 'Deteta e evita obstáculos com o sensor ultrassónico',
      },
      'transform-ninja': {
        title: 'Robot Transform',
        description: 'Move-se alternando entre modos Walk/Roll',
      },
      'humanoid-dance': {
        title: 'Dança do robot Humanoid',
        description: 'Faz o robot humanoide executar várias danças',
      },
      'ha-temperature-sensor': {
        title: 'HA sensor de temperatura',
        description: 'Auto-registar um sensor de temperatura no Home Assistant',
      },
      'ha-led-control': {
        title: 'Home Assistant controlo de LED',
        description: 'Liga/desliga um LED a partir do Home Assistant por MQTT',
      },
      'ha-smart-relay': {
        title: 'HA relé inteligente',
        description: 'Relé inteligente controlável a partir do Home Assistant',
      },
      'ha-rgb-led': {
        title: 'HA LED RGB',
        description: 'Controla a cor de um LED RGB a partir do Home Assistant',
      },
      'ha-multi-sensor': {
        title: 'HA nó multi-sensor',
        description: 'Nó combinado de temperatura/humidade/movimento',
      },
      'temp-alert': {
        title: 'Alerta de temperatura',
        description: 'Envia alerta BLE quando a temperatura excede 30°C, senão desliga o LED',
      },
      'proximity-stop': {
        title: 'Paragem por proximidade',
        description: 'Para quando há obstáculo a menos de 20cm, senão avança',
      },
      'ble-uart-receive': {
        title: 'Receção BLE UART',
        description: 'Pisca o LED 200ms ao receber uma mensagem BLE',
      },
      'ble-uart-command-control': {
        title: 'Controlo por comando BLE',
        description: 'Liga/desliga o LED conforme o comando "ON"/"OFF" recebido via BLE (padrão de bifurcação BLE)',
      },
      'ble-beacon-scanner': {
        title: 'Scanner de beacons BLE',
        description: 'Faz scan de dispositivos BLE próximos e imprime na série',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT personalizado',
        description: 'Notifica periodicamente uma característica GATT personalizada',
      },
      'ble-gatt-command-control': {
        title: 'Controlo por comando GATT BLE',
        description: 'Liga/desliga o LED conforme o comando "ON"/"OFF" recebido via GATT Write (padrão de bifurcação GATT)',
      },
      'ble-scan-filter-by-name': {
        title: 'Filtro de pesquisa BLE por nome',
        description: 'Regista address e RSSI na série ao detetar um nome específico durante a pesquisa (padrão de bifurcação por resultado de pesquisa)',
      },
      'humanoid-walk': {
        title: 'Caminhada Humanoid',
        description: 'O robot humanoide caminha para frente e para trás',
      },
      'wheel-line-follow': {
        title: 'Seguimento de linha Wheel',
        description: 'Segue uma linha em frente com sensores de luz',
      },
      'transform-morph': {
        title: 'Transformação Transform',
        description: 'Move-se alternando entre modos Walk e Roll',
      },
      'http-get-request': {
        title: 'Pedido HTTP GET',
        description: 'Obtém dados de um URL via HTTP GET e imprime na série',
      },
      'mqtt-direct': {
        title: 'MQTT publicação direta',
        description: 'Publica a temperatura DHT diretamente no broker MQTT',
      },
      'ntp-time-sync': {
        title: 'Sincronização NTP',
        description: 'Sincroniza a hora via NTP e imprime periodicamente',
      },
      'sensor-actuator-combo': {
        title: 'Combo sensor + atuador',
        description: 'Controla o ângulo do servo e o LED conforme a temperatura',
      },
      'humanoid-gesture': {
        title: 'Gestos Humanoid',
        description: 'O humanoide executa os gestos Wave / Happy / Magic em sequência',
      },
      'wheel-remote-control': {
        title: 'Wheel comando remoto',
        description: 'Faz o Wheel avançar 1 s ao receber uma mensagem BLE e depois para',
      },
      'multi-sensor-dashboard': {
        title: 'Dashboard multi-sensor',
        description: 'Imprime temperatura, humidade e distância na série como um dashboard',
      },
      'neopixel-animation': {
        title: 'Animação de fade NeoPixel',
        description: 'Aumenta o brilho do NeoPixel de 0 a 255 passo a passo',
      },
      'nvs-counter': {
        title: 'Contador de arranques em NVS',
        description: 'Guarda o contador de arranques em NVS (Preferences) e incrementa a cada arranque',
      },
      'interrupt-button': {
        title: 'Botão com interrupção',
        description: 'Deteta a pressão do botão por interrupção e regista na série (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'LCD I2C texto',
        description: 'Mostra duas linhas de texto num LCD I2C de 16x2',
      },
      'dfplayer-music': {
        title: 'Reprodução musical DFPlayer',
        description: 'Reproduz duas faixas em sequência no DFPlayer Mini (10 s cada)',
      },
      'wifi-controller-mix': {
        title: 'Combo controlador WiFi (LED + Servo + Temperatura)',
        description: 'Agrupa toggle LED / slider de servo / display de temperatura num ESP32 e controla-os a partir de qualquer browser via o controlador WebSocket',
      },
    },
  },
  'zh-TW': {
    categories: {
      basic: { name: '基礎' },
      sensor: { name: '感測器' },
      motor: { name: '馬達 / LED' },
      robots: { name: '機器人' },
      iot: { name: 'IoT / HA' },
    },
    samples: {
      'led-blink': {
        title: 'LED 閃爍',
        description: '讓 LED 每秒閃爍一次的基本程式',
      },
      'serial-hello': {
        title: '序列通訊',
        description: '在序列監視器輸出 "Hello DigiCode!"',
      },
      'ultrasonic-distance': {
        title: '超音波距離感測器',
        description: '使用 HC-SR04 測量距離並輸出到序列',
      },
      'dht-sensor': {
        title: '溫濕度感測器',
        description: '使用 DHT 感測器測量溫度與濕度',
      },
      'servo-sweep': {
        title: '伺服掃描',
        description: '讓伺服馬達在 0° 到 180° 之間往返',
      },
      'neopixel-rainbow': {
        title: 'NeoPixel 彩虹',
        description: '在 NeoPixel LED 上顯示彩虹色',
      },
      'wheel-obstacle': {
        title: 'Wheel 機器人避障',
        description: '用超音波感測器偵測並避開障礙物',
      },
      'transform-ninja': {
        title: 'Transform 機器人',
        description: '切換 Walk/Roll 模式移動',
      },
      'humanoid-dance': {
        title: 'Humanoid 舞蹈',
        description: '讓仿人形機器人表演各種舞蹈',
      },
      'ha-temperature-sensor': {
        title: 'HA 溫度感測器',
        description: '在 Home Assistant 自動註冊溫度感測器',
      },
      'ha-led-control': {
        title: 'Home Assistant LED 控制',
        description: '透過 MQTT 從 Home Assistant 切換 LED',
      },
      'ha-smart-relay': {
        title: 'HA 智慧繼電器',
        description: '可從 Home Assistant 控制的智慧繼電器',
      },
      'ha-rgb-led': {
        title: 'HA RGB LED',
        description: '從 Home Assistant 控制 RGB LED 的顏色',
      },
      'ha-multi-sensor': {
        title: 'HA 複合感測節點',
        description: '溫度/濕度/動作的複合感測節點',
      },
      'temp-alert': {
        title: '溫度警報',
        description: '溫度超過 30°C 時透過 BLE 發送警報，否則熄滅 LED',
      },
      'proximity-stop': {
        title: '障礙物停止',
        description: '偵測到 20cm 內的障礙物時停止，否則前進',
      },
      'ble-uart-receive': {
        title: 'BLE UART 接收',
        description: '收到 BLE 訊息時 LED 閃爍 200ms',
      },
      'ble-uart-command-control': {
        title: 'BLE 指令控制',
        description: '依據透過 BLE 接收的 "ON"/"OFF" 指令切換 LED 高/低（BLE 條件分支範例）',
      },
      'ble-beacon-scanner': {
        title: 'BLE 信標掃描',
        description: '掃描附近的 BLE 裝置並輸出到序列',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT 自訂',
        description: '定期通知自訂 GATT 特徵',
      },
      'ble-gatt-command-control': {
        title: 'BLE GATT 指令控制',
        description: '依據透過 GATT Write 接收的 "ON"/"OFF" 指令切換 LED 高/低（GATT 條件分支範例）',
      },
      'ble-scan-filter-by-name': {
        title: 'BLE 掃描名稱篩選',
        description: '掃描期間偵測到特定裝置名稱時，將位址與 RSSI 輸出到序列埠（依掃描結果分支的範例）',
      },
      'humanoid-walk': {
        title: 'Humanoid 行走',
        description: '仿人形機器人前後行走',
      },
      'wheel-line-follow': {
        title: 'Wheel 循跡',
        description: '用光感測器循線前進',
      },
      'transform-morph': {
        title: 'Transform 形態變化',
        description: '在 Walk 與 Roll 模式間切換移動',
      },
      'http-get-request': {
        title: 'HTTP GET 請求',
        description: '透過 HTTP GET 從 URL 取得資料並輸出到序列',
      },
      'mqtt-direct': {
        title: 'MQTT 直接發布',
        description: '將 DHT 溫度直接發布到 MQTT broker (不經 HA)',
      },
      'ntp-time-sync': {
        title: 'NTP 時間同步',
        description: '透過 NTP 同步時間並定期輸出到序列',
      },
      'sensor-actuator-combo': {
        title: '感測器+致動器組合',
        description: '根據溫度控制伺服角度與 LED',
      },
      'humanoid-gesture': {
        title: 'Humanoid 手勢動作',
        description: 'Humanoid 依序執行 Wave / Happy / Magic 等手勢',
      },
      'wheel-remote-control': {
        title: 'Wheel 遠端控制',
        description: '收到 BLE 訊息時 Wheel 前進 1 秒後停止',
      },
      'multi-sensor-dashboard': {
        title: '多感測器儀表板',
        description: '將溫度、濕度、距離以儀表板格式輸出到序列',
      },
      'neopixel-animation': {
        title: 'NeoPixel 漸變動畫',
        description: '將 NeoPixel 亮度從 0 漸進到 255',
      },
      'nvs-counter': {
        title: 'NVS 開機計數器',
        description: '使用 NVS (Preferences) 儲存開機次數，每次開機自動加 1',
      },
      'interrupt-button': {
        title: '按鈕中斷',
        description: '透過中斷偵測按鈕按下並輸出到序列 (FALLING / INPUT_PULLUP)',
      },
      'lcd-display': {
        title: 'I2C LCD 文字顯示',
        description: '在 16x2 I2C LCD 顯示兩行文字',
      },
      'dfplayer-music': {
        title: 'DFPlayer 音樂播放',
        description: '使用 DFPlayer Mini 依序播放兩首曲目 (各 10 秒)',
      },
      'wifi-controller-mix': {
        title: 'WiFi 控制器整合 (LED + Servo + 溫度)',
        description: '透過 WebSocket 伺服器在 1 個 ESP32 上整合 LED toggle / Servo slider / 溫度顯示，從任何瀏覽器控制',
      },
    },
  },
};

function applyOverride(base: SampleProject, override: SampleOverride | undefined): SampleProject {
  if (!override) return base;
  return {
    ...base,
    title: override.title ?? base.title,
    description: override.description ?? base.description,
  };
}

export function getLocalizedSampleProjects(language: string): SampleProject[] {
  const locale = overrides[language];
  if (!locale?.samples) return baseSamples;
  return baseSamples.map((s) => applyOverride(s, locale.samples![s.id]));
}

type LocalizedCategory = {
  name: string;
  icon: string;
};

export function getLocalizedSampleCategories(language: string): Record<keyof typeof baseCategories, LocalizedCategory> {
  const locale = overrides[language];
  const result = {} as Record<keyof typeof baseCategories, LocalizedCategory>;
  for (const key of Object.keys(baseCategories) as (keyof typeof baseCategories)[]) {
    const cat = baseCategories[key];
    const co = locale?.categories?.[key];
    result[key] = { name: co?.name ?? cat.name, icon: cat.icon };
  }
  return result;
}

export function useLocalizedSampleProjects() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useMemo(() => ({
    samples: getLocalizedSampleProjects(lang),
    categories: getLocalizedSampleCategories(lang),
  }), [lang]);
}
