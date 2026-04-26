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
      'ble-beacon-scanner': {
        title: 'BLE Beacon Scanner',
        description: 'Scan nearby BLE devices and log to serial',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT Custom',
        description: 'Periodically notify a custom GATT characteristic',
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
      'ble-beacon-scanner': {
        title: 'Escáner de beacons BLE',
        description: 'Escanea dispositivos BLE cercanos y muestra por serie',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT personalizado',
        description: 'Notifica periódicamente una característica GATT personalizada',
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
      'ble-beacon-scanner': {
        title: 'Scanner de beacons BLE',
        description: 'Faz scan de dispositivos BLE próximos e imprime na série',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT personalizado',
        description: 'Notifica periodicamente uma característica GATT personalizada',
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
      'ble-beacon-scanner': {
        title: 'BLE 信標掃描',
        description: '掃描附近的 BLE 裝置並輸出到序列',
      },
      'ble-gatt-custom': {
        title: 'BLE GATT 自訂',
        description: '定期通知自訂 GATT 特徵',
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
