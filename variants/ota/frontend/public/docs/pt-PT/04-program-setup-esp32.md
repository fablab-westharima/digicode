# Carregamento de Programas — Série ESP32

**Última atualização:** 2026-04-21

---

## Placas Compatíveis

| Placa | USB | WiFi OTA | BLE | Notas |
|-------|:---:|:--------:|:---:|-------|
| ESP32 | ○ | ○ | ○ | O mais comum |
| ESP32-S3 | ○ | ○ | ○ | Alto desempenho, expansão AI |
| ESP32-C3 | ○ | ○ | ○ | RISC-V, baixo consumo |
| ESP32-C6 | ○ | ○ | ○ | Suporte Matter |
| M5Stack Basic/Gray/Fire | ○ | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | ○ | Compacto |
| ATOM Lite / Matrix | ○ | ○ | ○ | Ultra-compacto |
| M5Stamp Pico | ○ | ○ | ○ | — |
| M5Stamp C3/C3U | ○ | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | ○ | Placa recomendada DigiCode (placa de expansão dedicada em desenvolvimento) |
| XIAO ESP32C3 | ○ | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | ○ | Suporte câmara |
| XIAO ESP32C6 | ○ | ○ | ○ | — |

> **Não compatível:** ESP8266 não é suportado pelo DigiCode.

---

## Terminologia

| Termo | Descrição |
|-------|-----------|
| **Carregamento de Programa** | Carregar o programa criado no editor de blocos (cada vez) |
| **Carregamento de Firmware** | Carregar software base para WiFi OTA / BLE (**apenas primeira vez, apenas se usares WiFi OTA / BLE**) |

Ver [Passos Comuns](./01-program-setup-common.md) para mais detalhes.

---

## Método 1: Carregamento Direto USB (Básico · Recomendado)

O método de carregamento mais fiável. Adequado para principiantes e resolução de problemas.

### Pré-requisitos

- Cabo USB (compatível com dados)
- Controlador USB (CP2102 ou CH340)

### Instalar Controlador USB

Se o ESP32 não for reconhecido, instala o controlador.

**Placas CP2102 (muitos ESP32-DevKitC, M5StampS3A, etc.):**
- https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

**Placas CH340 (muitas placas ESP32 genéricas):**
- http://www.wch.cn/downloads/CH341SER_ZIP.html

### Passos

1. Ligar o ESP32 ao PC com cabo USB
2. Criar o teu programa no editor de blocos
3. Clicar em **"Carregar"** → selecionar **"USB"**
4. Selecionar a porta ESP32 no diálogo de porta série do navegador
5. O carregamento começa (~30 seg) → reinicia automaticamente após conclusão

### Resolução de Problemas

| Sintoma | Solução |
|---------|---------|
| Porta não mostrada | Instalar controlador USB |
| Carregamento falhado | Manter BOOT pressionado ao iniciar carregamento |
| Erro de tempo limite | Tentar outra porta USB ou cabo |

---

## Método 2: WiFi OTA (Opcional)

Método de carregamento sem cabo mais rápido. Requer configuração inicial.

### Pré-requisitos

- **Firmware carregado** (uma vez via USB)
- WiFi configurado (SSID/palavra-passe)
- DigiCode Finder (aplicação de secretária)

### Passos

1. Abrir DigiCode Finder, dispositivo detetado automaticamente
2. Clicar em "Selecionar" no dispositivo alvo para copiar IP
3. Clicar em "Carregar" → "WiFi OTA" → colar endereço IP
4. O carregamento começa (~15 seg)

→ Detalhes de configuração: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Método 3: BLE (Opcional)

Carregamento via Bluetooth. Útil para atualizar dispositivos em caixas ou locais sem WiFi.

### Pré-requisitos

- **Firmware carregado** (uma vez via USB)
- Navegador compatível com Web Bluetooth (Chrome, Edge)

### Placas compatíveis

Todas as placas ESP32 com BLE (supportsBle: true).

### Passos

1. Criar o teu programa
2. Clicar em "Carregar" → selecionar "BLE"
3. Clicar em "Procurar dispositivos", começa a procura Bluetooth
4. Selecionar "DigiCode-XXXXXX" e emparelhar
5. O carregamento começa (~40 seg)

→ Detalhes de configuração: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Método 4: Servidor de Compilação Local (Opção de aceleração)

Compilar no teu próprio PC, sem consumir quota da nuvem e mais rápido.

→ Detalhes: [Servidor de Compilação Local](./local-compile-server.md)

---

## Carregamento Inicial de Firmware (Apenas para utilizadores de WiFi OTA / BLE)

Necessário apenas uma vez para usar WiFi OTA ou BLE.

### Passos

1. Clicar em **"Carregamento de Firmware"** no menu esquerdo
2. Ligar o ESP32 com cabo USB
3. Clicar em "INSTALL"
4. Selecionar porta série
5. Aguardar conclusão (~1 min)

### Configuração WiFi (para WiFi OTA)

Após carregamento de firmware, para usar WiFi OTA:

1. Clicar em "Configuração WiFi"
2. Selecionar e ligar à porta série
3. Inserir SSID e palavra-passe
4. Clicar em "Teste de Ligação"
5. Após sucesso, mostra endereço IP fixo

---

## Monitor Série

Útil para depurar o teu programa.

1. Ligar o ESP32 via USB
2. Clicar em "Monitor Série" na barra lateral
3. Selecionar porta e clicar em "Ligar"
4. Velocidade em baud: 115200

---

## Como Escolher o Método de Carregamento

| Situação | Recomendado |
|----------|-------------|
| Principiante / desenvolvimento habitual | **USB** (mais fiável) |
| WiFi OTA já configurado | WiFi OTA (mais rápido) |
| Sem ambiente WiFi | USB ou BLE |
| Dispositivo em caixa | BLE ou WiFi OTA |
| Atualização em massa na turma | WiFi OTA |
| Poupar quota de compilação | Servidor de compilação local |
| Resolução de problemas / recuperação | **USB** (mais fiável) |

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|---------|
| [Passos Comuns](./01-program-setup-common.md) | Terminologia, resumo de métodos |
| [Guia de Configuração OTA](./05-ota-guide.md) | Detalhes de WiFi OTA / BLE |
| [Servidor de Compilação Local](./local-compile-server.md) | Compilar no teu próprio PC |
| [Resolução de Problemas](./troubleshooting.md) | Guia de resolução de problemas |
| [Guia de Configuração de Hardware](./hardware-setup.md) | Ligação de sensores e motores |
