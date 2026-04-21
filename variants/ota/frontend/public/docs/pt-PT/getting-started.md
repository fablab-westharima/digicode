# Primeiros Passos

**Última atualização:** 2026-04-21

DigiCode é um ambiente de programação visual que permite programar facilmente robôs e dispositivos IoT com ESP32 usando blocos.

Este guia explica o **fluxo básico com cabo USB**. Para configurar WiFi OTA / BLE, consulta o [Guia de Configuração OTA](./05-ota-guide.md).

---

## O Que Precisas

### Hardware

- **Placa de desenvolvimento ESP32** — consulta a [Lista de Hardware Recomendado](./recommended-hardware.md)
- **Cabo USB** (Type-C ou Micro-USB, compatível com dados)
- Sensores e motores (dependendo do que queres fazer)

### Software

- **Navegador web** (Chrome ou Edge recomendado)
- **Controlador USB** (CP2102 ou CH340 — ver abaixo)

---

## Criar uma Conta (Opcional)

**Podes criar e carregar programas como visitante.** Cria uma conta se quiseres guardar programas na nuvem.

1. Vai ao DigiCode
2. Clica em "Iniciar sessão" → "Registar"
3. Insere o teu email e palavra-passe

> **Sobre os planos:** Começa com a versão de visitante (Free). → [Resumo de Planos](./index.md#planos)

---

## Passo 1: Instalar o Controlador USB

Precisas de instalar um controlador USB antes de ligar o teu ESP32 ao PC.

| Chip | Placas de exemplo | Descarregar |
|------|------------------|-------------|
| **CP2102** | ESP32-DevKitC, M5StampS3A, etc. | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Muitas placas ESP32 genéricas | http://www.wch.cn/downloads/CH341SER_ZIP.html |

> Consulta a descrição do produto da tua placa para encontrar o tipo de chip. Reinicia o PC depois de instalar.

---

## Passo 2: Criar um Programa (LED a Piscar)

1. Abre o editor DigiCode
2. Coloca os seguintes blocos da caixa de ferramentas:

**Bloco Setup:**
```
Setup:
  Configurar Modo do Pino [2] como [SAÍDA]
```

**Bloco Loop:**
```
Repetir sempre:
  Escrita Digital [2] HIGH
  Esperar [1000] ms
  Escrita Digital [2] LOW
  Esperar [1000] ms
```

> GPIO2 é o LED integrado do ESP32.

---

## Passo 3: Carregar via USB

1. **Ligar o ESP32 ao PC com cabo USB**
2. Clicar no botão **"Carregar"** no editor
3. Selecionar **"USB"**
4. Escolher a porta ESP32 no diálogo de porta série do navegador (ex: COM3, /dev/ttyUSB0)
5. O carregamento começa → ESP32 reinicia automaticamente após conclusão

**Verificar:** O LED integrado do ESP32 (GPIO2) pisca a intervalos de 1 segundo.

### Se a porta não aparecer

O controlador USB pode não estar instalado corretamente. Volta ao Passo 1 e instala o controlador.

---

## Passo 4: Experimentar Projetos de Exemplo

1. Clicar no botão **"Exemplos"** no editor
2. Escolher das categorias:
   - **Básico** — LED a piscar, comunicação série
   - **Sensores** — sensor ultrassónico, temperatura/humidade
   - **Competição** — seguimento de linha, micromouse
3. Carregar o exemplo
4. Ajustar números de pinos conforme necessário
5. Carregar via USB e verificar

---

## Diferença entre Carregamento de Programa e de Firmware

| Operação | Conteúdo | Quando |
|----------|---------|--------|
| **Carregamento de Programa** | Carregar o programa feito com blocos | Cada vez (USB / WiFi OTA / BLE) |
| **Carregamento de Firmware** | Carregar software base para WiFi OTA / BLE | **Apenas na primeira vez, apenas se usares WiFi OTA / BLE** |

**Se usares apenas USB, não é necessário carregar firmware.**

---

## Opcional: Carregar Sem Cabo

Se ligar um cabo USB de cada vez for inconveniente, podes configurar WiFi OTA / BLE.

- **WiFi OTA** — carregamento sem fios mais rápido (suporta atualizações em massa)
- **BLE** — baseado em Bluetooth (sem WiFi, ótimo para dispositivos em caixas)

É necessária uma configuração USB única: **Carregamento de Firmware** + configuração WiFi (~5 min).

> **Recomendado para nível intermédio+:** WiFi OTA requer configuração de rede e a resolução de problemas pode ser complexa. Recomendamos habituar-se primeiro com USB antes de mudar.

→ Detalhes: [Guia de Configuração OTA](./05-ota-guide.md)

---

## Usar Turmas (Plano Enterprise)

- **Professores:** Cria uma turma e partilha o URL de convite com os alunos
- **Alunos:** Junta-te à turma através do URL de convite e completa as tarefas

→ Detalhes: [FAQ (Função de Turmas)](./faq.md)

---

## Próximos Passos

- [Hardware Recomendado](./recommended-hardware.md) — Lista de dispositivos verificados
- [Referência de Blocos](./block-reference.md) — Como usar todos os blocos
- [Guia de Configuração de Hardware](./hardware-setup.md) — Ligação de sensores e motores
- [Resolução de Problemas](./troubleshooting.md) — Problemas comuns e soluções
- [Guia de Configuração OTA](./05-ota-guide.md) — Configuração de WiFi OTA / BLE
- [Servidor de Compilação Local](./local-compile-server.md) — Compilar no teu próprio PC (avançado)

---

## Suporte

Se encontrares problemas, consulta [Resolução de Problemas](./troubleshooting.md) ou abre um Issue no GitHub.
