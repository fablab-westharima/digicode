# Guía de Configuración de Hardware

**Última actualización:** 2026-05-02

Cómo conectar el ESP32 a sensores y actuadores, organizado por componente.

> **Recomendado:** Consulta la [Lista de Hardware Recomendado](./recommended-hardware.md) para dispositivos verificados. Usar piezas probadas ayuda a evitar problemas.

---

## 🚀 Buscar por Componente

| Componente | Categoría | Saltar |
|---|---|---|
| Distancia ultrasónica (HC-SR04) | Sensor (digital) | [→](#sensor-ultrasónico-hc-sr04) |
| Temperatura/humedad (DHT11 / DHT22) | Sensor (1-wire) | [→](#sensor-de-temperaturahumedad-dht11-dht22) |
| Seguimiento de línea (QTR-8) | Sensor (analógico) | [→](#sensor-de-línea-qtr-8-canales) |
| Acelerómetro / giroscopio (MPU6050) | Sensor (I2C) | [→](#acelerómetrogiroscopio-mpu6050) |
| Presión / T+H (BME280 / BMP280) | Sensor (I2C) | [→](#sensor-de-presióntemperaturahumedad-bme280-bmp280) |
| Distancia ToF (VL53L0X) | Sensor (I2C) | [→](#sensor-de-distancia-tof-vl53l0x) |
| Encoder magnético (AS5600) | Sensor (I2C) | [→](#encoder-magnético-as5600) |
| Servo (SG90, etc.) | Actuador | [→](#servomotor-sg90-etc) |
| Motor DC (vía L298N) | Actuador | [→](#motor-dc-vía-driver-de-motor) |
| NeoPixel (WS2812B) | Actuador | [→](#neopixel-led-ws2812b) |
| LCD (16x2 + PCF8574) | Módulo comm. (I2C) | [→](#pantalla-lcd-i2c) |
| TFT (ST7789 / ILI9341) | Módulo comm. (SPI) | [→](#pantalla-tft-spi) |
| RFID (RC522) | Módulo comm. (SPI) | [→](#lector-rfid-rc522) |
| Receptor IR (VS1838B) | Módulo comm. | [→](#módulo-receptor-ir-vs1838b) |
| DFPlayer Mini (MP3) | Módulo comm. (UART) | [→](#dfplayer-mini-mp3) |
| ESP32-CAM / XIAO Sense | Cámara | [→](#conexiones-de-módulo-de-cámara) |
| CAN Bus (SN65HVD230) | Comm. | [→](#conexión-can-bus-twai) |

---

## Referencia Rápida de Pines ESP32

Las placas de desarrollo ESP32 varían, pero los aspectos esenciales comunes:

| Pin | Uso | Nota |
|---|---|---|
| **GPIO 0-39** | E/S digital | — |
| **GPIO 32-39** | Solo entrada analógica (ADC1) | ADC2 entra en conflicto cuando WiFi está en uso |
| **GPIO 0, 2** | LED integrado (depende de placa) | — |
| **GPIO 1, 3** | UART (serial) | Usado para programación, evitar |
| **GPIO 6-11** | Solo memoria Flash | No usar |
| **GPIO 34-39** | Solo entrada | Sin resistencia pull-up |
| **3.3V** | Alimentación de sensores | Máx ~200mA |
| **5V** | USB 5V (algunas placas) | Usa alimentación externa para motores |
| **GND** | Tierra | Tierra común necesaria |

> 💡 **Pines I2C predeterminados**: SDA = GPIO 21, SCL = GPIO 22 (predeterminado ESP32)
> 💡 **Pines SPI predeterminados**: SCK = GPIO 18, MOSI = GPIO 23, MISO = GPIO 19 (SPI por hardware)

---

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

**Nota:** Al conectar sensores de 5V a ESP32 (3.3V), añade un divisor de voltaje al pin Echo.

### Sensor de Temperatura/Humedad (DHT11 / DHT22)

```
DHT11      ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

**Nota:** Conecta una resistencia pull-up de 10kΩ entre el pin DATA y VCC.

### Sensor de Línea QTR (8 canales)

```
QTR-8A     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
1      →   GPIO 36
2      →   GPIO 39
3      →   GPIO 34
4      →   GPIO 35
5      →   GPIO 32
6      →   GPIO 33
7      →   GPIO 25
8      →   GPIO 26
```

### Acelerómetro/Giroscopio (MPU6050)

```
MPU6050    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Dirección 0x68 (AD0=LOW) o 0x69 (AD0=HIGH). Se pueden conectar múltiples unidades en el mismo bus I2C.

### Sensor de Presión/Temperatura/Humedad (BME280 / BMP280)

```
BME280     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Dirección predeterminada 0x76 (SDO=LOW) o 0x77 (SDO=HIGH). BMP280 mide temperatura y presión; BME280 también mide humedad.

### Sensor de Distancia ToF (VL53L0X)

```
VL53L0X    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Dirección 0x29. Con múltiples unidades, usa el pin XSHUT para arrancar individualmente y cambiar dirección.

### Encoder Magnético (AS5600)

```
AS5600     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
DIR    →   GND (sentido horario positivo) o 3.3V (antihorario positivo)
```

**Nota:** Dirección fija 0x36. Coloca el imán centrado sobre el eje; mantén distancia sensor-imán de 0.5–3mm.

---

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

### Motor DC (vía Driver de Motor)

**Ejemplo con Driver L298N:**

```
L298N      ESP32
--------   ------
IN1    →   GPIO 16
IN2    →   GPIO 17
ENA    →   GPIO 25 (PWM)
GND    →   GND
```

**Alimentación:**
- Conecta alimentación externa (7-12V) a VCC del L298N
- Conecta GND del L298N y ESP32 juntos

### NeoPixel LED (WS2812B)

```
NeoPixel   ESP32
--------   ------
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

**Nota:** Se recomienda alimentación externa 5V para muchos LEDs.

---

## Conexiones de Módulos de Comunicación

### Pantalla LCD I2C

Adaptador PCF8574 + LCD 16x2.

```
I2C LCD    ESP32
--------   ------
VCC    →   5V (recomendado) o 3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Configura la dirección I2C con el jumper del adaptador PCF8574 (predeterminado 0x27). Se recomienda 5V (con 3.3V la pantalla puede verse tenue).

### Pantalla TFT (SPI)

ST7789 / ILI9341 etc., SPI por hardware.

```
TFT        ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
CS     →   GPIO 5
DC     →   GPIO 2
RST    →   GPIO 4
SCK    →   GPIO 18 (SPI CLK)
MOSI   →   GPIO 23 (SPI MOSI)
MISO   →   GPIO 19 (SPI MISO, opcional)
BL     →   3.3V o pin de control de retroiluminación
```

**Nota:** Selecciona el CI controlador (ST7789 / ILI9341 / ST7735) en el bloque. Cambia el pin CS si compartes el bus SPI con RFID.

### Lector RFID (RC522)

SPI por hardware.

```
RC522      ESP32
--------   ------
3.3V   →   3.3V
GND    →   GND
CS     →   GPIO 5
SCK    →   GPIO 18 (SPI CLK)
MOSI   →   GPIO 23 (SPI MOSI)
MISO   →   GPIO 19 (SPI MISO)
RST    →   GPIO 22
IRQ    →   Sin conexión (no necesario en modo polling)
```

**Nota:** RC522 solo acepta 3.3V (no conectar 5V). Cambia el pin CS si compartes el bus SPI con TFT. Consulta la [Lista de Hardware Recomendado](./recommended-hardware.md) para notas sobre regulaciones de radio.

### Módulo Receptor IR (VS1838B)

```
VS1838B    ESP32
--------   ------
VCC    →   3.3V o 5V
GND    →   GND
OUT    →   GPIO 14
```

**Nota:** El pin OUT tiene pull-up integrado en el módulo. Usa la librería IRremoteESP8266 (también funciona en ESP32).

### DFPlayer Mini (MP3)

Conexión UART.

```
DFPlayer   ESP32
--------   ------
VCC    →   5V
GND    →   GND
RX     →   GPIO 12 (con resistencia de 1kΩ en serie)
TX     →   GPIO 14
SPK+   →   Altavoz (+)
SPK−   →   Altavoz (−)
```

**Nota:** Siempre añade resistencia de 1kΩ en serie al pin RX del DFPlayer. Usa SoftwareSerial (ESP32 RX=14, TX=12). Coloca archivos MP3 en microSD como `/01/001.mp3`.

---

## Conexiones de Módulo de Cámara

Los módulos de cámara ESP32 tienen configuraciones de pines integradas. Solo selecciona el tipo de placa en el bloque — no se necesita configuración manual de pines.

### ESP32-CAM (AI-Thinker)

El conector de cámara está integrado en la placa. Conecta el módulo de cámara OV2640 por separado.

**Notas de programación:**
- Conecta IO0 a GND con un jumper antes de grabar con el adaptador USB-UART
- Retira el jumper y reinicia después de grabar
- ESP32-CAM no tiene puerto USB — se necesita adaptador USB-UART (3.3V)

**Alimentación:** 5V (vía USB) o 5V externo. No se recomienda alimentación directa por el pin 3.3V (la demanda de corriente de la cámara puede causar inestabilidad).

### XIAO ESP32S3 Sense

La cámara (OV2640) y el micrófono están integrados en la placa. Conecta la cámara con el cable flexible dedicado. No se necesita cableado externo adicional.

---

## Conexión CAN Bus (TWAI)

Usa el controlador TWAI integrado del ESP32. Se requiere un CI transceptor CAN externo (p. ej. SN65HVD230).

```
SN65HVD230  ESP32
----------  ------
VCC     →   3.3V
GND     →   GND
D (TXD) →   GPIO 5 (TX)
R (RXD) →   GPIO 4 (RX)
CANH    →   Línea CANH del bus CAN
CANL    →   Línea CANL del bus CAN
```

**Nota:** Conecta resistencias de terminación de 120Ω en ambos extremos del bus CAN. SN65HVD230 opera a 3.3V. Consulta la [Lista de Hardware Recomendado](./recommended-hardware.md) para notas regulatorias.

---

## Detalles y Operaciones

### Mejores Prácticas de Cableado

#### 1. Gestión de Alimentación

- Usa 3.3V para sensores, alimentación externa para motores
- Siempre conecta GNDs juntos
- Verifica capacidad de corriente (pin 3.3V del ESP32 máx ~200mA)

#### 2. Prevención de Ruido

- Mantén distancia entre motores y ESP32
- Añade capacitor a alimentación del motor
- Mantén cables lo más cortos posible

#### 3. Seguridad

- Verifica cableado antes de encender para prevenir cortocircuitos
- Usa fusibles y circuitos de protección apropiados contra sobrecorriente
- Ten especial cuidado con alto voltaje (12V+)

### Solución de Problemas

#### Sensor No Funciona

1. Re-verifica cableado (VCC, GND, Señal)
2. Verifica nivel de voltaje (3.3V / 5V)
3. Verifica si se necesita resistencia pull-up / pull-down

#### Motor No Funciona

1. Verifica que alimentación externa esté conectada
2. Verifica conexión GND
3. Verifica cableado del driver del motor

Para más, consulta [Solución de Problemas](./troubleshooting.md).

---

## Referencias

- [Lista de Hardware Recomendado](./recommended-hardware.md) — Lista de dispositivos verificados
- [Primeros Pasos](./getting-started.md) — Desde USB hasta LED parpadeante
- [Guía ESP32](./04-program-setup-esp32.md) — Detalles de métodos de carga
- [Solución de Problemas](./troubleshooting.md) — Guía de resolución de problemas
- [Documentación Oficial ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
