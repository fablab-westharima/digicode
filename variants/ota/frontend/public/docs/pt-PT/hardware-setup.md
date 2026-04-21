# Guia de Configuração de Hardware

Como conectar sensores e atuadores ao ESP32.

> **Recomendado:** Consulte a [Lista de Hardware Recomendado](./recommended-hardware.md) para dispositivos verificados. Usar peças testadas ajuda a evitar problemas.

## Distribuição de Pinos ESP32

### GPIO (Entrada/Saída de Propósito Geral)
- **GPIO 0-39**: Entrada/saída digital
- **GPIO 32-39**: Apenas entrada analógica (ADC1)
- **GPIO 0, 2**: LED integrado (varia conforme a placa)

### Pinos Especiais
- **GPIO 1, 3**: UART (série) - evitar (usado para programação)
- **GPIO 6-11**: Apenas memória Flash - não usar
- **GPIO 34-39**: Apenas entrada (sem resistência pull-up)

### Alimentação
- **3.3V**: Alimentação para sensores e motores
- **5V**: 5V via USB (apenas algumas placas)
- **GND**: Terra (terra comum)

## Ligações de Sensores

### Sensor Ultrassónico (HC-SR04)

**Distribuição de Pinos:**
```
HC-SR04    ESP32
--------   ------
VCC    →   3.3V ou 5V
GND    →   GND
Trig   →   GPIO 5
Echo   →   GPIO 18
```

**Nota:** Ao ligar sensores de 5V ao ESP32 (3.3V), adicione divisor de tensão ao pino Echo

### Sensor de Temperatura/Humidade (DHT11/DHT22)

**Distribuição de Pinos:**
```
DHT11      ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

**Nota:** Ligue resistência pull-up de 10kΩ entre o pino DATA e VCC

### Sensor de Linha QTR (8 canais)

**Exemplo de Distribuição de Pinos:**
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

**Distribuição de Pinos (I2C):**
```
MPU6050    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Endereço 0x68 (AD0=LOW) ou 0x69 (AD0=HIGH). Podem ser ligados vários dispositivos no mesmo barramento I2C

### Sensor de Pressão/Temperatura/Humidade (BME280 / BMP280)

**Distribuição de Pinos (I2C):**
```
BME280     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Endereço padrão 0x76 (SDO=LOW) ou 0x77 (SDO=HIGH). BMP280 mede temperatura e pressão; BME280 também mede humidade

### Sensor de Distância ToF (VL53L0X)

**Distribuição de Pinos (I2C):**
```
VL53L0X    ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Endereço 0x29. Com múltiplas unidades, use o pino XSHUT para arrancar individualmente e alterar o endereço

### Encoder Magnético (AS5600)

**Distribuição de Pinos (I2C):**
```
AS5600     ESP32
--------   ------
VCC    →   3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
DIR    →   GND (sentido horário positivo) ou 3.3V (anti-horário positivo)
```

**Nota:** Endereço fixo 0x36. Coloque o íman centrado sobre o eixo; mantenha distância sensor-íman de 0.5–3mm

## Ligações de Atuadores

### Servomotor (SG90, etc.)

**Distribuição de Pinos:**
```
Servo      ESP32
--------   ------
VCC    →   5V (alimentação externa recomendada)
GND    →   GND
Signal →   GPIO 13
```

**Notas:**
- Use alimentação externa 5V ao usar múltiplos servos
- Ligue GND do ESP32 e alimentação externa juntos

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
- Ligue alimentação externa (7-12V) ao VCC do L298N
- Ligue GND do L298N e do ESP32 juntos

### NeoPixel LED (WS2812B)

