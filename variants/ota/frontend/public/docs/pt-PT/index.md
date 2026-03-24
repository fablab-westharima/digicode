# Bem-vindo ao DigiCode

**DigiCode** é um ambiente de programação visual para ESP32 usando Blockly.
Crie programas com blocos de arrastar e soltar, e carregue-os na sua placa ESP32 com um clique.

---

## Visão Geral

![Descrição do Fluxo](/docs/images/flow-overview.svg)

---

## Três Métodos de Carregamento

O DigiCode suporta três métodos de carregamento de programas:

![Métodos de Carregamento](/docs/images/upload-methods.svg)

| Método | Características | Casos de Uso |
|--------|-----------------|--------------|
| **WiFi OTA** | Sem cabos, o mais rápido | Atualizações regulares |
| **BLE** | Bluetooth, funciona sem WiFi | Quando WiFi não está disponível |
| **USB** | O mais fiável | Configuração inicial, depuração |

---

## Início Rápido

### Configuração Inicial (Apenas Primeira Vez)

1. **Carregar Firmware via USB**
2. **Configurar WiFi** (para carregamento OTA)
3. **Instalar DigiCode Finder** (Recomendado)

### Criação de Programa (Repetir)

1. **Criar Programa** - Arrastar e soltar blocos
2. **Carregar** - Escolher método e carregar
3. **Verificar** - Confirmar funcionamento

---

## Documentos Detalhados

| Documento | Conteúdo |
|-----------|----------|
| [Primeiros Passos](./getting-started.md) | Configuração do ambiente |
| [Passos Comuns](./01-program-setup-common.md) | Terminologia, procedimentos |
| [Guia ESP32](./04-program-setup-esp32.md) | Configuração ESP32 |
| [Guia OTA](./05-ota-guide.md) | Configuração WiFi OTA |
| [Referência de Blocos](./block-reference.md) | Documentação de blocos |
| [Configuração de Hardware](./hardware-setup.md) | Cablagem |
| [Resolução de Problemas](./troubleshooting.md) | Problemas e soluções |

---

## Suporte

- **Issues GitHub**: https://github.com/fablab-westharima/DigiCode/issues
