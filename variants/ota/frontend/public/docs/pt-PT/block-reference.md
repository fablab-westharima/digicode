# Referência de Blocos

Lista completa de todos os blocos disponíveis no DigiCode e como utilizá-los.

## Índice

1. [Blocos Básicos](#blocos-básicos)
2. [Interrupções e Tempo](#interrupções-e-tempo)
3. [Dados (Arrays)](#dados-arrays)
4. [Sensores](#sensores)
5. [Atuadores](#atuadores)
6. [Ecrã](#ecrã)
7. [NeoPixel (LED)](#neopixel-led)
8. [Áudio](#áudio)
9. [Comunicação](#comunicação)
10. [Armazenamento](#armazenamento)
11. [Câmara](#câmara)
12. [Robô](#robô)
13. [Placas Compatíveis](#placas-compatíveis)

---

## Blocos Básicos

Blocos para estrutura básica do programa e controlo de E/S do ESP32.

### Estrutura do Programa

| Nome do Bloco | Descrição | Notas |
|---------------|-----------|-------|
| **Setup** | Executado uma vez no início | Coloque o código de inicialização aqui |
| **Loop** | Processamento principal repetido | Coloque a lógica de sensores e controlo |

### E/S Digital

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Configurar Modo do Pino** | Configura o modo de entrada/saída do pino | Número do pino, Modo (INPUT/OUTPUT/INPUT_PULLUP) |
| **Escrita Digital** | Saída HIGH/LOW para o pino | Número do pino, Valor (HIGH/LOW) |
| **Leitura Digital** | Lê o estado do pino | Número do pino → true/false |
| **LED Interno ON** | Liga o LED integrado do ESP32 (GPIO2) | — |
| **LED Interno OFF** | Desliga o LED integrado do ESP32 (GPIO2) | — |

### E/S Analógica

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Leitura Analógica** | Lê valor analógico | Número do pino (GPIO32-39 recomendado) → 0-4095 |
| **Saída PWM** | Saída de sinal PWM | Número do pino, Ciclo de trabalho (0-255) |

### Tempo e Temporização

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Esperar** | Aguarda o tempo especificado | Tempo (milissegundos) |
| **Tempo Decorrido** | Obtém o tempo decorrido desde o início (ms) | → milissegundos |

### Comunicação Série

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Iniciar Serial** | Inicializa a comunicação série | Velocidade em baud (9600/57600/115200) |
| **Imprimir Serial** | Envia para o monitor série | Valor de saída |
| **Imprimir Serial (com nova linha)** | Saída com nova linha | Valor de saída |

### Conversão Numérica

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Mapear Número** | Mapeia um número para um intervalo diferente | Valor, Min/Max entrada, Min/Max saída → valor mapeado |

### Utilitários ESP32

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Reiniciar ESP32** | Reinicia o ESP32 | — |
| **Deep Sleep** | Entra em sono profundo (poupança de energia) | Segundos (reinicia do início ao acordar) |
| **Light Sleep** | Entra em sono ligeiro | Segundos (continua na linha seguinte ao acordar) |
| **Memória Livre (bytes)** | Obtém a memória heap disponível | → bytes |
| **ID do Chip ESP** | Obtém o ID único do chip | → cadeia |
| **Frequência CPU (MHz)** | Obtém a frequência do relógio do CPU | → MHz |
| **Reproduzir Tom** | Saída de som à frequência especificada | Número do pino, Frequência (Hz), Duração (ms) |

---

## Interrupções e Tempo

Blocos para interrupções de pinos, temporizadores periódicos e recuperação de tempo.

> **Nota:** Nunca chame `delay()` ou `Serial.print()` dentro de um handler de interrupção — isto irá bloquear o ESP32. Use variáveis `volatile` para sinalizar eventos e trate-os no loop principal.

### Interrupções de Pinos

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Anexar Interrupção** | Chama o handler quando o pino muda | Pino, Modo (RISING/FALLING/CHANGE), Handler |
| **Remover Interrupção** | Remove o handler de interrupção | Pino |
| **Verificar Interrupção** | Verifica o flag de interrupção e executa o handler | Coloque dentro do loop |

### Temporizador (Ticker)

**Compatível:** Apenas ESP32 (Ticker.h)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Iniciar Ticker** | Chama o handler repetidamente no intervalo | Intervalo (ms), Handler |
| **Parar Ticker** | Para o temporizador periódico | — |
| **Verificar Ticker** | Verifica o flag do temporizador e executa o handler | Coloque dentro do loop |

### Sincronização NTP

**Compatível:** Placas com WiFi (requer ligação WiFi)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Sincronizar NTP** | Sincroniza o tempo com o servidor NTP | URL do servidor, Desvio de fuso horário (seg, JST=32400) |
| **Obter Tempo Unix** | Obtém o timestamp Unix atual | → segundos |
| **Obter Tempo Formatado** | Obtém o tempo como cadeia formatada | Formato (%Y-%m-%d %H:%M:%S etc.) → cadeia |
| **Obter Componente de Tempo** | Obtém ano/mês/dia/hora/min/seg | Seleção → número |

### RTC (Relógio em Tempo Real)

**Biblioteca:** RTClib (pré-instalada no Dockerfile)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar RTC** | Inicializa DS3231/DS1307 via I2C | Seleção de modelo |
| **Definir Tempo RTC** | Define data/hora no RTC | Ano/Mês/Dia/Hora/Min/Seg |
| **Obter RTC** | Obtém ano/mês/dia/hora/min/seg/tempo unix | Seleção → número |
| **Tempo RTC Formatado** | Obtém o tempo como "YYYY-MM-DD HH:MM:SS" | → cadeia |

---

## Dados (Arrays)

Blocos para operações com arrays.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Criar Array** | Cria array 1D/2D/3D | Nome de variável, Tipo, Dimensões, Tamanho |
| **Definir Elemento** | Define valor no índice do array | Nome de variável, Índice, Valor |
| **Obter Elemento** | Obtém valor do índice do array | Nome de variável, Índice → Valor |
| **Tamanho do Array** | Obtém o número de elementos | Nome de variável → número |
| **Conteúdo do Array** | Define os valores iniciais | Número de elementos, Cada valor |

---

## Sensores

### Sensor Ultrassónico (HC-SR04)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar HC-SR04** | Inicializa o sensor ultrassónico | Pino Trig, Pino Echo |
| **Distância Ultrassónica (cm)** | Mede a distância | → cm |

**Ligação:** Trig→GPIO18 / Echo→GPIO19 / VCC→5V / GND→GND

### RUS-04 (Sensor Ultrassónico com RGB)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar RUS-04** | Inicializa sensor e LEDs RGB | Pino Trig/Echo/RGB, Quantidade de LEDs |
| **Distância RUS-04 (cm)** | Mede a distância | → cm |
| **RGB Ambos Olhos RUS-04** | Define cor de ambos os olhos | Cor esquerda, Cor direita |
| **RGB Olho RUS-04** | Define cor de um olho | Esquerdo/Direito, Cor |
| **Brilho RGB RUS-04** | Define o brilho do LED | 0-255 |
| **Apagar RGB RUS-04** | Apaga os LEDs | — |

### Sensor de Temperatura/Humidade (DHT11/DHT22)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar DHT** | Inicializa o sensor DHT | Tipo (DHT11/DHT22), Pino |
| **Temperatura DHT (°C)** | Obtém temperatura | → Celsius |
| **Humidade DHT (%)** | Obtém humidade | → percentagem |

### Sensores Digitais

| Nome do Bloco | Descrição | Deteta |
|---------------|-----------|--------|
| **Botão** | Botão/Interruptor | Estado de pressão |
| **Sensor de Movimento PIR** | Sensor infravermelhos de movimento | Movimento |
| **Sensor de Inclinação** | Sensor de inclinação | Inclinação |
| **Sensor de Vibração** | Sensor de vibração/impacto | Vibração |
| **Sensor Magnético** | Sensor de efeito Hall | Íman |
| **Interruptor Fotoelétrico** | Sensor de rutura infravermelha | Rutura |
| **Sensor de Obstáculo IR** | Sensor infravermelhos de obstáculos | Obstáculo |
| **Sensor de Chama (Digital)** | Deteção de chama | Fogo |
| **Sensor de Gás (Digital)** | Sensor de gás série MQ | Gás |
| **Interruptor de Fim de Curso** | Microinterruptor | Contacto |
| **Leitura Digital** | Leitura digital genérica | → HIGH/LOW |

### Sensores Analógicos

| Nome do Bloco | Descrição | Saída |
|---------------|-----------|-------|
| **Potenciómetro** | Resistência variável | Bruto/Percentagem/Ângulo |
| **Sensor de Luz (LDR)** | Sensor de luz CdS | Bruto/Percentagem |
| **Temperatura Termístor** | Termístor NTC | Celsius |
| **Temperatura LM35** | Sensor de temperatura LM35 | Celsius |
| **Sensor de Gás (Analógico)** | Saída analógica MQ | 0-4095 |
| **Humidade do Solo** | Sensor de humidade do solo | Bruto/Percentagem |
| **Sensor de Nível de Água** | Sensor de nível de água | Bruto/Percentagem |
| **Sensor de Chama (Analógico)** | Saída analógica de chama | 0-4095 |
| **Sensor IR Reflexivo** | Sensor reflexivo infravermelhos | 0-4095 |
| **Joystick** | Manete analógica de 2 eixos | Eixo X/Eixo Y |
| **Leitura Analógica** | Leitura analógica genérica | → 0-4095 |
| **Tensão da Bateria (V)** | Mede a tensão da bateria via divisor de tensão | Pino ADC, Rácio do divisor → V |
| **% da Bateria** | Converte tensão em percentagem | Tensão, Min V, Max V → % |

### Sensor Tátil (Integrado no ESP32)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Sensor Tátil** | Inicializa o sensor tátil capacitivo | Pino (T0-T9), Limiar |
| **Tocado?** | Deteta toque | → true/false |
| **Valor Sensor Tátil** | Obtém valor capacitivo bruto | → número (menor = toque mais forte) |

**Pinos compatíveis:** T0(GPIO4) / T2(GPIO2) / T3(GPIO15) etc.

### Sensor de Som

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Sensor de Som** | Inicializa o sensor de microfone | Pino ADC (GPIO32-39) |
| **Nível de Som** | Obtém o nível de volume | → 0-4095 |
| **Som Detetado?** | Deteta som acima do limiar | Limiar → true/false |

### Sensor de Luz (CdS)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Sensor de Luz** | Inicializa o sensor CdS | Pino ADC (GPIO32-39) |
| **Nível de Luz** | Obtém o brilho | → 0-4095 (maior = mais brilhante) |

### Sensores de Linha (QTR/TCRT)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar QTR-8A** | Inicializa sensor QTR analógico | Número de sensores, Cada pino |
| **Inicializar QTR-8RC** | Inicializa sensor QTR digital | Número de sensores, Cada pino |
| **Calibrar QTR** | Calibração manual | — |
| **Calibração Automática QTR** | Calibração automática | — |
| **Posição de Linha QTR** | Obtém posição de linha (0-7000) | → valor de posição |
| **Posição de Linha QTR (Normalizada)** | Normalizado de -1.0 a 1.0 | → decimal |
| **Valor Sensor QTR** | Obtém valor individual do sensor | Número do sensor → valor |
| **Ler Tudo QTR** | Lê todos os sensores de uma vez | — |
| **Valor Bruto QTR** | Valor antes da calibração | Número do sensor → valor |
| **Linha Detetada QTR?** | Verifica se a linha é detetada | → true/false |
| **QTR Calibrado?** | Verifica o estado de calibração | → true/false |
| **Controlo Emissor QTR** | Liga/desliga os LEDs emissores | ON/OFF |

**Sensor de Linha Genérico (TCRT5000 etc.):**

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Sensor de Linha** | Inicializa sensor de linha genérico | Número de sensores (2-8), Cada pino |
| **Inicializar Sensor de Linha (Simples)** | Configuração esquerda/direita de 2 sensores | Pino esquerdo, Pino direito |
| **Inicializar Sensor de Linha (3 sensores)** | Configuração de 3 sensores | Pinos esquerdo/centro/direito |
| **Calibrar Sensor de Linha** | Executa calibração | — |
| **Posição Sensor de Linha** | Obtém posição de linha | → -100 a 100 |
| **Valor Sensor de Linha** | Lê sensor individual | Número do sensor → 0/1 |
| **Linha Detetada?** | Verifica se está sobre a linha | → true/false |
| **Valor Bruto Sensor de Linha** | Valor analógico bruto | Número do sensor → valor |

### Sensores de Parede (Micromouse)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Sensor de Parede** | Inicializa sensores IR de parede | Número de sensores, Cada pino |
| **Parede Presente?** | Deteta parede na direção | Direção (frente/esquerda/direita) → true/false |
| **Valor Sensor de Parede** | Obtém valor de reflexão bruto | Número do sensor → valor |
| **Erro Sensor de Parede** | Obtém o erro de posição em relação à parede | → valor |
| **Informação Sensor de Parede** | Obtém estados de todos os sensores | — |
| **Ler Sensor de Parede** | Atualiza os valores do sensor | — |
| **Limiar Sensor de Parede** | Define limiar de deteção de parede | Limiar |

### Encoders

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Encoder** | Inicializa o encoder rotativo | Pinos A/B |
| **Distância Encoder** | Obtém a distância percorrida | → mm |
| **Velocidade Encoder** | Obtém a velocidade atual | → mm/s |
| **Contagem Encoder** | Obtém a contagem de pulsos | → número |
| **Reiniciar Encoder** | Reinicia a contagem | — |
| **Esperar Distância Encoder** | Aguarda até percorrer a distância especificada | Distância (mm) |

### MPU6050 (Acelerómetro/Giroscópio)

**Biblioteca:** Adafruit MPU6050 (pré-instalada) / **Ligação:** SDA/SCL

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar MPU6050** | Inicializa via I2C | Intervalo do acelerómetro, Intervalo do giroscópio |
| **Atualizar MPU6050** | Lê sensor e atualiza ângulos | Coloque no loop |
| **Aceleração** | Obtém aceleração no eixo (m/s²) | X/Y/Z → m/s² |
| **Giroscópio** | Obtém velocidade angular (rad/s) | X/Y/Z → rad/s |
| **Temperatura MPU6050** | Obtém temperatura do chip | → °C |
| **Obter Ângulo** | Obtém Pitch/Roll (filtro complementar) | Pitch/Roll → graus |
| **Calibrar MPU6050** | Calibra em repouso | Número de amostras |

### BME280 (Pressão/Temperatura/Humidade) / BMP280 (Pressão/Temperatura)

**Biblioteca:** Adafruit BME280 / Adafruit BMP280 (pré-instaladas)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar BME280** | Inicializa via I2C | Endereço I2C (0x76/0x77) |
| **Ler BME280** | Obtém temperatura/humidade/pressão | Seleção de item → valor |
| **Inicializar BMP280** | Inicializa via I2C (sem humidade) | Endereço I2C |
| **Ler BMP280** | Obtém temperatura/pressão | Seleção de item → valor |
| **Altitude BMP280 (m)** | Calcula altitude a partir da pressão | Pressão ao nível do mar (hPa, padrão: 1013.25) → m |

### VL53L0X (Sensor de Distância ToF)

**Biblioteca:** Adafruit VL53L0X (pré-instalada) / **Intervalo:** 30–1200mm

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar VL53L0X** | Inicializa sensor ToF (I2C, 0x29) | → true/false |
| **Distância VL53L0X (mm)** | Obtém distância | → mm (0 em caso de erro) |

### AS5600 (Encoder Magnético)

**Biblioteca:** Seeed_Arduino_AS5600 (pré-instalada) / **Ligação:** SDA/SCL

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar AS5600** | Inicializa encoder magnético (I2C, 0x36) | → true/false |
| **Ângulo AS5600 (°)** | Obtém ângulo absoluto (0–360°) | → graus (resolução 0.088°) |
| **Valor Bruto AS5600 (0-4095)** | Obtém valor de 12 bits | → 0-4095 |

---

## Atuadores

### Servomotor

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Ligar Servo** | Liga o servo ao pino | Número do pino |
| **Ângulo Servo** | Roda o servo para o ângulo | Pino, Ângulo (0-180°) |
| **Ângulo Servo (Variável)** | Define ângulo a partir de variável | Pino, Valor do ângulo |
| **Desligar Servo** | Desliga o servo (poupança de energia) | Pino |
| **Varredura Servo** | Move do ângulo inicial ao final | Pino, Ângulo inicial, Ângulo final, Velocidade |

### Motor DC (L298N)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Motor** | Inicializa o driver de motor L298N | Motor (A/B), Pinos IN1/IN2/ENA |
| **Acionar Motor** | Controla o motor | Motor, Direção (Frente/Trás/Parar), Velocidade (0-255) |
| **Velocidade Motor** | Muda apenas a velocidade | Motor, Velocidade |
| **Parar Motor** | Para o motor | Motor (A/B/Ambos) |

### Motor de Passo (28BYJ-48)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Stepper** | Inicializa o 28BYJ-48 | Pinos IN1-IN4 |
| **Mover Stepper** | Move por número de passos | Passos, Direção |
| **Rodar Stepper** | Roda por ângulo | Ângulo, Direção |
| **Parar Stepper** | Para o motor de passo | — |

---

## Ecrã

### Ecrã OLED (SSD1306)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar OLED** | Inicializa OLED I2C | Largura (64/128), Altura (32/64), Pinos SDA/SCL |
| **Mostrar OLED** | Mostra texto | Texto, Coordenadas X/Y, Tamanho (Pequeno/Médio/Grande) |
| **Limpar OLED** | Limpa o ecrã | — |
| **Atualizar OLED** | Aplica o buffer do ecrã | — |
| **Desenhar Linha OLED** | Desenha uma linha | X1,Y1,X2,Y2 |
| **Desenhar Retângulo OLED** | Desenha um retângulo | X,Y,Largura,Altura, Preenchimento/Contorno |

### Ecrã LCD de Caracteres (I2C 16x2)

**Biblioteca:** LiquidCrystal_I2C (pré-instalada) / Endereços I2C comuns: 0x27 ou 0x3F

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar LCD** | Inicializa LCD I2C | Colunas, Linhas, Endereço I2C |
| **Imprimir LCD** | Imprime texto na posição atual | Texto |
| **Imprimir LCD Em** | Imprime em (coluna, linha) | Coluna, Linha, Texto |
| **Limpar LCD** | Apaga todo o texto, cursor ao início | — |
| **Retroiluminação LCD** | Liga/desliga a retroiluminação | ON/OFF |

### Ecrã TFT (ILI9341 / ST7789 / ST7735)

**Ligação:** SPI (SPI por hardware)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar TFT** | Inicializa TFT | Driver, Pinos CS/DC/RST |
| **Preencher Ecrã TFT** | Preenche todo o ecrã com uma cor | Cor |
| **Pixel TFT** | Desenha um pixel | X,Y, Cor |
| **Linha TFT** | Desenha uma linha | X1,Y1,X2,Y2, Cor |
| **Retângulo TFT** | Desenha um retângulo | X,Y,Largura,Altura, Preenchimento, Cor |
| **Círculo TFT** | Desenha um círculo | X,Y,Raio, Preenchimento, Cor |
| **Cursor TFT** | Define posição/tamanho/cor do cursor de texto | X,Y, Tamanho, Cor |
| **Imprimir TFT** | Imprime texto na posição do cursor | Texto |
| **Cor RGB TFT** | Gera código de cor de 16 bits a partir de R/G/B | R,G,B (0-255 cada) → valor de cor |

---

## NeoPixel (LED)

Controla LEDs endereçáveis como WS2812B.

### Operações Básicas

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar NeoPixel** | Inicializa a fita LED | Pino, Quantidade de LEDs |
| **Cor LED** | Define cor do LED individual | Índice, R/G/B (0-255) |
| **Cor Todos LEDs** | Define todos os LEDs para a mesma cor | R/G/B (0-255) |
| **Mostrar NeoPixel** | Aplica as cores (chamar após alterações) | — |
| **Apagar NeoPixel** | Apaga todos os LEDs | — |
| **Brilho NeoPixel** | Define o brilho geral | 0-255 |

### Efeitos

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Efeito Arco-Íris** | Animação arco-íris | Velocidade |
| **Efeito Ressalto** | LED ressaltando | Cor, Velocidade |
| **Efeito Ciclo** | Efeito rotativo | Cor, Velocidade |

### Operações Simples (nome de cor)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Cor Todos (Simples)** | Define todos os LEDs por nome de cor | Cor (Vermelho/Verde/Azul/Amarelo/Roxo/Ciano/Branco/Apagado etc.) |
| **LED # Cor (Simples)** | Define LED individual por nome de cor | Índice, Cor |

---

## Áudio

### Buzzer / Altifalante

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Tom Buzzer** | Reproduz tom | Pino, Nota (Dó-Si/Hz personalizado), Duração (ms) |
| **Parar Buzzer** | Para o som | Pino |
| **Reproduzir Melodia** | Reproduz melodia predefinida | Pino, Melodia (Início/Sucesso/Erro/Concluído) |

### DFPlayer Mini (Reprodução MP3)

**Ligação:** DFPlayer TX→ESP32 RX, DFPlayer RX (resistência 1kΩ)→ESP32 TX

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar DFPlayer** | Inicializa o DFPlayer Mini | Pino RX, Pino TX |
| **Reproduzir DFPlayer** | Reproduz a faixa especificada | Número da faixa (1–999) |
| **Pausar DFPlayer** | Pausa a reprodução | — |
| **Retomar DFPlayer** | Retoma a partir da pausa | — |
| **Parar DFPlayer** | Para a reprodução | — |
| **Volume DFPlayer** | Define o nível de volume | 0-30 (30 = máximo) |

---

## Comunicação

### WiFi

**Compatível:** Placas com WiFi (série ESP32 / Pico W)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **📶 Ligar WiFi** | Liga à rede WiFi | SSID, Palavra-passe |
| **WiFi Ligado** | Verifica o estado da ligação | → true/false |
| **Reconectar WiFi** | Tenta reconectar se desligado | — |
| **Endereço IP WiFi** | Obtém o endereço IP atual | → cadeia |
| **Sinal WiFi (RSSI)** | Obtém a intensidade do sinal (dBm) | → dBm |

### Cliente HTTP

**Requer:** Ligação WiFi

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **HTTP GET** | Envia pedido HTTP GET | URL → cadeia de resposta |
| **HTTP GET (com cabeçalhos)** | GET com cabeçalhos personalizados | URL, Nome/Valor do cabeçalho → resposta |
| **HTTP POST** | Envia pedido HTTP POST | URL, Corpo → resposta |
| **HTTP POST JSON** | Envia dados JSON via POST | URL, Cadeia JSON → resposta |
| **HTTP PUT** | Envia pedido HTTP PUT | URL, Corpo → resposta |
| **HTTP DELETE** | Envia pedido HTTP DELETE | URL → resposta |
| **Último Estado HTTP** | Obtém o último código de estado | → número |
| **Sucesso (2xx)?** | Verifica se a última resposta foi bem-sucedida | → true/false |
| **Codificar URL** | Codifica uma cadeia em formato URL | Cadeia → cadeia codificada |
| **Construir URL** | Constrói URL com parâmetros de consulta | URL base, Parâmetros |

### Cliente MQTT

**Requer:** Ligação WiFi. É necessário um broker MQTT separado (Mosquitto / Home Assistant etc.).

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Configurar MQTT** | Configura WiFi e broker MQTT | SSID/PW, Broker, Porta, ID do cliente |
| **Ligar ao Broker MQTT** | Liga ao broker | Utilizador/Palavra-passe (opcional) |
| **Publicar MQTT** | Publica mensagem no tópico | Tópico, Mensagem, Flag de retenção |
| **Subscrever MQTT** | Subscreve o tópico | Tópico |
| **MQTT Ao Receber Mensagem** | Trata a mensagem recebida | Handler (usa variáveis de tópico/mensagem recebidos) |
| **Loop MQTT** | Mantém a ligação MQTT (no loop) | — |
| **MQTT Ligado** | Verifica o estado da ligação | → true/false |
| **Desligar MQTT** | Desliga do broker | — |
| **Cancelar Subscrição MQTT** | Cancela a subscrição do tópico | Tópico |
| **Tamanho Buffer MQTT** | Define o tamanho do buffer de receção | Bytes |
| **Keepalive MQTT** | Define o intervalo de keepalive | Segundos |
| **Última Vontade MQTT** | Define a mensagem de última vontade | Tópico, Mensagem |
| **Ligar ao Broker MQTT (com LWT)** | Liga com última vontade | Utilizador/Palavra-passe |
| **Estado Ligação MQTT** | Obtém o código de estado da ligação | → número (-4 a 5) |
| **Publicar MQTT (QoS)** | Publica com configuração de QoS | Tópico, Mensagem, QoS (0/1/2) |

### JSON

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Analisar JSON** | Analisa a cadeia JSON | Cadeia JSON |
| **Analisar JSON (com tamanho)** | Analisa com tamanho de buffer | Cadeia JSON, Bytes do buffer |
| **Obter Cadeia JSON** | Obtém valor de cadeia por chave | Chave → cadeia |
| **Obter Número JSON** | Obtém valor numérico por chave | Chave → número |
| **Obter Inteiro JSON** | Obtém valor inteiro por chave | Chave → inteiro |
| **Obter Booleano JSON** | Obtém valor booleano por chave | Chave → true/false |
| **Obter JSON Aninhado** | Obtém valor aninhado por caminho | Caminho, Tipo → valor |
| **Tem Chave JSON?** | Verifica se a chave existe | Chave → true/false |
| **Tamanho Array JSON** | Obtém o número de elementos do array | Chave → número |
| **Obter Elemento Array JSON** | Obtém elemento do array | Chave, Índice, Tipo → valor |
| **Criar JSON** | Inicia a criação de um objeto JSON | — |
| **Definir Cadeia JSON** | Define valor de cadeia para chave | Chave, Valor |
| **Definir Número JSON** | Define valor numérico para chave | Chave, Valor |
| **Definir Booleano JSON** | Define valor booleano para chave | Chave, Valor |
| **JSON para Cadeia** | Converte JSON para cadeia | → cadeia |
| **JSON para Cadeia (Formatado)** | Converte JSON para cadeia formatada | → cadeia |
| **JSON Simples** | Constrói JSON a partir de 2 pares chave/valor | Chave1/Valor1, Chave2/Valor2 → cadeia JSON |

### Integração com Home Assistant (HA)

> Os blocos HA requerem um broker MQTT e Home Assistant já configurados. Configure primeiro a ligação usando os blocos MQTT.

**Registo do Dispositivo:**

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Dispositivo HA** | Inicializa como dispositivo HA | Broker, Nome do dispositivo, ID do dispositivo |
| **Inicializar Dispositivo HA (com auth)** | Inicializa com autenticação | Broker, Nome, ID, Utilizador/Palavra-passe |
| **Loop HA** | Mantém a ligação HA (no loop) | — |
| **HA Ligado** | Verifica a ligação HA | → true/false |
| **Intervalo de Relatório HA** | Executa handler a cada N segundos | Segundos, Handler |

**Tipos de entidade:**

| Tipo de Entidade | Bloco de Criação | Comando / Relatório |
|------------------|------------------|---------------------|
| **Sensor** | Criar Sensor HA (Temperatura/Humidade etc.) | Atualizar Sensor HA |
| **Sensor Binário** | Criar Sensor Binário HA (Movimento/Porta etc.) | Atualizar Sensor Binário HA |
| **Interruptor** | Criar Interruptor HA | Interruptor HA Ao Receber Comando / Reportar Estado |
| **Luz (ON/OFF)** | Criar Luz HA | Luz HA Ao Alterar Estado / Reportar Estado |
| **Luz (RGB)** | Criar Luz HA (RGB) | Luz HA Ao Alterar RGB / Reportar RGB |
| **Botão** | Criar Botão HA | Botão HA Ao Pressionar |
| **Número Deslizante** | Criar Número HA (mín/máx/passo) | Número HA Ao Alterar / Definir Número HA |
| **Ventilador** | Criar Ventilador HA | Ventilador HA Ao Alterar Estado / ON/OFF |
| **Cobertura** | Criar Cobertura HA (Persiana/Cortina etc.) | Cobertura HA Ao Receber Comando / Definir Estado |
| **Acionador** | Criar Acionador HA | Disparar HA |
| **Cena** | Criar Cena HA | Cena HA Ao Executar |
| **Scanner de Etiquetas** | Criar Scanner de Etiquetas HA | Digitalizar Etiqueta HA |

### OTA (Atualização de Firmware por Via Aérea)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Configurar OTA** | Configura OTA | Nome do host, Palavra-passe OTA (opcional) |
| **Configurar OTA Simples** | Ativa OTA com configuração mínima | — |
| **Loop OTA** | Trata pedidos OTA (no loop) | — |
| **Nome do Host OTA** | Obtém o nome do host OTA | → cadeia |

### BLE (Bluetooth de Baixa Energia)

**Compatível:** Apenas ESP32 (Pico W não suporta BLE) / **Biblioteca:** NimBLE-Arduino (pré-instalada)

**Nordic UART Service (NUS) — comunicação série com smartphone:**

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Configurar BLE UART** | Inicia o serviço NUS | Nome do dispositivo |
| **Enviar BLE** | Envia cadeia para o telemóvel | Texto |
| **BLE Ao Receber** | Trata dados recebidos (use o bloco BLE Recebido dentro do handler) | Handler |
| **BLE Recebido** | Obtém o texto recebido (uso dentro do handler) | → String |
| **BLE Ligado?** | Verifica o estado da ligação | → true/false |
| **Desligar BLE** | Desliga e reinicia a publicidade | — |

**Servidor GATT Personalizado:**

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar BLE** | Inicializa a pilha BLE | Nome do dispositivo |
| **Adicionar Serviço GATT** | Cria serviço GATT personalizado | UUID do serviço |
| **Adicionar Característica** | Adiciona característica | UUID de serviço, UUID de característica, ler/escrever/notificar |
| **Notificação BLE** | Envia notificação via característica | UUID de característica, Valor |
| **BLE Ao Escrever** | Trata escrita na característica (use o bloco BLE Recebido dentro do handler) | UUID de característica, Handler |
| **Iniciar Publicidade BLE** | Inicia a publicidade BLE | — |

**iBeacon e Varrimento:**

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Transmitir iBeacon** | Transmite como iBeacon | UUID, Major, Minor |
| **Iniciar Varrimento BLE** | Varre dispositivos BLE próximos | Duração (seg) |
| **BLE Ao Encontrar Dispositivo** | Trata dispositivo descoberto (use os blocos BLE Nome / Endereço / RSSI Pesquisa dentro do handler) | Handler |
| **BLE Nome Pesquisa** | Obtém o nome do dispositivo detetado (usar dentro do handler) | → String |
| **BLE Endereço Pesquisa** | Obtém o endereço MAC detetado (usar dentro do handler) | → String |
| **BLE RSSI Pesquisa** | Obtém o RSSI detetado (dBm, negativo; mais perto de 0 = mais forte) | → Number |
| **RSSI BLE** | Obtém a intensidade do sinal do dispositivo ligado | → dBm |

### Cliente WebSocket

**Requer:** Ligação WiFi

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Ligar WebSocket** | Liga ao servidor WebSocket | Host, Porta, Caminho → true/false |
| **Enviar WebSocket** | Envia mensagem de texto | Texto |
| **WebSocket Ao Receber Mensagem** | Trata dados recebidos (variável wsMessage) | Handler |
| **WebSocket Ligado?** | Verifica o estado da ligação | → true/false |
| **Desligar WebSocket** | Fecha a ligação | — |

### UART2/3 (Série 2/3)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Serial2** | Inicializa Serial2 (UART2) | Velocidade em baud, Pino RX, Pino TX (padrão: RX=16, TX=17) |
| **Imprimir Serial2** | Envia dados (sem nova linha) | Dados |
| **Imprimir Serial2 (com nova linha)** | Envia dados com nova linha | Dados |
| **Ler Serial2** | Lê 1 byte | → número (-1 = sem dados) |
| **Ler Serial2 Até** | Lê até ao carácter terminador | Terminador → cadeia |
| **Disponível Serial2** | Obtém bytes disponíveis no buffer de receção | → número |

### Controlo Remoto IR

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Recetor IR** | Inicializa o recetor IR | Pino |
| **Código Recebido IR** | Obtém o código IR recebido (cadeia hex) | → cadeia ("0" sem sinal) |
| **Inicializar Emissor IR** | Inicializa o LED emissor IR | Pino |
| **Enviar IR** | Envia sinal IR | Protocolo, Código (hex) |

### RFID (MFRC522 / M5Stack RFID2 Unit)

> **Regulamentos de Rádio:** No Japão, usar um MFRC522 sem certificação pode violar a Lei de Rádio. Para uso no Japão, recomenda-se a **M5Stack RFID 2 Unit** (certificada).

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar RFID (M5Stack)** | Inicializa M5Stack RFID 2 Unit via I2C (certificado) | — |
| **⚠️ Inicializar RFID (Genérico)** | Inicializa MFRC522 genérico via SPI (verificar certificação) | Pino CS, Pino RST |
| **Cartão RFID Presente?** | Deteta cartão/etiqueta | → true/false |
| **Ler UID RFID** | Obtém o UID do cartão (cadeia hex) | → ex. "04:A3:B5:C9" |
| **Ler Dados RFID** | Lê 16 bytes do bloco (0-63) | Número do bloco → cadeia |
| **Escrever Dados RFID** | Escreve até 16 caracteres no bloco | Número do bloco, Dados → true/false |

### CAN Bus (ESP32-TWAI)

**Compatível:** Apenas ESP32 (controlador TWAI integrado) / Requer IC transcetor CAN externo (ex. SN65HVD230)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar CAN** | Inicializa o bus CAN | Pino TX, Pino RX, Velocidade em baud → true/false |
| **Enviar CAN** | Envia mensagem CAN | ID (inteiro), Dados (cadeia máx 8 bytes) |
| **Mensagem CAN Disponível?** | Verifica se há nova mensagem CAN | → true/false |
| **ID Recebido CAN** | Obtém o ID da última mensagem recebida | → número |
| **Dados Recebidos CAN** | Obtém os dados da última mensagem recebida | → cadeia |

### I2C / SPI Baixo Nível

Para acesso direto a dispositivos não cobertos pelos blocos de sensores de alto nível.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **🔍 Varrer I2C** | Imprime todos os endereços de dispositivos I2C na Série | — |
| **📡 Escrever I2C** | Escreve bytes no dispositivo I2C | Endereço, Dados |
| **📡 Ler I2C** | Lê bytes do dispositivo I2C | Endereço, Número de bytes → valor |
| **📡 Escrever Registo I2C** | Escreve no registo do dispositivo | Endereço, Registo, Valor |
| **📡 Ler Registo I2C** | Lê do registo do dispositivo | Endereço, Registo → valor |
| **🔌 Inicializar SPI** | Inicializa SPI com pino CS | Pinos SCK/MOSI/MISO/CS |
| **🔌 Transferir SPI** | Envia e recebe 1 byte via SPI | Dados → byte de resposta |

---

## Armazenamento

### NVS / Preferences (Armazenamento Chave-Valor)

Armazena dados persistentemente na memória flash do ESP32. Os dados sobrevivem a reinícios.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Abrir Preferences** | Abre o espaço de nomes | Espaço de nomes, Flag de só leitura |
| **Fechar Preferences** | Fecha e liberta recursos | — |
| **Guardar Preferences** | Guarda valor por chave (int/float/string) | Chave, Valor |
| **Ler Preferences** | Recupera valor por chave | Chave, Valor padrão → valor |
| **Eliminar Preferences** | Elimina uma chave | Chave |
| **Limpar Preferences** | Elimina todas as chaves no espaço de nomes | — |

### EEPROM (Armazenamento Endereço-Valor)

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Escrever EEPROM** | Escreve 1 byte no endereço | Endereço, Valor (0-255) |
| **Ler EEPROM** | Lê 1 byte do endereço | Endereço → valor |

### Cartão SD

**Ligação:** SPI (especifica pino CS) / Formato FAT32 recomendado

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar SD** | Inicializa o cartão SD | Pino CS → true/false |
| **Escrever SD** | Escreve no ficheiro | Nome do ficheiro, Conteúdo, Adicionar/Sobrescrever |
| **Ler SD** | Lê o conteúdo do ficheiro | Nome do ficheiro → cadeia |
| **Existe SD?** | Verifica se o ficheiro/diretório existe | Caminho → true/false |
| **Eliminar SD** | Elimina o ficheiro | Nome do ficheiro |
| **Adicionar CSV SD** | Adiciona uma linha de dados CSV | Nome do ficheiro, Col1/Col2/Col3 |

### LittleFS (Flash Integrada do ESP32)

Usa a memória flash integrada do ESP32 como sistema de ficheiros — sem hardware adicional necessário.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Montar LittleFS** | Monta LittleFS (inicializa) | — |
| **Escrever LittleFS** | Escreve no ficheiro | Nome do ficheiro, Conteúdo |
| **Ler LittleFS** | Lê o conteúdo do ficheiro | Nome do ficheiro → cadeia |
| **Existe LittleFS?** | Verifica se o ficheiro existe | Caminho → true/false |
| **Eliminar LittleFS** | Elimina o ficheiro | Nome do ficheiro |

---

## Câmara

Captura imagens estáticas, envia via HTTP e transmite vídeo MJPEG.

**Modelos compatíveis:**
- **ESP32-CAM** (AI-Thinker)
- **XIAO ESP32S3 Sense** (Seeed Studio)
- **M5Camera** (M5Stack — Unit Cam / Unit Cam S3 / Timer Cam)

**Requer:** Ligação WiFi para transmissão e envio HTTP

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Câmara** | Inicializa a câmara (configuração automática de pinos) | Modelo de placa → true/false |
| **Capturar Câmara** | Tira foto para o buffer interno | → true/false (chamar bloco de guardar/enviar a seguir) |
| **Guardar Câmara em SD** | Guarda imagem capturada como JPEG no SD | → true/false (SD deve estar inicializado) |
| **Enviar Câmara HTTP** | Envia imagem capturada via HTTP POST | → true/false (WiFi necessário) |
| **Iniciar Stream Câmara** | Inicia o servidor de stream MJPEG | Porta (acede em http://\<IP\>:\<Porta\>/stream) |

---

## Robô

### Humanoid (Bípede)

Controla um robô bípede com 4 servos.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Humanoid** | Inicializa Humanoid | Pinos perna esq/dir/tornozelo esq/dir |
| **Posição Inicial Humanoid** | Regressa à posição de pé | — |
| **Humanoid Andar** | Anda para a frente/trás | Passos, Direção, Velocidade |
| **Humanoid Virar** | Roda esquerda/direita | Contagem, Direção, Velocidade |
| **Humanoid Saltar** | Movimento de salto | Contagem, Velocidade |
| **Humanoid Dançar** | Movimento de dança | Contagem, Velocidade |
| **Humanoid Balançar** | Balança esquerda e direita | Contagem, Velocidade |
| **Humanoid Inclinar** | Inclina esquerda/direita | Contagem, Velocidade |
| **Humanoid Moonwalk** | Movimento moonwalk | Contagem, Velocidade |
| **Humanoid Gesto** | Exprime emoção com movimento e som | Tipo de gesto (Feliz/Triste/Zangado etc.) |
| **Humanoid Som** | Reproduz efeito de som | Tipo de som (Início/Botão etc.) |
| **Humanoid Crusaito** | Anda com pernas cruzadas | Contagem, Velocidade |
| **Humanoid Bater Asas** | Movimento tipo bater de asas | Contagem, Velocidade |
| **Humanoid Balanço em Bicos dos Pés** | Balança em bicos dos pés | Contagem, Velocidade |
| **Humanoid Tremor** | Movimento de tremor | Contagem, Velocidade |
| **Humanoid Rotação Ascendente** | Sobe e roda | Contagem, Velocidade |
| **Humanoid Sacudir Perna** | Sacode a perna | Contagem, Velocidade |
| **Humanoid Cima Baixo** | Movimento cima-baixo | Contagem, Velocidade |

### Robô Wheel (Rodas)

Controla um robô de 2 rodas com servos de rotação contínua.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Wheel** | Inicializa o robô de rodas | Pinos roda esquerda/direita |
| **Wheel Avançar** | Avança | Velocidade (Normal/Rápida/Lenta) |
| **Wheel Recuar** | Recua | Velocidade |
| **Wheel Virar Esquerda** | Vira à esquerda | Velocidade |
| **Wheel Virar Direita** | Vira à direita | Velocidade |
| **Wheel Rodar Esquerda** | Roda no lugar para a esquerda | Velocidade |
| **Wheel Rodar Direita** | Roda no lugar para a direita | Velocidade |
| **Wheel Parar** | Para | — |

### Transform (Ninja)

Controla um robô transformável entre os modos Walk (quadrúpede) e Roll (tração de rodas).

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Transform** | Inicializa Ninja | Configuração de pinos (a partir do preset) |
| **Modo Ninja** | Muda apenas o modo (Walk/Roll) | Seleção de modo |
| **Transformar Ninja** | Transforma fisicamente | Walk↔Roll |
| **Alinhar Ninja** | Ajusta ângulos do servo | — |
| **Calibrar Ninja** | Ajusta o desvio esquerda/direita | — |
| **Início Ninja** | Regressa à posição vertical | — |
| **Andar Ninja** | Anda no modo Walk | Direção, Velocidade, Contagem |
| **Andar Ninja (Potência)** | Anda com percentagem de potência | Direção, Velocidade (%), Contagem |
| **Rolar Ninja** | Rola no modo Roll | Direção, Velocidade, Duração |
| **Rolar Ninja (Potência)** | Rola com percentagem de potência | Direção, Velocidade (%) |
| **Rodar Ninja (Roll)** | Roda no modo Roll | Direção, Velocidade |
| **Virar Ninja (Walk)** | Roda no modo Walk | Direção, Velocidade |
| **Parar Ninja** | Para o modo especificado | Modo |
| **Trotar Ninja** | Anda rapidamente | Direção, Velocidade |
| **Flexões Ninja** | Movimento de flexões | Contagem, Velocidade |
| **Lateral Ninja** | Move lateralmente | Direção, Velocidade |
| **Dançar Ninja** | Dança | Velocidade |

### Controlo PID

Controlador PID para seguimento de linha, controlo de paredes, controlo de velocidade e mais.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Controlo PID** | Cria o controlador PID | Nome, Propósito (Linha/Parede/Velocidade/Ângulo) |
| **PID** | Calcula a saída a partir do erro | Erro → saída |
| **Definir Ganhos** | Define Kp/Ki/Kd | Kp, Ki, Kd |
| **Reiniciar** | Reinicia o integrador e estado | — |
| **Calcular PID Seguimento Linha** | Calcula velocidades do motor a partir da posição do sensor | Velocidade base, Posição linha → Vel. esq/dir |
| **Calcular Velocidade Motor PID (Esq)** | Calcula velocidade do motor esquerdo | Velocidade base, Erro PID → velocidade |
| **Calcular Velocidade Motor PID (Dir)** | Calcula velocidade do motor direito | Velocidade base, Erro PID → velocidade |
| **Velocidade Motor Calculada PID** | Obtém a velocidade calculada | Esquerda/Direita → velocidade |

### Tração Diferencial (Differential Drive)

Blocos de controlo de alto nível para robô de tração diferencial usando dois drivers L298N.

| Nome do Bloco | Descrição | Parâmetros |
|---------------|-----------|------------|
| **Inicializar Tração Diferencial** | Inicializa o robô | Pinos Motor Esq/Dir IN1, Largura de via (mm) |
| **Definir Velocidade** | Define velocidades individuais da roda | Velocidade esquerda, Velocidade direita |
| **Avançar** | Avança | Velocidade |
| **Recuar** | Recua | Velocidade |
| **Parar** | Para (inércia) | — |
| **Travar** | Paragem brusca | — |
| **Libertar** | Liberta os motores | — |
| **Rodar no Lugar** | Roda no lugar | Direção, Velocidade |
| **Curva** | Curva com controlo de curvatura | Velocidade, Curvatura (0-100%) |
| **Avançar Distância** | Avança uma distância específica | Distância (mm), Velocidade |
| **Rodar** | Roda um ângulo específico | Ângulo (graus), Direção |
| **Seguir Linha** | Seguimento de linha com correção PID | Velocidade base, Erro sensor, Correção PID |
| **Velocidade Atual** | Obtém a velocidade atual da roda | Esquerda/Direita → mm/s |

---

## Placas Compatíveis

DigiCode é um editor de programação por blocos centrado no ESP32. Os blocos são mostrados ou ocultados automaticamente com base nas capacidades da placa selecionada.

| Flag | Significado | Placas de exemplo |
|------|-------------|-------------------|
| `supportsWifi` | Os blocos WiFi, HTTP, MQTT e HA estão disponíveis | Toda a série ESP32, Pico W, Nano RP2040 Connect |
| `supportsOta` | O carregamento de firmware WiFi OTA (DigiCode OTA) está disponível | Série ESP32 (não RP2040) |
| `supportsBle` | Os blocos BLE (NimBLE) estão disponíveis | Apenas série ESP32 (não Pico W) |

> **Nota:** O Pico W suporta WiFi mas não BLE. Os blocos de RFID, CAN e Câmara são apenas para ESP32.

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md)
- [Guia de Ligação de Hardware](./hardware-setup.md)
- [Resolução de Problemas](./troubleshooting.md)
- [Hardware Recomendado](./recommended-hardware.md)
