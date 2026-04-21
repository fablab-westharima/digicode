# Carregamento de Programas — Passos Comuns

**Última atualização:** 2026-04-21

DigiCode é um ambiente de programação com blocos **exclusivo para ESP32**. Este documento define a terminologia e fornece um resumo dos métodos de carregamento.

---

## Terminologia

DigiCode distingue entre "Carregamento de Programa" e "Carregamento de Firmware".

### Carregamento de Programa (Operação normal)

Carregar o programa construído com o editor de blocos para o microcontrolador.

| Elemento | Conteúdo |
|----------|---------|
| **O que é carregado** | O programa que fizeste com blocos |
| **Método** | **USB** (básico) / WiFi OTA / BLE |
| **Frequência** | Quando quiseres (cada vez que mudares o programa) |
| **Localização UI** | Botão "Carregar" no editor |

### Carregamento de Firmware (Apenas para utilizadores de WiFi OTA / BLE)

Carregar o software base necessário para WiFi OTA ou BLE. **Não é necessário se usares apenas carregamento USB.**

| Elemento | Conteúdo |
|----------|---------|
| **O que é carregado** | Software base OTA (instruções base mínimas que controlam e executam diretamente o hardware) |
| **Método** | Apenas via USB |
| **Frequência** | Apenas na primeira vez ao usar WiFi OTA / BLE |
| **Localização UI** | "Carregamento de Firmware" no menu esquerdo |

---

## Placas Compatíveis

DigiCode é exclusivo para ESP32.

| Categoria | Placas de exemplo | USB | WiFi OTA | BLE |
|-----------|-----------------|:---:|:--------:|:---:|
| **ESP32 Genérico** | ESP32 / S3 / C3 / C6 | ○ | ○ | ○ |
| **M5Stack** | M5Stack Basic / M5StickC Plus / ATOM / M5Stamp etc. | ○ | ○ | ○ |
| **XIAO ESP32** | XIAO ESP32C3 / S3 / C6 | ○ | ○ | ○ |

> **Não compatíveis:** ESP8266, Arduino Uno/Nano e a série RP2040 estão fora do âmbito de suporte do DigiCode.

---

## 4 Métodos de Carregamento

### 1. Carregamento Direto USB (Básico · Recomendado)

| Elemento | Conteúdo |
|----------|---------|
| **Característica** | Mais fiável · funciona em qualquer ambiente |
| **Velocidade** | Rápido (~30 seg) |
| **Cabo** | Necessário |
| **Pré-requisitos** | Instalar controlador USB |
| **Placas compatíveis** | Todas as placas |

### 2. WiFi OTA (Opcional)

| Elemento | Conteúdo |
|----------|---------|
| **Característica** | Sem cabo · mais rápido · atualização em massa |
| **Velocidade** | Mais rápido (~15 seg) |
| **Cabo** | Não necessário |
| **Pré-requisitos** | Carregamento de firmware + configuração WiFi (apenas primeira vez) |
| **Placas compatíveis** | Série ESP32 (supportsOta: true) |
| **Necessário** | Router WiFi, DigiCode Finder |

### 3. BLE (Opcional)

| Elemento | Conteúdo |
|----------|---------|
| **Característica** | Sem cabo · sem WiFi |
| **Velocidade** | Médio (~40 seg) |
| **Cabo** | Não necessário |
| **Pré-requisitos** | Carregamento de firmware (apenas primeira vez) |
| **Placas compatíveis** | ESP32 com BLE (supportsBle: true) |
| **Necessário** | Navegador compatível com Web Bluetooth (Chrome, Edge) |

### 4. Servidor de Compilação Local (Opção de aceleração)

| Elemento | Conteúdo |
|----------|---------|
| **Característica** | Não consome quota de compilação na nuvem · uso offline |
| **Necessário** | Docker (ou OrbStack, Rancher Desktop, etc.) |
| **Plano recomendado** | Pro e superior |

→ Detalhes: [Servidor de Compilação Local](./local-compile-server.md)

---

## O Que Precisas

### Obrigatório
- Computador (Windows / Mac / Linux)
- Navegador web (Chrome, Edge recomendado)
- Placa ESP32 compatível
- Cabo USB (compatível com dados)
- Controlador USB (CP2102 ou CH340)

### Opcional
- **Para WiFi OTA:** Router WiFi, DigiCode Finder
- **Para BLE:** Navegador compatível com Web Bluetooth (Chrome, Edge)
- **Para compilação local:** Ambiente Docker

---

## Fluxo Básico de Carregamento (USB)

1. Ligar o ESP32 ao PC com cabo USB
2. Criar o teu programa no editor de blocos
3. Clicar em "Carregar" → selecionar "USB"
4. Selecionar porta série
5. Após a conclusão do carregamento, o ESP32 reinicia automaticamente e executa o programa

---

## Se Quiseres Usar WiFi OTA / BLE

É necessária apenas uma configuração inicial:

1. Ligar o ESP32 via USB
2. Ir a "**Carregamento de Firmware**" no menu esquerdo → clicar em "INSTALL"
3. (Apenas WiFi OTA) Configurar SSID e palavra-passe em "Configuração WiFi"
4. Depois podes carregar via WiFi OTA / BLE sem ligação USB

→ Detalhes: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Problemas Comuns e Soluções

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Porta não mostrada | Controlador USB não instalado | Instalar controlador CP2102 ou CH340 |
| Erro de carregamento | Cabo USB apenas de carregamento | Substituir por cabo compatível com dados |
| Tempo limite durante carregamento | Ligação instável | Tentar outra porta USB ou cabo |
| Não consegue entrar no modo BOOT | Procedimento específico da placa | Manter BOOT pressionado ao iniciar carregamento |
| Não detetado por WiFi OTA | WiFi não ligado ou FW não carregado | Verificar carregamento de firmware e configuração WiFi via USB |

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|---------|
| [Guia ESP32](./04-program-setup-esp32.md) | Detalhes de carregamento para ESP32 |
| [Guia de Configuração OTA](./05-ota-guide.md) | Configuração de WiFi OTA / BLE |
| [Servidor de Compilação Local](./local-compile-server.md) | Compilar no teu próprio PC |
