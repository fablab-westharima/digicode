# Visão Geral da Arquitetura DigiCode

## Stack Tecnológico

### Frontend
- **Framework:** React 19 + TypeScript
- **Ferramenta de build:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **Editor de blocos:** Blockly 10.4

### Backend API
- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Base de dados:** Cloudflare D1 (SQLite)
- **Autenticação:** JWT

### Servidor de Compilação
- **Runtime:** Node.js
- **Compilador:** Arduino CLI 1.3.1

### Firmware ESP32
- **Linguagem:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS

## Fluxos de Dados

### 1. Fluxo de Criação de Programa

![Fluxo de Criação](/docs/images/flow-program-creation.svg)

### 2. Fluxo de Autenticação

![Fluxo de Autenticação](/docs/images/flow-auth.svg)

### 3. Fluxo WiFi OTA

![Fluxo OTA](/docs/images/flow-ota.svg)

## Referências

- [Documentação React](https://react.dev/)
- [Documentação Blockly](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
