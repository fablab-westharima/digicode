# Documentação DigiCode

**Última atualização:** 2026-04-21

DigiCode é um ambiente de programação visual que permite programar facilmente robôs e dispositivos IoT com ESP32 usando blocos.

---

## Fluxo Geral

DigiCode funciona **apenas com um cabo USB**. Não é necessária nenhuma configuração especial.

| Passo | Conteúdo | Frequência |
|-------|----------|------------|
| **1. Preparar** | Obter placa ESP32, cabo USB e controlador USB | Apenas na primeira vez |
| **2. Criar Programa** | Construir o programa no editor de blocos | Cada vez |
| **3. Carregar via USB** | Ligar cabo USB e carregar | Cada vez |

Repete os mesmos passos a partir daqui. WiFi OTA / BLE são opções adicionais para carregar sem cabo.

→ Detalhes: [Primeiros Passos](./getting-started.md)

---

## WiFi OTA / BLE (Opcional)

Configura quando quiseres atualizar programas sem cabo. Requer apenas escrever o **firmware** (software base OTA) via USB uma vez.

> **O que é firmware?** O programa necessário para WiFi OTA / BLE. Contém as instruções base mínimas que controlam e executam diretamente o hardware. **Não é necessário se usares apenas carregamento USB.**

| Método | Características | Melhor para |
|--------|----------------|------------|
| **WiFi OTA** | Mais rápido · sem cabo | Atualizações múltiplas, desenvolvimento habitual (nível intermédio+) |
| **BLE** | Sem cabo · sem WiFi | Atualizar dispositivos em caixas |

→ Detalhes: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Placas Compatíveis

DigiCode é um editor de blocos **exclusivo para ESP32**.

### ESP32 Genérico

| Placa | WiFi OTA | BLE | Notas |
|-------|:--------:|:---:|-------|
| ESP32 | ○ | ○ | O mais comum |
| ESP32-S3 | ○ | ○ | Alto desempenho |
| ESP32-C3 | ○ | ○ | Baixo consumo · RISC-V |
| ESP32-C6 | ○ | ○ | Suporte Matter |

### Série M5Stack

| Placa | WiFi OTA | BLE | Notas |
|-------|:--------:|:---:|-------|
| M5Stack Basic/Gray/Fire | ○ | ○ | — |
| M5StickC Plus | ○ | ○ | Compacto |
| ATOM Lite / Matrix | ○ | ○ | Ultra-compacto |
| M5Stamp Pico | ○ | ○ | — |
| M5Stamp C3/C3U | ○ | ○ | — |
| **M5StampS3A** | ○ | ○ | **Placa recomendada DigiCode (placa de expansão dedicada em desenvolvimento)** |

### Série Seeed XIAO

| Placa | WiFi OTA | BLE | Notas |
|-------|:--------:|:---:|-------|
| XIAO ESP32C3 | ○ | ○ | — |
| XIAO ESP32S3 | ○ | ○ | Suporte câmara |
| XIAO ESP32C6 | ○ | ○ | — |

→ Detalhes: [Hardware Recomendado](./recommended-hardware.md)

---

## Software Necessário

| Software | Finalidade | Quando é necessário |
|----------|-----------|---------------------|
| **Navegador web** (Chrome/Edge) | Aplicação DigiCode | Obrigatório |
| **Controlador USB** (CP2102 ou CH340) | Carregamento USB | Obrigatório |
| **DigiCode Finder** | Deteção de dispositivos WiFi | Apenas com WiFi OTA |
| **Docker** | Aceleração de compilação local | Apenas com servidor local |

### Descarregar DigiCode Finder

Aplicação de secretária necessária para carregamentos WiFi OTA.

**Descarregar:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| SO | Ficheiro |
|----|---------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

---

## Planos

DigiCode é gratuito para começar.

| Plano | Ideal para | Compilações nuvem | Função turmas |
|-------|-----------|:-----------------:|:-------------:|
| **Free** | Experimentação / compilação local | 50/mês | — |
| **Lite** | Entusiasta individual | 250/mês | — |
| **Pro** | Programador / Maker | 500/mês | — |
| **Enterprise** | Instituições de ensino / equipas | Ilimitadas | ○ |

> **Acesso como visitante:** Podes criar e carregar programas sem conta (apenas gravação local).

---

## Função de Turmas (Plano Enterprise)

Gestão de turmas para escolas e instituições de ensino.

| Função | Capacidades |
|--------|-------------|
| **Professor** | Criar turmas, distribuir tarefas, rever entregas |
| **Aluno** | Juntar-se a turmas, entregar trabalhos, ver histórico |

→ Detalhes: [FAQ (Função de Turmas)](./faq.md)

---

## Documentação

### Primeiros Passos

| Documento | Conteúdo |
|-----------|---------|
| [Primeiros Passos](./getting-started.md) | Configuração inicial e primeiro programa |
| [Hardware Recomendado](./recommended-hardware.md) | Lista de dispositivos verificados |

### Guias de Carregamento

| Documento | Conteúdo |
|-----------|---------|
| [Passos Comuns](./01-program-setup-common.md) | Definição de termos e resumo de métodos |
| [Série ESP32](./04-program-setup-esp32.md) | Detalhes de carregamento para ESP32 |
| [Configuração OTA (Opcional)](./05-ota-guide.md) | Configuração de WiFi OTA / BLE |

### Referência

| Documento | Conteúdo |
|-----------|---------|
| [Referência de Blocos](./block-reference.md) | Como usar todos os blocos |
| [Configuração de Hardware](./hardware-setup.md) | Ligação de sensores e motores |
| [Resolução de Problemas](./troubleshooting.md) | Problemas comuns e soluções |
| [FAQ](./faq.md) | Perguntas frequentes |

### Avançado

| Documento | Conteúdo |
|-----------|---------|
| [Arquitetura](./architecture.md) | Estrutura do sistema e stack tecnológico |
| [Servidor de Compilação Local](./local-compile-server.md) | Compilar no teu próprio PC (aceleração) |

---

## Suporte

Se encontrares problemas, consulta:

1. [Resolução de Problemas](./troubleshooting.md)
2. [FAQ](./faq.md)
3. [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues)
