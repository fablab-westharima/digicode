# Primeiros Passos

**Última atualização:** 2026-05-02

DigiCode é um ambiente de programação visual que permite programar facilmente robôs e dispositivos IoT com ESP32 usando blocos. Este guia leva-te pelo caminho mais curto para **fazer um LED piscar via USB**.

---

## 🚀 Funciona em 5 Minutos — Caminho Mais Curto

1. **Instala o controlador USB** (CP2102 ou CH340 — apenas se ainda não estiver instalado, ver abaixo)
2. **Abre o DigiCode** → canto superior esquerdo **"Exemplos"** → seleciona **"LED a Piscar"**
3. **Liga o ESP32 ao PC com cabo USB**
4. Botão **"Carregar"** no canto superior direito → escolhe **"USB"** → seleciona a porta do ESP32 no diálogo do navegador
5. **Após o carregamento concluir, o LED integrado do ESP32 (GPIO2) pisca a intervalos de 1 segundo** ✅

Pronto. Já tens um ambiente DigiCode a funcionar.

> 💡 **Acesso como visitante funciona**: a criação de conta é opcional. Regista-te apenas se quiseres guardar programas na nuvem ([detalhes](#acesso-como-visitante-e-contas)).

---

## 🟡 Antes de Começar

| Item | Detalhes |
|---|---|
| **Hardware** | Placa de desenvolvimento ESP32 ([lista recomendada](./recommended-hardware.md)) + cabo USB (Type-C ou Micro-USB, **compatível com dados** — cabos só de carga não funcionam) |
| **Software** | Navegador web (Chrome / Edge recomendado — Web Serial API necessária) |
| **Controlador** | CP2102 ou CH340 conforme o chip USB-série da tua placa (tabela abaixo) |

---

## 5 Passos até Concluir

### Passo 1: Instala o Controlador USB

Instala um controlador USB-série antes de ligar o ESP32 ao PC.

| Chip | Placas de exemplo | Descarregar |
|---|---|---|
| **CP2102** | ESP32-DevKitC, M5StampS3A, etc. | https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers |
| **CH340** | Muitas placas ESP32 genéricas | http://www.wch.cn/downloads/CH341SER_ZIP.html |

Consulta a descrição do produto da tua placa para encontrar o tipo de chip. Reinicia o PC após instalar, para o sistema reconhecer o novo controlador.

> 💡 **A maioria das placas M5Stack usam CP2102**. Placas ESP32 genéricas e económicas usam normalmente CH340.

### Passo 2: Abre o DigiCode

Acede ao [DigiCode](https://digital-fab.jp) e abre o editor. **Podes usá-lo como visitante** — sem registo necessário.

### Passo 3: Carrega o exemplo "LED a Piscar"

1. Clica em **"Exemplos"** no canto superior esquerdo
2. Escolhe a categoria **"Básico"** → **"LED a Piscar"**
3. Os blocos são colocados automaticamente na área de trabalho

> ✨ **Sucesso primeiro**: confirmar que "funciona" com um exemplo antes de aprender a mecânica dos blocos tem maior retenção. Se preferires colocar blocos tu mesmo, ver [mais abaixo](#colocar-blocos-tu-mesmo-referência).

### Passo 4: Liga o ESP32 por USB e carrega

1. Liga o ESP32 ao PC com cabo USB
2. Clica no botão **"Carregar"** no canto superior direito do editor
3. Escolhe **"USB"**
4. Seleciona a porta do ESP32 no diálogo de porta série do navegador (ex: `COM3`, `/dev/ttyUSB0`, `/dev/cu.usbserial-XXXX`)
5. O carregamento começa → o ESP32 reinicia automaticamente ao terminar

### Passo 5: Verifica

Sucesso: o LED integrado do ESP32 (GPIO2) pisca a **intervalos de 1 segundo**.

---

## Problema: A Porta Não Aparece

### Nenhum dispositivo aparece no diálogo de portas do navegador

A causa mais comum é controlador USB em falta:

1. **Controlador do Passo 1** não instalado / sem reinício após instalar → instala + reinicia
2. Verifica que o **cabo USB suporta dados** (cabos só de carga não tornam o ESP32 visível ao PC)
3. Desliga e volta a ligar o ESP32 → clica em "Carregar" novamente

Continuas com problemas? Ver [Resolução de Problemas](./troubleshooting.md).

---

## Detalhes e Conceitos

### Carregamento de Programa vs Carregamento de Firmware

| Operação | Conteúdo | Quando |
|---|---|---|
| **Carregamento de Programa** | Carrega o programa feito com blocos para o ESP32 | Cada vez (USB / WiFi OTA / BLE) |
| **Carregamento de Firmware** | Carrega software base para WiFi OTA / BLE | **Apenas na primeira vez, apenas se usares WiFi OTA / BLE** |

**Se usares apenas USB, não é necessário carregar firmware.**

### Acesso como Visitante e Contas

- **Visitante**: criação de programas, carregamento e exemplos funcionam todos. Guardar é apenas download de ficheiro.
- **Conta (Free)**: guardar programas na nuvem, além de acesso a geração de blocos com IA, envio de feedback e outros extras → [resumo de planos](./index.md#planos)

Para registar, clica em **"Iniciar sessão" → "Registar"** e insere o teu email e palavra-passe.

### Colocar Blocos Tu Mesmo (referência)

Para quem prefere montar blocos em vez de usar um exemplo. Código mínimo de LED a piscar:

**Setup:**
```
Configurar Modo do Pino [2] como [SAÍDA]
```

**Loop:**
```
Repetir sempre:
  Escrita Digital [2] HIGH
  Esperar [1000] ms
  Escrita Digital [2] LOW
  Esperar [1000] ms
```

GPIO2 é o LED integrado do ESP32. Para detalhes de blocos, ver a [Referência de Blocos](./block-reference.md).

### Categorias de Exemplos

| Categoria | Conteúdos |
|---|---|
| **Básico** | LED a piscar, comunicação série, entrada de botão |
| **Sensores** | Ultrassónico, temperatura/humidade, luz, acelerómetro |
| **Motores** | Servo, motor DC, passo a passo |
| **Robôs** | Humanoide, com rodas, transformável |
| **IoT** | WiFi, MQTT, Home Assistant |
| **Competição** | Seguimento de linha, micromouse |

---

## Próximos Passos a Tentar

### Carregar Sem Cabo (intermédio+)

Se ligar USB de cada vez for inconveniente, podes configurar carregamento sem fios:

- **WiFi OTA** — carregamento sem fios mais rápido (suporta atualização em massa de vários dispositivos)
- **BLE** — baseado em Bluetooth (sem WiFi, ótimo para dispositivos em caixas)

É necessária uma configuração USB única: **Carregamento de Firmware** + configuração WiFi (~5 min).

> 📘 **Detalhes**: [Guia de Configuração OTA](./05-ota-guide.md)

### Função de Turmas (plano Enterprise)

- **Professores**: cria uma turma e partilha o URL de convite com os alunos
- **Alunos**: junta-te através do URL de convite e completa as tarefas

→ Detalhes: [FAQ (Função de Turmas)](./faq.md)

### Compilação de Alta Frequência (avançado)

Se ultrapassares a quota de compilação na nuvem, podes executar um servidor de compilação local no teu próprio PC.

→ Detalhes: [Servidor de Compilação Local](./local-compile-server.md)

---

## Próximos Passos

- [Hardware Recomendado](./recommended-hardware.md) — lista de dispositivos verificados
- [Referência de Blocos](./block-reference.md) — como usar todos os blocos
- [Guia de Configuração de Hardware](./hardware-setup.md) — ligação de sensores e motores
- [Resolução de Problemas](./troubleshooting.md) — problemas comuns e soluções
- [Guia de Configuração OTA](./05-ota-guide.md) — configuração de WiFi OTA / BLE
- [Servidor de Compilação Local](./local-compile-server.md) — compilar no teu próprio PC (avançado)

---

## Suporte

Se encontrares problemas, consulta [Resolução de Problemas](./troubleshooting.md) ou abre um Issue no GitHub.
