# Lista de Hardware Recomendado

**Última atualização:** 2026-04-21

Lista de dispositivos verificados para o DigiCode. Recomendamos comprar em lojas de confiança para garantir um funcionamento estável.

---

## Aviso Importante

> **Sobre cópias baratas e clones**
>
> Os clones económicos vendidos na AliExpress, Wish, Temu, etc. têm problemas reportados:
> - Disposição de pinos diferente
> - Especificações de tensão/corrente diferentes do indicado
> - ICs de driver diferentes (incompatíveis)
> - Grande variabilidade na qualidade
>
> Não podemos oferecer suporte para estes produtos, por favor compre nas lojas recomendadas.

---

## Lojas Recomendadas

| Loja | Características | URL |
|------|----------------|-----|
| **Akizuki Denshi** | Componentes eletrónicos clássico, vasta seleção | https://akizukidenshi.com/ |
| **Switch Science** | Orientado para Makers, documentação em japonês | https://www.switch-science.com/ |
| **Sengoku Densho** | Loja histórica de Akihabara, venda presencial | https://www.sengoku.co.jp/ |
| **Marutsu Online** | Suporte empresarial, garantia de qualidade | https://www.marutsu.co.jp/ |
| **Loja Oficial M5Stack** | Fonte primária da série M5Stack | https://m5stack.com/ |
| **Seeed Studio Oficial** | Fonte primária da série XIAO | https://www.seeedstudio.com/ |
| **DigiKey** | Distribuidor internacional autorizado | https://www.digikey.jp/ |
| **Mouser** | Distribuidor internacional autorizado | https://www.mouser.jp/ |

---

## Placas ESP32

O DigiCode é um editor de blocos **exclusivo para placas baseadas em ESP32**.

### ESP32 Genérico

