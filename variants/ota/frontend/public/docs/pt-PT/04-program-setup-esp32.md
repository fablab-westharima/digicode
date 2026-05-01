# Carregamento de Programas — Série ESP32

**Última atualização:** 2026-05-02

Esta página resume os procedimentos de carregamento para placas da série ESP32 (USB / WiFi OTA / BLE / Compilação Local) por método.

---

## 🚀 Carregamento USB — 5 Passos

O mais fiável, recomendado para principiantes. Feito em ~30 segundos.

1. **Liga o ESP32 ao PC com cabo USB (compatível com dados)**
2. Constrói o teu programa no editor de blocos (ou carrega um exemplo)
3. Botão **"Carregar"** no canto superior direito → escolhe **"USB"**
4. Seleciona a porta do ESP32 no diálogo de porta série do navegador
5. Após a conclusão do carregamento, o ESP32 reinicia automaticamente ✅

> 💡 **Se nenhuma porta aparecer, instala o controlador USB (CP2102 / CH340) e reinicia** ([detalhes](#instalar-controlador-usb)).

---

## Placas Compatíveis

| Placa | USB | WiFi OTA | BLE | Notas |
|---|:---:|:---:|:---:|---|
| ESP32 | ○ | ○ | ○ | O mais comum |
| ESP32-S3 | ○ | ○ | ○ | Alto desempenho, expansão AI |
| ESP32-C3 | ○ | ○ | ○ | RISC-V, baixo consumo |
| ESP32-C6 | ○ | ○ | ○ | Suporte Matter |
| M5Stack Basic / Gray / Fire | ○ | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | ○ | Compacto |
| ATOM Lite / Matrix | ○ | ○ | ○ | Ultra-compacto |
| M5Stamp Pico | ○ | ○ | ○ | — |
| M5Stamp C3 / C3U | ○ | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | ○ | Placa recomendada DigiCode (placa de expansão dedicada em desenvolvimento) |
| XIAO ESP32C3 | ○ | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | ○ | Suporte câmara |
| XIAO ESP32C6 | ○ | ○ | ○ | — |

> **Não compatível:** ESP8266 não é suportado pelo DigiCode.

---

## 4 Métodos de Carregamento — Comparação Rápida

| Método | Velocidade | Pré-requisitos | Notas |
|---|---|---|---|
| **🥇 USB Direto** | ~30 seg | Controlador USB | Mais fiável |
| **🥈 WiFi OTA** | ~15 seg | FW + configuração WiFi (primeira vez via USB) | Mais rápido, atualização em massa OK |
| **🥉 BLE** | ~40 seg | FW (primeira vez via USB) | Sem WiFi necessário |
| **⚡ Compilação Local** | (combinável) | Docker | Poupa quota da nuvem |

---

## Método 1: Carregamento Direto USB (Básico · Recomendado)

### Instalar Controlador USB

Se o ESP32 não for reconhecido (nenhum dispositivo no diálogo de portas), instala um controlador USB.

| Chip | Placas de exemplo | Descarregar |
|---|---|---|
| **CP2102** | ESP32-DevKitC, M5StampS3A, a maioria de M5Stack | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Muitas placas ESP32 genéricas | http://www.wch.cn/downloads/CH341SER_ZIP.html |

Após instalar, **reinicia o PC**.

### Resolução de Problemas

| Sintoma | Solução |
|---|---|
| A porta não aparece | Instalar controlador USB + reiniciar, verificar se o cabo USB suporta dados |
| Carregamento falhado | Manter BOOT / BOOTSTRAP pressionado ao iniciar carregamento |
| Erro de tempo limite | Tentar outra porta USB / cabo |

---

## Método 2: WiFi OTA (Opcional)

Sem cabo, carregamento mais rápido. Suporta atualização em massa de vários dispositivos.

### Pré-requisitos

- **Firmware carregado** (uma vez via USB, [detalhes](#carregamento-inicial-de-firmware))
- WiFi configurado (SSID / palavra-passe)
- Router WiFi (mesma LAN que o ESP32)
- (Apenas em Windows sem Bonjour) [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) — alternativa mDNS. Não necessário em Mac / Linux (mDNS nativo).

### Passos

1. Abre o DigiCode no navegador (ou usa o DigiCode Finder para obter o IP)
2. **"Carregar"** → **"WiFi OTA"**
3. (Quando a auto-deteção mDNS funciona, escolhe da lista de dispositivos / caso contrário, insere o IP)
4. O carregamento começa (~15 seg)

> ⚠️ **Apenas utilizadores avançados de Windows**: a configuração de WiFi OTA tem múltiplos pré-requisitos e é difícil para principiantes em Windows. Prefere USB / BLE. Ver [Servidor de Compilação Local § Windows](./local-compile-server.md#-antes-de-mais-recomendação-e-pré-requisitos).

→ Detalhes de configuração: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Método 3: BLE (Opcional)

Carregamento via Bluetooth. Útil para dispositivos em caixas e locais sem WiFi.

### Pré-requisitos

- **Firmware carregado** (uma vez via USB)
- Navegador compatível com Web Bluetooth (Chrome / Edge)
- Placas compatíveis: ESP32 com BLE (`supportsBle: true`)

### Passos

1. Constrói o teu programa no editor de blocos
2. **"Carregar"** → **"BLE"**
3. **"Procurar dispositivos"** → começa a procura Bluetooth
4. Seleciona **"DigiCode-XXXXXX"** e emparelha
5. O carregamento começa (~40 seg)

→ Detalhes de configuração: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Método 4: Servidor de Compilação Local (Opção de aceleração)

Compila no teu próprio PC — sem quota de nuvem usada, builds mais rápidos. Ortogonal ao método de carregamento (USB / WiFi OTA / BLE), combinável com qualquer. Cache HIT em ~1 ms.

→ Detalhes: [Servidor de Compilação Local](./local-compile-server.md)

---

## Detalhes e Conceitos

### Terminologia

| Termo | Descrição |
|---|---|
| **Carregamento de Programa** | Carregar o programa construído no editor de blocos (cada vez) |
| **Carregamento de Firmware** | Carregar software base para WiFi OTA / BLE (**apenas primeira vez, apenas se usares WiFi OTA / BLE**) |

Para mais, ver [Passos Comuns § Terminologia](./01-program-setup-common.md#terminologia-carregamento-de-programa-vs-carregamento-de-firmware).

### Carregamento Inicial de Firmware

Se quiseres usar WiFi OTA ou BLE, realiza isto uma vez via USB.

1. Clica em **"Carregamento de Firmware"** no menu esquerdo
2. Liga o ESP32 ao PC com cabo USB
3. Clica em **"INSTALL"**
4. Seleciona porta série
5. Aguarda conclusão (~1 min)

### Configuração WiFi (para WiFi OTA)

Após carregamento de firmware, para usar WiFi OTA:

1. Clica em **"Configuração WiFi"**
2. Seleciona e liga à porta série
3. Insere SSID e palavra-passe
4. Clica em **"Teste de Ligação"**
5. Após sucesso, mostra endereço IP fixo

### Monitor Série para Depuração

Útil para depurar o teu programa.

1. Liga o ESP32 via USB
2. Clica em **"Monitor Série"** na barra lateral
3. Seleciona a porta e clica em **"Ligar"**
4. Velocidade em baud: **115200**

---

## Como Escolher o Método de Carregamento

| Situação | Recomendado |
|---|---|
| Principiante / desenvolvimento habitual | **🥇 USB** (mais fiável) |
| WiFi OTA já configurado | 🥈 **WiFi OTA** (mais rápido) |
| Sem ambiente WiFi | USB ou BLE |
| Dispositivo em caixa | 🥉 BLE ou WiFi OTA |
| Atualização em massa na turma | WiFi OTA |
| Poupar quota de compilação | ⚡ Servidor de compilação local |
| Resolução de problemas / recuperação | **🥇 USB** (mais fiável) |

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md) — Tutorial de primeiro carregamento USB
- [Passos Comuns](./01-program-setup-common.md) — Terminologia, resumo de métodos
- [Guia de Configuração OTA](./05-ota-guide.md) — Detalhes de WiFi OTA / BLE
- [Servidor de Compilação Local](./local-compile-server.md) — Compilar no teu próprio PC
- [Resolução de Problemas](./troubleshooting.md) — Guia de resolução de problemas
- [Guia de Configuração de Hardware](./hardware-setup.md) — Ligação de sensores e motores
