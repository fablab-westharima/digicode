# Referência de Blocos

Lista completa de blocos disponíveis no DigiCode.

## Blocos Básicos

### Estrutura do Programa

| Bloco | Descrição |
|-------|-----------|
| **Setup** | Executado uma vez no início |
| **Loop** | Processamento principal repetido |

### E/S Digital

| Bloco | Descrição |
|-------|-----------|
| **Configurar Modo Pino** | Configura entrada/saída |
| **Escrita Digital** | Saída HIGH/LOW |
| **Leitura Digital** | Ler estado do pino |
| **LED Interno ON/OFF** | Controlar LED integrado |

### E/S Analógica

| Bloco | Descrição |
|-------|-----------|
| **Leitura Analógica** | Ler valor (0-4095) |
| **Saída PWM** | Saída PWM (0-255) |

---

## Sensores

### Sensor Ultrassónico (HC-SR04)

| Bloco | Descrição |
|-------|-----------|
| **Inicializar HC-SR04** | Configurar pinos |
| **Distância (cm)** | Medir distância |

### Sensor Temperatura/Humidade (DHT)

| Bloco | Descrição |
|-------|-----------|
| **Inicializar DHT** | Configurar tipo e pino |
| **Temperatura** | Obter temperatura |
| **Humidade** | Obter humidade |

---

## Atuadores

### Servomotor

| Bloco | Descrição |
|-------|-----------|
| **Conectar Servo** | Ligar a pino |
| **Ângulo Servo** | Definir ângulo (0-180°) |
| **Desconectar Servo** | Desligar |

---

## Robot OTTO

| Bloco | Descrição |
|-------|-----------|
| **Inicializar OTTO** | Configurar pinos |
| **Posição Inicial** | Postura de pé |
| **Andar** | Andar frente/trás |
| **Virar** | Virar esquerda/direita |

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md)
- [Configuração de Hardware](./hardware-setup.md)
