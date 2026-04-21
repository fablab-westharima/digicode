/**
 * Tutorial translations for non-Japanese languages.
 *
 * Structure:
 * - `tutorials.ts` is the canonical source and contains Japanese text as the
 *   fallback. When adding a new tutorial, only `tutorials.ts` is required.
 * - This file provides overrides per-language keyed by tutorial id and step id.
 *   Languages or ids that are missing fall back to the Japanese text in
 *   `tutorials.ts`.
 * - `useLocalizedTutorials()` in this file merges the two at render time.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { tutorials as baseTutorials, tutorialCategories as baseCategories } from './tutorials';
import type { Tutorial } from '@/stores/tutorialStore';

type StepOverride = Partial<Pick<Tutorial['steps'][number], 'title' | 'content'>>;
interface TutorialOverride {
  title?: string;
  description?: string;
  steps?: Record<string, StepOverride>;
}
interface CategoryOverride {
  name?: string;
  description?: string;
}
interface LocaleOverride {
  categories?: Partial<Record<keyof typeof baseCategories, CategoryOverride>>;
  tutorials?: Record<string, TutorialOverride>;
}

const overrides: Record<string, LocaleOverride> = {
  en: {
    categories: {
      basic: { name: 'Basics', description: 'Programming fundamentals' },
      robots: { name: 'Robots', description: 'Move your robot' },
      competition: { name: 'Competition Robots', description: 'Line tracing etc.' },
    },
    tutorials: {
      'led-blink': {
        title: 'Your First LED Blink',
        description: 'Program to blink an LED',
        steps: {
          'led-1': {
            title: 'LED Blink Program',
            content: 'Blink the LED on GPIO2 every second. Press the "Write" button to run it!',
          },
        },
      },
      'sensor-basic': {
        title: 'Ultrasonic Sensor',
        description: 'Measure distance and print to serial',
        steps: {
          'sensor-1': {
            title: 'Distance Measurement',
            content: 'Measure distance with the HC-SR04 sensor and show it on the serial monitor.',
          },
        },
      },
      'motor-basic': {
        title: 'Servo Motor',
        description: 'Sweep a servo between 0° and 180°',
        steps: {
          'motor-1': {
            title: 'Servo Control',
            content: 'Move the servo between 0° and 180° every second.',
          },
        },
      },
      'humanoid-basic': {
        title: 'Humanoid First Steps',
        description: 'Make the humanoid robot walk',
        steps: {
          'humanoid-1': {
            title: 'Humanoid Walking',
            content: 'The humanoid takes two steps forward and turns left twice. Adjust the pin numbers to match your hardware.',
          },
        },
      },
      'humanoid-gesture': {
        title: 'Humanoid Emotions',
        description: 'Express emotions with gestures',
        steps: {
          'gesture-1': {
            title: 'Gestures',
            content: 'The humanoid performs "Happy" → "Sad" → "Victory" gestures in sequence.',
          },
        },
      },
      'humanoid-dance': {
        title: 'Humanoid Dance',
        description: 'Various dance moves',
        steps: {
          'dance-1': {
            title: 'Dance Performance',
            content: 'Run Swing → Dance → Moonwalker → Crusaito → Jitter → UpDown in sequence.',
          },
        },
      },
      'humanoid-touch': {
        title: 'Touch Control',
        description: 'Move the humanoid with a touch sensor',
        steps: {
          'touch-1': {
            title: 'Touch Control',
            content: 'Touching GPIO4 makes the humanoid happy and take two steps forward.',
          },
        },
      },
      'humanoid-sound-react': {
        title: 'Sound Reaction',
        description: 'Humanoid reacts to claps and voice',
        steps: {
          'sound-1': {
            title: 'Sound Reaction',
            content: 'When a clap or loud sound is detected, the humanoid becomes super happy and dances. Adjust the threshold for your environment.',
          },
        },
      },
      'humanoid-obstacle': {
        title: 'Obstacle Avoidance',
        description: 'Avoid obstacles with the ultrasonic sensor',
        steps: {
          'obstacle-1': {
            title: 'Obstacle Avoidance',
            content: 'If an obstacle is within 20cm the humanoid gets confused and turns left; otherwise it moves forward.',
          },
        },
      },
      'line-trace-basic': {
        title: 'Line Tracing Basics',
        description: 'Trace a line with PID control',
        steps: {
          'line-1': {
            title: 'Line Tracing',
            content: 'Detect the line with the QTR-8A sensor and control differential-drive motors with PID. After calibration, it drives along the line.',
          },
        },
      },
      'micromouse-basic': {
        title: 'Micromouse Basics',
        description: 'Explore a maze with the left-hand rule',
        steps: {
          'micro-1': {
            title: 'Micromouse',
            content: 'Left-hand rule: turn left if no wall on the left, turn right if a wall is ahead, otherwise go straight. Encoders provide accurate movement.',
          },
        },
      },
    },
  },
  es: {
    categories: {
      basic: { name: 'Básicos', description: 'Fundamentos de programación' },
      robots: { name: 'Robots', description: 'Mueve tu robot' },
      competition: { name: 'Robots de competición', description: 'Seguimiento de línea, etc.' },
    },
    tutorials: {
      'led-blink': {
        title: 'Tu primer parpadeo de LED',
        description: 'Programa para parpadear un LED',
        steps: {
          'led-1': {
            title: 'Programa de parpadeo',
            content: 'Haz parpadear el LED de GPIO2 cada segundo. ¡Pulsa el botón "Escribir" para ejecutarlo!',
          },
        },
      },
      'sensor-basic': {
        title: 'Sensor de ultrasonidos',
        description: 'Mide la distancia y muéstrala por serie',
        steps: {
          'sensor-1': {
            title: 'Medición de distancia',
            content: 'Mide la distancia con el sensor HC-SR04 y muéstrala en el monitor serie.',
          },
        },
      },
      'motor-basic': {
        title: 'Servomotor',
        description: 'Barrido de 0° a 180°',
        steps: {
          'motor-1': {
            title: 'Control del servo',
            content: 'Mueve el servo entre 0° y 180° cada segundo.',
          },
        },
      },
      'humanoid-basic': {
        title: 'Primeros pasos con Humanoid',
        description: 'Haz caminar al robot humanoide',
        steps: {
          'humanoid-1': {
            title: 'Caminata Humanoid',
            content: 'El robot da dos pasos adelante y gira dos veces a la izquierda. Ajusta los pines a tu hardware.',
          },
        },
      },
      'humanoid-gesture': {
        title: 'Emociones del Humanoid',
        description: 'Expresa emociones con gestos',
        steps: {
          'gesture-1': {
            title: 'Gestos',
            content: 'El robot realiza "Feliz" → "Triste" → "Victoria" en secuencia.',
          },
        },
      },
      'humanoid-dance': {
        title: 'Humanoid baila',
        description: 'Varios movimientos de baile',
        steps: {
          'dance-1': {
            title: 'Coreografía',
            content: 'Ejecuta Swing → Dance → Moonwalker → Crusaito → Jitter → UpDown en secuencia.',
          },
        },
      },
      'humanoid-touch': {
        title: 'Control por tacto',
        description: 'Mueve al Humanoid con un sensor táctil',
        steps: {
          'touch-1': {
            title: 'Control por tacto',
            content: 'Al tocar GPIO4 el robot se pone feliz y da dos pasos adelante.',
          },
        },
      },
      'humanoid-sound-react': {
        title: 'Reacción al sonido',
        description: 'El Humanoid reacciona a aplausos y voz',
        steps: {
          'sound-1': {
            title: 'Reacción al sonido',
            content: 'Al detectar un aplauso o ruido fuerte, el robot se pone muy feliz y baila. Ajusta el umbral según tu entorno.',
          },
        },
      },
      'humanoid-obstacle': {
        title: 'Evitar obstáculos',
        description: 'Evita obstáculos con el sensor de ultrasonidos',
        steps: {
          'obstacle-1': {
            title: 'Evitar obstáculos',
            content: 'Si hay un obstáculo a menos de 20 cm el robot se confunde y gira a la izquierda; si no, avanza.',
          },
        },
      },
      'line-trace-basic': {
        title: 'Seguimiento de línea básico',
        description: 'Sigue una línea con control PID',
        steps: {
          'line-1': {
            title: 'Seguimiento de línea',
            content: 'Detecta la línea con el sensor QTR-8A y controla motores diferenciales con PID. Tras calibrar, circula siguiendo la línea.',
          },
        },
      },
      'micromouse-basic': {
        title: 'Micromouse básico',
        description: 'Explora un laberinto con la regla de la mano izquierda',
        steps: {
          'micro-1': {
            title: 'Micromouse',
            content: 'Regla de la mano izquierda: gira a la izquierda si no hay muro a la izquierda, a la derecha si hay muro enfrente; en otro caso, sigue recto. Los encoders aportan movimiento preciso.',
          },
        },
      },
    },
  },
  'pt-PT': {
    categories: {
      basic: { name: 'Básico', description: 'Fundamentos de programação' },
      robots: { name: 'Robôs', description: 'Mover o robot' },
      competition: { name: 'Robôs de competição', description: 'Seguimento de linha, etc.' },
    },
    tutorials: {
      'led-blink': {
        title: 'O seu primeiro LED a piscar',
        description: 'Programa para piscar um LED',
        steps: {
          'led-1': {
            title: 'Programa de LED a piscar',
            content: 'Pisca o LED no GPIO2 a cada segundo. Carregue no botão "Escrever" para o executar!',
          },
        },
      },
      'sensor-basic': {
        title: 'Sensor de ultrassons',
        description: 'Mede a distância e mostra na série',
        steps: {
          'sensor-1': {
            title: 'Medição da distância',
            content: 'Meça a distância com o sensor HC-SR04 e mostre-a no monitor série.',
          },
        },
      },
      'motor-basic': {
        title: 'Servomotor',
        description: 'Varrimento do servo entre 0° e 180°',
        steps: {
          'motor-1': {
            title: 'Controlo do servo',
            content: 'Mover o servo entre 0° e 180° a cada segundo.',
          },
        },
      },
      'humanoid-basic': {
        title: 'Primeiros passos com Humanoid',
        description: 'Fazer o robot humanoide andar',
        steps: {
          'humanoid-1': {
            title: 'Andamento do Humanoid',
            content: 'O robot dá dois passos em frente e gira duas vezes para a esquerda. Ajuste os pinos ao seu hardware.',
          },
        },
      },
      'humanoid-gesture': {
        title: 'Emoções do Humanoid',
        description: 'Expressar emoções com gestos',
        steps: {
          'gesture-1': {
            title: 'Gestos',
            content: 'O robot realiza "Feliz" → "Triste" → "Vitória" em sequência.',
          },
        },
      },
      'humanoid-dance': {
        title: 'Humanoid a dançar',
        description: 'Vários movimentos de dança',
        steps: {
          'dance-1': {
            title: 'Coreografia',
            content: 'Executa Swing → Dance → Moonwalker → Crusaito → Jitter → UpDown em sequência.',
          },
        },
      },
      'humanoid-touch': {
        title: 'Controlo por toque',
        description: 'Mover o Humanoid com um sensor de toque',
        steps: {
          'touch-1': {
            title: 'Controlo por toque',
            content: 'Ao tocar em GPIO4, o robot fica feliz e dá dois passos em frente.',
          },
        },
      },
      'humanoid-sound-react': {
        title: 'Reação ao som',
        description: 'O Humanoid reage a palmas e voz',
        steps: {
          'sound-1': {
            title: 'Reação ao som',
            content: 'Ao detetar uma palma ou som alto, o robot fica muito feliz e dança. Ajuste o limiar ao seu ambiente.',
          },
        },
      },
      'humanoid-obstacle': {
        title: 'Evitar obstáculos',
        description: 'Evitar obstáculos com o sensor de ultrassons',
        steps: {
          'obstacle-1': {
            title: 'Evitar obstáculos',
            content: 'Se houver um obstáculo a menos de 20 cm, o robot fica confuso e vira à esquerda; caso contrário, avança.',
          },
        },
      },
      'line-trace-basic': {
        title: 'Seguimento de linha básico',
        description: 'Seguir uma linha com controlo PID',
        steps: {
          'line-1': {
            title: 'Seguimento de linha',
            content: 'Detetar a linha com o sensor QTR-8A e controlar motores diferenciais com PID. Após calibração, segue ao longo da linha.',
          },
        },
      },
      'micromouse-basic': {
        title: 'Micromouse básico',
        description: 'Explorar um labirinto com a regra da mão esquerda',
        steps: {
          'micro-1': {
            title: 'Micromouse',
            content: 'Regra da mão esquerda: vira à esquerda se não houver parede à esquerda, à direita se houver parede à frente; caso contrário, segue em frente. Os encoders garantem movimento preciso.',
          },
        },
      },
    },
  },
  'zh-TW': {
    categories: {
      basic: { name: '基礎', description: '程式設計基礎' },
      robots: { name: '機器人', description: '讓機器人動起來' },
      competition: { name: '競賽機器人', description: '循線等' },
    },
    tutorials: {
      'led-blink': {
        title: '第一個 LED 閃爍',
        description: '讓 LED 閃爍的程式',
        steps: {
          'led-1': {
            title: 'LED 閃爍程式',
            content: '讓 GPIO2 的 LED 每秒閃爍一次。請按「寫入」按鈕執行！',
          },
        },
      },
      'sensor-basic': {
        title: '超音波感測器',
        description: '測量距離並輸出到序列',
        steps: {
          'sensor-1': {
            title: '距離測量',
            content: '使用 HC-SR04 感測器測量距離並顯示在序列監視器上。',
          },
        },
      },
      'motor-basic': {
        title: '伺服馬達',
        description: '伺服在 0° 與 180° 之間往返',
        steps: {
          'motor-1': {
            title: '伺服控制',
            content: '讓伺服馬達每秒在 0° 與 180° 之間擺動。',
          },
        },
      },
      'humanoid-basic': {
        title: 'Humanoid 首次啟動',
        description: '讓 Humanoid 機器人行走',
        steps: {
          'humanoid-1': {
            title: 'Humanoid 行走',
            content: 'Humanoid 向前走兩步並向左旋轉兩次。請依實際硬體調整接腳。',
          },
        },
      },
      'humanoid-gesture': {
        title: 'Humanoid 情感表達',
        description: '以動作表達情感',
        steps: {
          'gesture-1': {
            title: '動作',
            content: 'Humanoid 依序表現「快樂」→「悲傷」→「勝利」。',
          },
        },
      },
      'humanoid-dance': {
        title: 'Humanoid 舞蹈',
        description: '多種舞蹈動作',
        steps: {
          'dance-1': {
            title: '舞蹈表演',
            content: '依序執行 Swing → Dance → Moonwalker → Crusaito → Jitter → UpDown。',
          },
        },
      },
      'humanoid-touch': {
        title: '觸控操作',
        description: '用觸控感測器讓 Humanoid 動',
        steps: {
          'touch-1': {
            title: '觸控操作',
            content: '觸碰 GPIO4 時 Humanoid 會高興並前進兩步。',
          },
        },
      },
      'humanoid-sound-react': {
        title: '聲音反應',
        description: 'Humanoid 會對拍手或聲音做出反應',
        steps: {
          'sound-1': {
            title: '聲音反應',
            content: '偵測到拍手或大聲響時,Humanoid 會超開心並跳舞。請依環境調整閾值。',
          },
        },
      },
      'humanoid-obstacle': {
        title: '避障',
        description: '以超音波感測器避開障礙',
        steps: {
          'obstacle-1': {
            title: '避障',
            content: '若 20cm 內有障礙物 Humanoid 會困惑並向左旋轉,否則前進。',
          },
        },
      },
      'line-trace-basic': {
        title: '循線基礎',
        description: '用 PID 控制循線',
        steps: {
          'line-1': {
            title: '循線',
            content: '使用 QTR-8A 感測器偵測線條並以 PID 控制差速馬達。校正後沿著線行走。',
          },
        },
      },
      'micromouse-basic': {
        title: 'Micromouse 基礎',
        description: '以左手法探索迷宮',
        steps: {
          'micro-1': {
            title: 'Micromouse',
            content: '左手法演算法:左邊無牆則左轉,前方有牆則右轉,否則直行。編碼器提供精準移動。',
          },
        },
      },
    },
  },
};

function applyOverride(base: Tutorial, override: TutorialOverride | undefined): Tutorial {
  if (!override) return base;
  return {
    ...base,
    title: override.title ?? base.title,
    description: override.description ?? base.description,
    steps: base.steps.map((step) => {
      const so = override.steps?.[step.id];
      if (!so) return step;
      return { ...step, title: so.title ?? step.title, content: so.content ?? step.content };
    }),
  };
}

export function getLocalizedTutorials(language: string): Tutorial[] {
  const locale = overrides[language];
  if (!locale?.tutorials) return baseTutorials;
  return baseTutorials.map((t) => applyOverride(t, locale.tutorials![t.id]));
}

export function getLocalizedTutorialById(id: string, language: string): Tutorial | undefined {
  const base = baseTutorials.find((t) => t.id === id);
  if (!base) return undefined;
  return applyOverride(base, overrides[language]?.tutorials?.[id]);
}

type LocalizedCategory = {
  name: string;
  description: string;
  tutorials: Tutorial[];
};

export function getLocalizedCategories(language: string): Record<keyof typeof baseCategories, LocalizedCategory> {
  const locale = overrides[language];
  const localizedList = getLocalizedTutorials(language);
  const result = {} as Record<keyof typeof baseCategories, LocalizedCategory>;
  for (const key of Object.keys(baseCategories) as (keyof typeof baseCategories)[]) {
    const cat = baseCategories[key];
    const co = locale?.categories?.[key];
    result[key] = {
      name: co?.name ?? cat.name,
      description: co?.description ?? cat.description,
      tutorials: localizedList.filter((t) => t.category === key),
    };
  }
  return result;
}

export function useLocalizedTutorials() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useMemo(() => ({
    tutorials: getLocalizedTutorials(lang),
    categories: getLocalizedCategories(lang),
    getById: (id: string) => getLocalizedTutorialById(id, lang),
  }), [lang]);
}
