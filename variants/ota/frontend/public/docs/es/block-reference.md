# Referencia de Bloques

Lista completa de todos los bloques disponibles en DigiCode.

## Tabla de Contenidos

1. [Bloques Básicos](#bloques-básicos)
2. [Datos (Arrays)](#datos-arrays)
3. [Sensores](#sensores)
4. [Actuadores](#actuadores)
5. [Pantalla (OLED)](#pantalla-oled)
6. [NeoPixel (LED)](#neopixel-led)
7. [Audio](#audio)
8. [Robot OTTO](#robot-otto)

---

## Bloques Básicos

### Estructura del Programa

| Nombre del Bloque | Descripción | Notas |
|-------------------|-------------|-------|
| **Setup** | Ejecutado una vez al inicio | Coloca código de inicialización |
| **Loop** | Procesamiento principal repetido | Coloca lógica de sensores y control |

### E/S Digital

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Configurar Modo Pin** | Configura modo entrada/salida | Número de pin, Modo |
| **Escritura Digital** | Salida HIGH/LOW al pin | Número de pin, Valor |
| **Lectura Digital** | Lee estado del pin | Número de pin → true/false |
| **LED Interno ON** | Enciende LED integrado (GPIO2) | - |
| **LED Interno OFF** | Apaga LED integrado (GPIO2) | - |

### E/S Analógica

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Lectura Analógica** | Lee valor analógico (0-4095) | Número de pin |
| **Salida PWM** | Salida de señal PWM | Número de pin, Valor (0-255) |

### Tiempo

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Esperar** | Espera tiempo especificado | Tiempo (milisegundos) |
| **Tiempo Transcurrido** | Obtiene tiempo desde inicio | → milisegundos |

---

## Sensores

### Sensor Ultrasónico (HC-SR04)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar HC-SR04** | Inicializa sensor ultrasónico | Pin Trig, Pin Echo |
| **Distancia Ultrasónica (cm)** | Mide distancia | → Valor en cm |

### Sensor de Temperatura/Humedad (DHT11/DHT22)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar DHT** | Inicializa sensor DHT | Tipo, Pin |
| **Temperatura DHT (°C)** | Obtiene temperatura | → Celsius |
| **Humedad DHT (%)** | Obtiene humedad | → Porcentaje |

---

## Actuadores

### Servomotor

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Conectar Servo** | Conecta servo al pin | Número de pin |
| **Ángulo Servo** | Rota servo al ángulo | Pin, Ángulo (0-180°) |
| **Desconectar Servo** | Desconecta servo | Pin |

### Motor DC (L298N)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Motor** | Inicializa driver L298N | Motor (A/B), Pines |
| **Acción Motor** | Controla motor | Motor, Dirección, Velocidad |
| **Detener Motor** | Detiene motor | Motor |

---

## Pantalla (OLED)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar OLED** | Inicializa OLED I2C | Ancho, Alto, Pines SDA/SCL |
| **Mostrar OLED** | Muestra texto | Texto, X, Y, Tamaño |
| **Limpiar OLED** | Limpia pantalla | - |

---

## NeoPixel (LED)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar NeoPixel** | Inicializa tira LED | Pin, Cantidad de LEDs |
| **Color LED** | Configura color de LED individual | Índice, R/G/B |
| **Color Todos LEDs** | Configura todos al mismo color | R/G/B |
| **Mostrar NeoPixel** | Aplica colores | - |

---

## Robot OTTO

### OTTO Bípedo

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar OTTO** | Inicializa OTTO | Pines de piernas/tobillos |
| **Posición Inicial OTTO** | Vuelve a postura de pie | - |
| **OTTO Caminar** | Camina adelante/atrás | Pasos, Dirección, Velocidad |
| **OTTO Girar** | Rota izquierda/derecha | Cuenta, Dirección, Velocidad |

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md)
- [Configuración de Hardware](./hardware-setup.md)
- [Solución de Problemas](./troubleshooting.md)
