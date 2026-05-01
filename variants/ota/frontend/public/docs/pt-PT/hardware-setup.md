# Guia de Configuração de Hardware

**Última atualização:** 2026-05-02

Como conectar o ESP32 a sensores e atuadores, organizado por componente.

> **Recomendado:** Consulta a [Lista de Hardware Recomendado](./recommended-hardware.md) para dispositivos verificados. Usar peças testadas ajuda a evitar problemas.

---

## 🚀 Procurar por Componente

| Componente | Categoria | Saltar |
|---|---|---|
| Distância ultrassónica (HC-SR04) | Sensor (digital) | [→](#sensor-ultrassónico-hc-sr04) |
| Temperatura/humidade (DHT11 / DHT22) | Sensor (1-wire) | [→](#sensor-de-temperaturahumidade-dht11-dht22) |
| Seguimento de linha (QTR-8) | Sensor (analógico) | [→](#sensor-de-linha-qtr-8-canais) |
| Acelerómetro / giroscópio (MPU6050) | Sensor (I2C) | [→](#acelerómetrogiroscópio-mpu6050) |
| Pressão / T+H (BME280 / BMP280) | Sensor (I2C) | [→](#sensor-de-pressãotemperaturahumidade-bme280-bmp280) |
| Distância ToF (VL53L0X) | Sensor (I2C) | [→](#sensor-de-distância-tof-vl53l0x) |
| Encoder magnético (AS5600) | Sensor (I2C) | [→](#encoder-magnético-as5600) |
| Servo (SG90, etc.) | Atuador | [→](#servomotor-sg90-etc) |
| Motor DC (via L298N) | Atuador | [→](#motor-dc-via-driver-de-motor) |
| NeoPixel (WS2812B) | Atuador | [→](#neopixel-led-ws2812b) |
| LCD (16x2 + PCF8574) | Módulo comm. (I2C) | [→](#ecrã-lcd-i2c) |
| TFT (ST7789 / ILI9341) | Módulo comm. (SPI) | [→](#ecrã-tft-spi) |
| RFID (RC522) | Módulo comm. (SPI) | [→](#leitor-rfid-rc522) |
| Recetor IR (VS1838B) | Módulo comm. | [→](#módulo-recetor-ir-vs1838b) |
| DFPlayer Mini (MP3) | Módulo comm. (UART) | [→](#dfplayer-mini-mp3) |
| ESP32-CAM / XIAO Sense | Câmara | [→](#ligações-de-módulo-de-câmara) |
| CAN Bus (SN65HVD230) | Comm. | [→](#ligação-can-bus-twai) |

---

## Referência Rápida de Pinos ESP32

As placas de desenvolvimento ESP32 variam, mas os aspetos essenciais comuns:

| Pino | Uso | Nota |
|---|---|---|
| **GPIO 0-39** | E/S digital | — |
| **GPIO 32-39** | Apenas entrada analógica (ADC1) | ADC2 entra em conflito quando WiFi está em uso |
| **GPIO 0, 2** | LED integrado (depende da placa) | — |
| **GPIO 1, 3** | UART (série) | Usado para programação, evitar |
| **GPIO 6-11** | Apenas memória Flash | Não usar |
| **GPIO 34-39** | Apenas entrada | Sem resistência pull-up |
| **3.3V** | Alimentação de sensores | Máx ~200mA |
| **5V** | USB 5V (algumas placas) | Usa alimentação externa para motores |
| **GND** | Terra | Terra comum necessária |

> 💡 **Pinos I2C padrão**: SDA = GPIO 21, SCL = GPIO 22 (padrão ESP32)
> 💡 **Pinos SPI padrão**: SCK = GPIO 18, MOSI = GPIO 23, MISO = GPIO 19 (SPI por hardware)

---

## Ligações de Sensores

### Sensor Ultrassónico (HC-SR04)

```
HC-SR04    ESP32
--------   ------
VCC    →   3.3V ou 5V
GND    →   GND
Trig   →   GPIO 5
Echo   →   GPIO 18
```

**Nota:** Ao ligar sensores de 5V ao ESP32 (3.3V), adiciona divisor de tensão ao pino Echo.

### Sensor de Temperatura/Humidade (DHT11 / DHT22)

```
DHT11      ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

**Nota:** Liga resistência pull-up de 10kΩ entre o pino DATA e VCC.

### Sensor de Linha QTR (8 canais)

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

### Acelerómetro/Giroscópio (MPU6050)

```
MPU6050    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Endereço 0x68 (AD0=LOW) ou 0x69 (AD0=HIGH). Podem ser ligados vários dispositivos no mesmo barramento I2C.

### Sensor de Pressão/Temperatura/Humidade (BME280 / BMP280)

```
BME280     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Endereço padrão 0x76 (SDO=LOW) ou 0x77 (SDO=HIGH). BMP280 mede temperatura e pressão; BME280 também mede humidade.

### Sensor de Distância ToF (VL53L0X)

```
VL53L0X    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Endereço 0x29. Com múltiplas unidades, usa o pino XSHUT para arrancar individualmente e alterar o endereço.

### Encoder Magnético (AS5600)

```
AS5600     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
DIR    →   GND (sentido horário positivo) ou 3.3V (anti-horário positivo)
```

**Nota:** Endereço fixo 0x36. Coloca o íman centrado sobre o eixo; mantém distância sensor-íman de 0.5–3mm.

---

## Ligações de Atuadores

### Servomotor (SG90, etc.)

```
Servo      ESP32
--------   ------
VCC    →   5V (alimentação externa recomendada)
GND    →   GND
Signal →   GPIO 13
```

**Notas:**
- Usa alimentação externa 5V ao usar múltiplos servos
- Liga GND do ESP32 e alimentação externa juntos

### Motor DC (via Driver de Motor)

**Exemplo com Driver L298N:**

```
L298N      ESP32
--------   ------
IN1    →   GPIO 16
IN2    →   GPIO 17
ENA    →   GPIO 25 (PWM)
GND    →   GND
```

**Alimentação:**
- Liga alimentação externa (7-12V) ao VCC do L298N
- Liga GND do L298N e do ESP32 juntos

### NeoPixel LED (WS2812B)

```
NeoPixel   ESP32
--------   ------
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

**Nota:** Recomenda-se alimentação externa 5V para muitos LEDs.

---

## Ligações de Módulos de Comunicação

### Ecrã LCD I2C

Adaptador PCF8574 + LCD 16x2.

```
I2C LCD    ESP32
--------   ------
VCC    →   5V (recomendado) ou 3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Configura o endereço I2C com o jumper do adaptador PCF8574 (padrão 0x27). Recomenda-se 5V (com 3.3V o ecrã pode ficar com brilho reduzido).

### Ecrã TFT (SPI)

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
BL     →   3.3V ou pino de controlo de retroiluminação
```

**Nota:** Seleciona o CI controlador (ST7789 / ILI9341 / ST7735) no bloco. Altera o pino CS se partilhar o barramento SPI com RFID.

### Leitor RFID (RC522)

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
IRQ    →   Não ligar (não necessário no modo polling)
```

**Nota:** RC522 é apenas 3.3V (não ligar 5V). Altera o pino CS se partilhar o barramento SPI com TFT. Consulta a [Lista de Hardware Recomendado](./recommended-hardware.md) para notas sobre regulamentação de rádio.

### Módulo Recetor IR (VS1838B)

```
VS1838B    ESP32
--------   ------
VCC    →   3.3V ou 5V
GND    →   GND
OUT    →   GPIO 14
```

**Nota:** O pino OUT tem pull-up integrado no módulo. Usa a biblioteca IRremoteESP8266 (também funciona no ESP32).

### DFPlayer Mini (MP3)

Ligação UART.

```
DFPlayer   ESP32
--------   ------
VCC    →   5V
GND    →   GND
RX     →   GPIO 12 (com resistência de 1kΩ em série)
TX     →   GPIO 14
SPK+   →   Altifalante (+)
SPK−   →   Altifalante (−)
```

**Nota:** Adiciona sempre uma resistência de 1kΩ em série ao pino RX do DFPlayer. Usa SoftwareSerial (ESP32 RX=14, TX=12). Coloca ficheiros MP3 no microSD como `/01/001.mp3`.

---

## Ligações de Módulo de Câmara

Os módulos de câmara ESP32 têm configurações de pinos integradas. Basta selecionar o tipo de placa no bloco — não é necessária configuração manual de pinos.

### ESP32-CAM (AI-Thinker)

O conector de câmara está integrado na placa. Liga o módulo de câmara OV2640 separadamente.

**Notas de programação:**
- Liga IO0 ao GND com um jumper antes de gravar com o adaptador USB-UART
- Retira o jumper e reinicia após gravar
- ESP32-CAM não tem porta USB — é necessário adaptador USB-UART (3.3V)

**Alimentação:** 5V (via USB) ou 5V externo. A alimentação direta pelo pino 3.3V não é recomendada (a demanda de corrente da câmara pode causar instabilidade).

### XIAO ESP32S3 Sense

A câmara (OV2640) e o microfone estão integrados na placa. Liga a câmara com o cabo flexível dedicado. Não é necessária ligação externa adicional.

---

## Ligação CAN Bus (TWAI)

Usa o controlador TWAI integrado do ESP32. É necessário um CI transcetor CAN externo (ex.: SN65HVD230).

```
SN65HVD230  ESP32
----------  ------
VCC     →   3.3V
GND     →   GND
D (TXD) →   GPIO 5 (TX)
R (RXD) →   GPIO 4 (RX)
CANH    →   Linha CANH do barramento CAN
CANL    →   Linha CANL do barramento CAN
```

**Nota:** Liga resistências de terminação de 120Ω em ambas as extremidades do barramento CAN. SN65HVD230 opera a 3.3V. Consulta a [Lista de Hardware Recomendado](./recommended-hardware.md) para notas regulatórias.

---

## Detalhes e Operações

### Melhores Práticas de Cablagem

#### 1. Gestão de Alimentação

- Usa 3.3V para sensores, alimentação externa para motores
- Liga sempre os GND juntos
- Verifica a capacidade de corrente (pino 3.3V do ESP32 máx ~200mA)

#### 2. Prevenção de Ruído

- Mantém distância entre motores e ESP32
- Adiciona condensador à alimentação do motor
- Mantém os cabos o mais curtos possível

#### 3. Segurança

- Verifica a cablagem antes de ligar para prevenir curto-circuitos
- Usa fusíveis e circuitos de proteção adequados contra sobrecorrente
- Tem especial cuidado com alta tensão (12V+)

### Resolução de Problemas

#### Sensor Não Funciona

1. Verifica novamente a cablagem (VCC, GND, Sinal)
2. Verifica o nível de tensão (3.3V / 5V)
3. Verifica se é necessária resistência pull-up / pull-down

#### Motor Não Funciona

1. Verifica se a alimentação externa está ligada
2. Verifica a ligação GND
3. Verifica a cablagem do driver do motor

Para mais, consulta [Resolução de Problemas](./troubleshooting.md).

---

## Referências

- [Lista de Hardware Recomendado](./recommended-hardware.md) — Lista de dispositivos verificados
- [Primeiros Passos](./getting-started.md) — De USB a LED a piscar
- [Guia ESP32](./04-program-setup-esp32.md) — Detalhes de métodos de carregamento
- [Resolução de Problemas](./troubleshooting.md) — Guia de resolução de problemas
- [Documentação Oficial ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
