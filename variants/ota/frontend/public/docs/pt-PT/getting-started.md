# Primeiros Passos

Este guia explica como começar com o DigiCode.

---

## Requisitos

### Hardware Necessário

- **Placa ESP32** (DevKitC, NodeMCU, etc.)
- **Cabo USB** (compatível com dados)
- **PC** (Windows/Mac/Linux)

### Software Necessário

- **Navegador Web** (Chrome ou Edge recomendado)
- **DigiCode Finder** (aplicação de desktop, recomendado)

---

## Configuração Inicial

### Passo 1: Aceder ao DigiCode

1. Abra o navegador
2. Vá a [https://digicode-frontend.pages.dev](https://digicode-frontend.pages.dev)
3. Crie uma conta ou inicie sessão

### Passo 2: Selecionar Placa

1. Clique no seletor de placa na barra lateral
2. Selecione a sua placa ESP32
3. O modo é guardado automaticamente

### Passo 3: Carregar Firmware Inicial

1. Conecte ESP32 ao PC via USB
2. Clique em "**Carregar Firmware**" no menu lateral
3. Clique no botão "INSTALAR"
4. Selecione a porta serial
5. Aguarde a conclusão (~1 minuto)

### Passo 4: Configurar WiFi (para OTA)

1. Clique em "**Configurações WiFi**"
2. Selecione porta serial e conecte
3. Introduza SSID e palavra-passe
4. Clique em "Testar Ligação"
5. IP fixo será apresentado após sucesso

---

## O Seu Primeiro Programa

### Criar um Programa de Piscar LED

1. Arraste o bloco "**Esperar**" para a área de trabalho
2. Arraste o bloco "**LED Interno ON**"
3. Arraste outro bloco "**Esperar**"
4. Arraste o bloco "**LED Interno OFF**"
5. Conecte-os em sequência

### Carregar para ESP32

1. Clique no botão "**Carregar**"
2. Escolha método de carregamento:
   - **WiFi OTA**: Selecione dispositivo da lista
   - **USB**: Selecione porta serial
3. Aguarde a conclusão
4. Verifique se o LED pisca!

---

## Próximos Passos

- [Referência de Blocos](./block-reference.md)
- [Configuração de Hardware](./hardware-setup.md)
- [Guia OTA](./05-ota-guide.md)