**Distribuição de Pinos:**
```
NeoPixel   ESP32
--------   ------
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

**Nota:** Recomenda-se alimentação externa 5V para muitos LEDs

## Ligações de Módulos de Comunicação

### Ecrã LCD I2C (Adaptador PCF8574 + LCD 16x2)

**Distribuição de Pinos (I2C):**
```
I2C LCD    ESP32
--------   ------
VCC    →   5V (recomendado) ou 3.3V
GND    →   GND
SDA    →   GPIO 21
SCL    →   GPIO 22
```

**Nota:** Configure o endereço I2C com o jumper do adaptador PCF8574 (padrão 0x27). Recomenda-se 5V (com 3.3V o ecrã pode ficar com brilho reduzido)

### Ecrã TFT (SPI — ST7789 / ILI9341)

**Distribuição de Pinos (SPI por Hardware):**
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

**Nota:** Selecione o CI controlador (ST7789 / ILI9341 / ST7735) no bloco. Altere o pino CS se partilhar o barramento SPI com RFID

### Leitor RFID (RC522, SPI)

**Distribuição de Pinos (SPI por Hardware):**
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

**Nota:** RC522 é apenas 3.3V (não ligar 5V). Altere o pino CS se partilhar o barramento SPI com TFT. Consulte a [Lista de Hardware Recomendado](./recommended-hardware.md) para notas sobre regulamentação de rádio

### Módulo Recetor IR (VS1838B)

**Distribuição de Pinos:**
```
VS1838B    ESP32
--------   ------
VCC    →   3.3V ou 5V
GND    →   GND
OUT    →   GPIO 14
```

**Nota:** O pino OUT tem pull-up integrado no módulo. Usa a biblioteca IRremoteESP8266 (também funciona no ESP32)

### DFPlayer Mini (Reprodução MP3, UART)

**Distribuição de Pinos:**
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

**Nota:** Adicione sempre uma resistência de 1kΩ em série ao pino RX do DFPlayer. Usa SoftwareSerial (ESP32 RX=14, TX=12). Coloque ficheiros MP3 no microSD como `/01/001.mp3`

## Ligações de Módulo de Câmara

Os módulos de câmara ESP32 têm configurações de pinos integradas. Basta selecionar o tipo de placa no bloco e a configuração fica completa automaticamente.

### ESP32-CAM (AI-Thinker)

O conector de câmara está integrado na placa. Ligue o módulo de câmara OV2640 separadamente.

**Notas de Programação:**
- Ligue IO0 ao GND com um jumper antes de gravar com o adaptador USB-UART
- Retire o jumper e reinicie após gravar
- ESP32-CAM não tem porta USB — é necessário adaptador USB-UART (3.3V)

**Alimentação:** 5V (via USB) ou 5V externo. A alimentação direta pelo pino 3.3V não é recomendada (pode causar instabilidade pela alta demanda de corrente da câmara)

### XIAO ESP32S3 Sense

A câmara (OV2640) e o microfone estão integrados na placa. Ligue a câmara com o cabo flexível dedicado. Não é necessária ligação externa adicional.

## Ligação CAN Bus (TWAI)

Usa o controlador TWAI integrado do ESP32. É necessário um CI transcetor CAN externo (ex.: SN65HVD230).

**Distribuição de Pinos:**
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

**Nota:** Ligue resistências de terminação de 120Ω em ambas as extremidades do barramento CAN. SN65HVD230 opera a 3.3V. Consulte a [Lista de Hardware Recomendado](./recommended-hardware.md) para notas regulatórias

## Melhores Práticas de Cablagem

### 1. Gestão de Alimentação
- Use 3.3V para sensores, alimentação externa para motores
- Ligue sempre os GND juntos
- Verifique a capacidade de corrente (pino 3.3V do ESP32 máx ~200mA)

### 2. Prevenção de Ruído
- Mantenha distância entre motores e ESP32
- Adicione condensador à alimentação do motor
- Mantenha os cabos o mais curtos possível

### 3. Segurança
- Verifique a cablagem antes de ligar para prevenir curto-circuitos
- Use fusíveis e circuitos de proteção adequados contra sobrecorrente
- Tenha especial cuidado com alta tensão (12V+)

## Resolução de Problemas

### Sensor Não Funciona
1. Verifique novamente a cablagem (VCC, GND, Sinal)
2. Verifique o nível de tensão (3.3V/5V)
3. Verifique se é necessária resistência pull-up/pull-down

### Motor Não Funciona
1. Verifique se a alimentação externa está ligada
2. Verifique a ligação GND
3. Verifique a cablagem do driver do motor

## Referências

- [Lista de Hardware Recomendado](./recommended-hardware.md) - Lista de dispositivos verificados
- [Documentação Oficial ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [Fichas Técnicas dos Sensores](Site do fabricante de cada sensor)