| Produto | Preço aprox. | Notas | Ligação |
|---------|-------------|-------|---------|
| **ESP32 NodeMCU (com placa de expansão)** | ¥1.782 | Configuração versátil para principiantes. Conector DC (6,5–16V) incluído | [Switch Science](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1.480+ | Placa de desenvolvimento padrão, certificação TELEC | [Akizuki](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) |
| **ESP32-DevKitC-VE** | ¥1.770+ | 8MB Flash/RAM, grande capacidade | [Akizuki](https://akizukidenshi.com/catalog/g/g115674/) |
| **ESPr Developer 32** | ¥2.200 | Design japonês, certificação TELEC | [Switch Science](https://www.switch-science.com/products/3210) |

### Série M5Stack

| Produto | Preço aprox. | Notas | Ligação |
|---------|-------------|-------|---------|
| **M5StampS3A + Placa de Expansão Dedicada** | — | **MCU principal recomendado pelo DigiCode (placa de expansão dedicada em desenvolvimento; detalhes no lançamento)** | [M5Stack Oficial](https://shop.m5stack.com/) |
| **M5StickC Plus2** | ¥4.400 | Compacto, com ecrã | [Switch Science](https://www.switch-science.com/products/9426) |
| **ATOM Lite** | ¥1.815 | Ultra-compacto, 1 NeoPixel | [Switch Science](https://www.switch-science.com/products/6262) |
| **ATOM Matrix** | ¥2.420 | Matriz NeoPixel 5×5 | [Switch Science](https://www.switch-science.com/products/6260) |
| **M5Camera / Unit Cam S3 / Timer Cam** | ¥3.000+ | Módulos com câmara (compatível BP7) | [M5Stack Oficial](https://shop.m5stack.com/) |

### Série Seeed XIAO

| Produto | Preço aprox. | Notas | Ligação |
|---------|-------------|-------|---------|
| **XIAO ESP32S3** | ¥1.100 | Ultra-compacto, USB-C | [Switch Science](https://www.switch-science.com/products/8887) |
| **XIAO ESP32S3 Sense** | ¥2.530 | Câmara + microfone integrados (compatível BP7) | [Switch Science](https://www.switch-science.com/products/8868) |
| **XIAO ESP32C3** | ¥980 | Baixo consumo, RISC-V | [Switch Science](https://www.switch-science.com/products/8363) |
| **XIAO ESP32C6** | ¥1.280 | Compatível com Matter | [Seeed Studio](https://www.seeedstudio.com/Seeed-XIAO-ESP32C6-p-5884.html) |

### Suportado com Limitações

| Produto | Limitação |
|---------|----------|
| ESP32-CAM (OV2640) | Poucos pinos disponíveis; não adequado para controlo de servos (usar apenas como câmara) |

### Não Compatível com DigiCode

| Produto | Razão |
|---------|-------|
| Arduino Uno / Nano | DigiCode é exclusivo para ESP32; não suportado |
| Raspberry Pi Pico (base) | Sem WiFi; funcionalidade muito limitada |
| ESP8266 | DigiCode não suporta ESP8266 |
| Outros MCU (Renesas / STM, etc.) | Sem suporte planeado |

---

## Servomotores

### Servomotores Recomendados (180°)

| Produto | Preço aprox. | Utilização | Ligação |
|---------|-------------|-----------|---------|
| **SG90** | ¥440 | Padrão para robô bípede, carga leve | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1.240 | Engrenagem metálica, carga média | [Akizuki](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | Alto binário | [Akizuki](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1.480 | Alto binário, robôs grandes | [Akizuki](https://akizukidenshi.com/catalog/g/g112534/) |

### Servomotores Recomendados (Rotação Contínua / 360°)

| Produto | Preço aprox. | Utilização | Ligação |
|---------|-------------|-----------|---------|
| **FS90R** | ¥500 | Rotação contínua, para robôs Wheel | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |

### Notas sobre o Uso de Servomotores

```
⚠️ Notas importantes sobre alimentação
- Os servomotores são instáveis com alimentação USB (500 mA)
- Use alimentação externa (5V/2A ou mais) ao usar vários servos
- NÃO alimente servos pelo pino 3,3V do ESP32 (é necessário 5V)
```

---

## Sensores

### Sensores Ultrassónicos

| Produto | Preço aprox. | Utilização | Ligação |
|---------|-------------|-----------|---------|
| **HC-SR04** | ¥300+ | Sensor ultrassónico padrão | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) / [Switch Science](https://www.switch-science.com/products/6080) |
| **Sensor ToF VL53L0X** | ¥1.500+ | Medição de distância de alta precisão (30–1200 mm) | [Switch Science](https://www.switch-science.com/products/7385) |

### Sensores de Temperatura, Humidade e Ambientais

| Produto | Preço aprox. | Precisão | Ligação |
|---------|-------------|---------|---------|
| **DHT11** | ¥550 | Temp ±2°C, Humidade ±5% | [Akizuki](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22 (AM2302)** | ¥1.160 | Temp ±0,5°C, Humidade ±2% | [Akizuki](https://akizukidenshi.com/catalog/g/g107002/) |
| **Módulo BME280** | ¥1.380+ | Temp + humidade + pressão (alta precisão) | [Akizuki](https://akizukidenshi.com/catalog/g/g109421/) |
| **Módulo BMP280** | ¥550+ | Temp + pressão (sem humidade) | [Akizuki](https://akizukidenshi.com/catalog/g/g109058/) |

### Sensores de Movimento e Orientação

| Produto | Preço aprox. | Utilização | Ligação |
|---------|-------------|-----------|---------|
| **Módulo MPU6050** | ¥500+ | Acelerómetro + giroscópio (pêndulo invertido, micromouse) | [Akizuki](https://akizukidenshi.com/catalog/g/g109026/) |
| **Módulo Encoder Magnético AS5600** | ¥600+ | Sensor de ângulo absoluto | [Switch Science](https://www.switch-science.com/products/9069) |

### Notas sobre HC-SR04

```
⚠️ Nota sobre níveis de tensão
- HC-SR04 opera a 5V; ESP32 opera a 3,3V
- O pino Echo pode emitir 5V
- Use um divisor de tensão (1kΩ + 2kΩ) no pino Echo
```

---

## Ecrãs

### OLED (SSD1306)

| Produto | Tamanho | Preço aprox. | Ligação |
|---------|---------|-------------|---------|
| **OLED 0,96" (branco)** | 128×64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g112031/) |
| **OLED 0,96" (azul)** | 128×64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g115870/) |

### LCD de Caracteres (I2C 16×2)

| Produto | Preço aprox. | Notas | Ligação |
|---------|-------------|-------|---------|
| **LCD de Caracteres I2C 16×2** | ¥800+ | Via PCF8574, económico e popular | [Akizuki](https://akizukidenshi.com/catalog/g/g109109/) |

### TFT (ILI9341 / ST7789 / ST7735)

| Produto | Tamanho | Preço aprox. | Notas |
|---------|---------|-------------|-------|
| **TFT ST7789 1,3"** | 240×240 | ¥1.500+ | SPI, cor |
| **TFT ILI9341 2,4"** | 240×320 | ¥1.800+ | SPI, ecrã grande |

---

## NeoPixel (WS2812B)

| Produto | LEDs | Preço aprox. | Ligação |
|---------|------|-------------|---------|
| **NeoPixel Ring 12LED** | 12 | ¥1.078 | [Switch Science](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1.287 | [Switch Science](https://www.switch-science.com/products/1537) |
| **Barra WS2812B 8LED** | 8 | ¥350 | [Akizuki](https://akizukidenshi.com/catalog/g/g114307/) |
| **Módulo WS2812B (individual)** | 1 | ¥70 | [Akizuki](https://akizukidenshi.com/catalog/g/g108414/) |

### Notas sobre Alimentação

```
⚠️ Consumo de corrente
- Até 60 mA por LED (branco, brilho máximo)
- 8 LEDs = até 480 mA
- 16 LEDs = até 960 mA
- Matrizes grandes requerem alimentação externa (5V)
```

---

## Controladores de Motor

| Produto | Corrente nominal | Preço aprox. | Ligação |
|---------|----------------|-------------|---------|
| **Controlador de Motor Duplo L298N 2A** | 2A/ch | ¥2.180 | [Akizuki](https://akizukidenshi.com/catalog/g/g106680/) |
| **Módulo Driver de Motor DRV8835** | 1,2A/ch | ¥550 | [Akizuki](https://akizukidenshi.com/catalog/g/g109848/) |
| **Kit Driver Motor DC Duplo TB6612FNG** | 1,2A/ch | ¥450 | [Akizuki](https://akizukidenshi.com/catalog/g/g111219/) / [Switch Science](https://www.switch-science.com/products/236) |

---

## Zumbadores e Áudio

| Produto | Tipo | Preço aprox. | Ligação |
|---------|------|-------------|---------|
| **Altifalante Piezoelétrico (Passivo)** | Passivo | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **DFPlayer Mini (Leitor MP3)** | MP3 | ¥600+ | [Akizuki](https://akizukidenshi.com/catalog/g/g113277/) |

**DigiCode recomenda zumbadores passivos** (com suporte para reprodução de melodias)

---

## Específico para Robôs

### Configuração Recomendada (Humanoid Bípede)

| Componente | Recomendado | Qtd. | Preço unit. | Ligação |
|------------|-------------|------|------------|---------|
| Placa ESP32 | ESP32 NodeMCU (com placa expansão) | 1 | ¥1.782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Servo | SG90 | 4 | ¥440 | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| Sensor ultrassónico | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| Zumbador | Altifalante piezoelétrico | 1 | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **Total** | | | **¥3.882** | |

> Assim que o M5StampS3A + placa de expansão dedicada estiver disponível, será recomendada uma configuração mais compacta.

### Configuração Recomendada (Robô Wheel)

| Componente | Recomendado | Qtd. | Preço unit. | Ligação |
|------------|-------------|------|------------|---------|
| Placa ESP32 | ESP32 NodeMCU (com placa expansão) | 1 | ¥1.782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Servo de rotação contínua | FS90R | 2 | ¥500 | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |
| Sensor ultrassónico | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| **Total** | | | **¥3.082** | |

---

## Documentos Relacionados

- [Guia de Ligação de Hardware](./hardware-setup.md)
- [Resolução de Problemas](./troubleshooting.md)
- [Primeiros Passos](./getting-started.md)
