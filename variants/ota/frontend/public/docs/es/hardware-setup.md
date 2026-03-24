# Guía de Configuración de Hardware

Cómo conectar sensores y actuadores al ESP32.

## Distribución de Pines del ESP32

### GPIO (E/S de Propósito General)
- **GPIO 0-39**: Entrada/salida digital
- **GPIO 32-39**: Solo entrada analógica (ADC1)
- **GPIO 0, 2**: LED integrado (varía según placa)

### Pines Especiales
- **GPIO 1, 3**: UART (serial) - evitar (usado para programación)
- **GPIO 6-11**: Solo memoria Flash - no usar
- **GPIO 34-39**: Solo entrada (sin resistencia pull-up)

### Alimentación
- **3.3V**: Alimentación para sensores y motores
- **5V**: 5V vía USB (solo algunas placas)
- **GND**: Tierra (tierra común)

## Conexiones de Sensores

### Sensor Ultrasónico (HC-SR04)

```
HC-SR04    ESP32
--------   ------
VCC    →   3.3V o 5V
GND    →   GND
Trig   →   GPIO 5
Echo   →   GPIO 18
```

**Nota:** Al conectar sensores de 5V a ESP32 (3.3V), añade divisor de voltaje al pin Echo

### Sensor de Temperatura/Humedad (DHT11/DHT22)

```
DHT11      ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

## Conexiones de Actuadores

### Servomotor (SG90, etc.)

```
Servo      ESP32
--------   ------
VCC    →   5V (alimentación externa recomendada)
GND    →   GND
Signal →   GPIO 13
```

**Notas:**
- Usa alimentación externa 5V cuando uses múltiples servos
- Conecta GND del ESP32 y alimentación externa juntos

### NeoPixel LED (WS2812B)

```
NeoPixel   ESP32
--------   ------
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

## Mejores Prácticas de Cableado

### 1. Gestión de Alimentación
- Usa 3.3V para sensores, alimentación externa para motores
- Siempre conecta GNDs juntos
- Verifica capacidad de corriente (pin 3.3V del ESP32 máx ~200mA)

### 2. Prevención de Ruido
- Mantén distancia entre motores y ESP32
- Añade capacitor a alimentación del motor
- Mantén cables lo más cortos posible

## Solución de Problemas

### Sensor No Funciona
1. Re-verifica cableado (VCC, GND, Señal)
2. Verifica nivel de voltaje (3.3V/5V)
3. Verifica si se necesita resistencia pull-up/pull-down

### Motor No Funciona
1. Verifica que alimentación externa esté conectada
2. Verifica conexión GND
3. Verifica cableado del driver del motor

## Referencias

- [Lista de Hardware Recomendado](./recommended-hardware.md)
- [Documentación Oficial ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
