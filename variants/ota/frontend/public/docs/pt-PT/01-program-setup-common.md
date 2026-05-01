# Carregamento de Programas — Passos Comuns

**Última atualização:** 2026-05-02

DigiCode é um ambiente de programação com blocos **exclusivo para ESP32**. Este documento explica "que método de carregamento escolher" e a terminologia subjacente.

---

## 🚀 Que Método? — Decide em 30 Segundos

| A tua situação | Método recomendado |
|---|---|
| **Primeira vez** / **queres carregamento fiável e sem problemas** | 🥇 **USB Direto** ([detalhes](#1-carregamento-direto-usb-básico-recomendado)) |
| ESP32 está numa caixa / ligar USB de cada vez é incómodo / queres atualizar muitos dispositivos ao mesmo tempo | 🥈 **WiFi OTA** ([detalhes](./05-ota-guide.md)) |
| Sem WiFi disponível / configurar WiFi é demais | 🥉 **Carregamento BLE** ([detalhes](./05-ota-guide.md)) |
| Quota de compilação na nuvem esgotada / uso offline / aceleração | ⚡ **Compilação Local + qualquer dos anteriores** ([detalhes](./local-compile-server.md)) |

> 💡 **Em caso de dúvida, começa com USB Direto**. WiFi OTA / BLE são métodos opcionais que ficam disponíveis após um "carregamento de firmware" único via USB.

---

## 4 Métodos de Carregamento — Comparação

| Método | Velocidade | Cabo | Pré-requisitos | Placas compatíveis |
|---|---|---|---|---|
| **🥇 USB Direto** | ~30 seg | Necessário | Controlador USB | Todas as placas |
| **🥈 WiFi OTA** | ~15 seg (mais rápido) | Não necessário | Carregamento de firmware + configuração WiFi (apenas primeira vez) | Série ESP32 (`supportsOta: true`) |
| **🥉 BLE** | ~40 seg | Não necessário | Carregamento de firmware (apenas primeira vez) | ESP32 com BLE (`supportsBle: true`) |
| **⚡ Compilação Local** | (combinável; velocidade depende do método de carregamento, cache HIT ~1 ms) | — | Docker | Todas as placas (combinável) |

---

## Placas Compatíveis

DigiCode é **exclusivo para ESP32**.

| Categoria | Placas de exemplo | USB | WiFi OTA | BLE |
|---|---|:---:|:---:|:---:|
| **ESP32 Genérico** | ESP32 / S3 / C3 / C6 | ○ | ○ | ○ |
| **M5Stack** | M5Stack Basic / M5StickC Plus / ATOM / M5Stamp etc. | ○ | ○ | ○ |
| **XIAO ESP32** | XIAO ESP32C3 / S3 / C6 | ○ | ○ | ○ |

> **Não compatíveis:** ESP8266, Arduino Uno/Nano e a série RP2040 estão fora do âmbito.

---

## Fluxo Básico de Carregamento (USB)

1. **Liga o ESP32 ao PC com cabo USB**
2. Constrói o teu programa no editor de blocos (ou carrega um exemplo)
3. Botão **"Carregar"** no canto superior direito → escolhe **"USB"**
4. Seleciona a porta no diálogo de porta série do navegador
5. Após a conclusão do carregamento, o ESP32 reinicia automaticamente e executa o programa

📘 **Para o procedimento completo de primeira vez**, ver [Primeiros Passos](./getting-started.md) (instalação de controlador até exemplo de LED a piscar).

---

## Detalhes e Conceitos

### Terminologia: Carregamento de Programa vs Carregamento de Firmware

No DigiCode, "Carregamento de Programa" e "Carregamento de Firmware" são **operações distintas**.

#### Carregamento de Programa (operação normal)

Carregar o programa construído com o editor de blocos para o microcontrolador.

| Elemento | Conteúdo |
|---|---|
| **O que é carregado** | O programa que fizeste com blocos |
| **Método** | USB (básico) / WiFi OTA / BLE |
| **Frequência** | Quando quiseres (cada vez que mudares o programa) |
| **Localização UI** | Botão "Carregar" no editor |

#### Carregamento de Firmware (apenas ao usar WiFi OTA / BLE)

Carregar o software base (recetor OTA) necessário para WiFi OTA ou BLE. **Não é necessário se usares apenas USB.**

| Elemento | Conteúdo |
|---|---|
| **O que é carregado** | Software base OTA (instruções base mínimas para controlo de hardware) |
| **Método** | Apenas via USB |
| **Frequência** | Apenas na primeira vez ao usar WiFi OTA / BLE |
| **Localização UI** | "Carregamento de Firmware" no menu esquerdo |

### 4 Métodos de Carregamento — Detalhe

#### 1. Carregamento Direto USB (Básico · Recomendado)

Mais fiável, funciona em qualquer ambiente. Requer controlador USB (CP2102 / CH340) instalado previamente. Ver [Primeiros Passos](./getting-started.md) e [Guia ESP32](./04-program-setup-esp32.md).

#### 2. WiFi OTA (Opcional)

Sem cabo, mais rápido, suporta atualização em massa de vários dispositivos. Requer router WiFi. No Windows sem Bonjour, usa [DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder) como alternativa mDNS (Mac / Linux têm suporte mDNS nativo). Ver [Guia de Configuração OTA](./05-ota-guide.md).

> ⚠️ **Para utilizadores de Windows**: a configuração de WiFi OTA no Windows é para utilizadores avançados. Os principiantes devem preferir carregamento USB / BLE. Ver contexto em [Servidor de Compilação Local § Windows](./local-compile-server.md#-antes-de-mais-recomendação-e-pré-requisitos).

#### 3. Carregamento BLE (Opcional)

Sem cabo, sem WiFi necessário. Requer navegador compatível com Web Bluetooth (Chrome / Edge). Ver [Guia de Configuração OTA](./05-ota-guide.md).

#### 4. Servidor de Compilação Local (Opção de aceleração)

Não consome quota de compilação na nuvem, uso offline. Requer Docker (ou OrbStack / Rancher Desktop / Podman). Ortogonal ao método de carregamento (USB / WiFi OTA / BLE), combinável com qualquer. Ver [Servidor de Compilação Local](./local-compile-server.md).

### O Que Precisas

#### Obrigatório
- Computador (Windows / Mac / Linux)
- Navegador web (Chrome / Edge recomendado)
- Placa ESP32 compatível
- Cabo USB (compatível com dados)
- Controlador USB (CP2102 ou CH340)

#### Opcional
- **Para WiFi OTA**: Router WiFi (DigiCode Finder no Windows sem Bonjour)
- **Para BLE**: Navegador compatível com Web Bluetooth (Chrome / Edge)
- **Para compilação local**: Ambiente Docker

### Se Quiseres Usar WiFi OTA / BLE

É necessária apenas uma configuração inicial:

1. Liga o ESP32 via USB
2. Vai a **"Carregamento de Firmware"** no menu esquerdo → clica em **"INSTALL"**
3. (Apenas WiFi OTA) Configura SSID e palavra-passe em **"Configuração WiFi"**
4. Depois podes carregar via WiFi OTA / BLE sem USB

→ Detalhes: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Problemas Comuns e Soluções

| Sintoma | Causa | Solução |
|---|---|---|
| A porta não aparece | Controlador USB não instalado | Instalar controlador CP2102 ou CH340 + reiniciar PC |
| Erro de carregamento | Cabo USB apenas de carregamento | Substituir por cabo compatível com dados |
| Tempo limite durante carregamento | Ligação instável | Tentar outra porta USB / cabo |
| Não consegue entrar no modo BOOT | Procedimento específico da placa | Manter BOOT / BOOTSTRAP pressionado ao iniciar carregamento |
| Não detetado por WiFi OTA | WiFi não ligado / firmware não carregado | Verificar carregamento de firmware e configuração WiFi via USB |

Para mais, ver [Resolução de Problemas](./troubleshooting.md).

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md) — De USB a LED a piscar
- [Guia ESP32](./04-program-setup-esp32.md) — Detalhes de carregamento ESP32
- [Guia de Configuração OTA](./05-ota-guide.md) — Configuração WiFi OTA / BLE
- [Servidor de Compilação Local](./local-compile-server.md) — Compilar no teu próprio PC
- [Resolução de Problemas](./troubleshooting.md) — Problemas comuns e soluções
