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
      competition: { name: 'Competition' },
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
      'line-trace-basic': {
        title: 'Line Tracing Basics',
        description: 'Follow a black line with QTR sensor and PID control',
      },
      'micromouse-basic': {
        title: 'Micromouse Basics',
        description: 'Explore a maze using wall sensors and encoders',
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
      'ha-servo-control': {
        title: 'HA Servo Control',
        description: 'Control servo angle with a number slider in Home Assistant',
      },
      'ha-multi-sensor': {
        title: 'HA Multi-Sensor Node',
        description: 'Combined temperature/humidity/motion sensor node',
      },
    },
  },
  es: {
    categories: {
      basic: { name: 'Básicos' },
      sensor: { name: 'Sensores' },
      motor: { name: 'Motores / LEDs' },
      robots: { name: 'Robots' },
      competition: { name: 'Competición' },
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
      'line-trace-basic': {
        title: 'Seguimiento de línea básico',
        description: 'Sigue una línea negra con sensor QTR y control PID',
      },
      'micromouse-basic': {
        title: 'Micromouse básico',
        description: 'Explora un laberinto con sensores de pared y encoders',
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
      'ha-servo-control': {
        title: 'HA control de servo',
        description: 'Controla el ángulo del servo con un deslizador numérico',
      },
      'ha-multi-sensor': {
        title: 'HA nodo multi-sensor',
        description: 'Nodo sensor combinado de temperatura/humedad/movimiento',
      },
    },
  },
  'pt-PT': {
    categories: {
      basic: { name: 'Básico' },
      sensor: { name: 'Sensores' },
      motor: { name: 'Motores / LEDs' },
      robots: { name: 'Robôs' },
      competition: { name: 'Competição' },
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
      'line-trace-basic': {
        title: 'Seguimento de linha básico',
        description: 'Segue uma linha preta com sensor QTR e controlo PID',
      },
      'micromouse-basic': {
        title: 'Micromouse básico',
        description: 'Explora um labirinto com sensores de parede e encoders',
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
      'ha-servo-control': {
        title: 'HA controlo de servo',
        description: 'Controla o ângulo do servo com um slider numérico',
      },
      'ha-multi-sensor': {
        title: 'HA nó multi-sensor',
        description: 'Nó combinado de temperatura/humidade/movimento',
      },
    },
  },
  'zh-TW': {
    categories: {
      basic: { name: '基礎' },
      sensor: { name: '感測器' },
      motor: { name: '馬達 / LED' },
      robots: { name: '機器人' },
      competition: { name: '競賽' },
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
      'line-trace-basic': {
        title: '循線基礎',
        description: '用 QTR 感測器與 PID 控制追蹤黑線',
      },
      'micromouse-basic': {
        title: 'Micromouse 基礎',
        description: '以牆面感測器和編碼器進行迷宮探索',
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
      'ha-servo-control': {
        title: 'HA 伺服控制',
        description: '從 Home Assistant 用數值滑桿控制伺服角度',
      },
      'ha-multi-sensor': {
        title: 'HA 複合感測節點',
        description: '溫度/濕度/動作的複合感測節點',
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
