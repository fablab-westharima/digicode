# Visão Geral da Arquitetura DigiCode

**Última atualização:** 2026-04-21

Explica a configuração geral do sistema e a stack tecnológica do DigiCode.

## Configuração do Sistema

| Componente | Tecnologia | Implementação |
|------------|------------|---------------|
| **Frontend** | React 19 + Blockly | Cloudflare Pages |
| **API Backend** | Hono + Cloudflare Workers | Cloudflare Workers |
| **Servidor de Turmas** | Hono + better-sqlite3 | HPE ML30 (`class.digital-fab.jp`) |
| **Servidor de Compilação** | Node.js + Arduino CLI | HPE ML30 / Railway |
| **Base de Dados** | Cloudflare D1 (SQLite) | Cloudflare |
| **Armazenamento de Ficheiros** | Cloudflare R2 | Cloudflare (bucket configurado, sem uso atual) |
| **Pagamentos** | Stripe Billing | Stripe (em produção) |

---

## Stack Tecnológica

### Frontend

- **Framework:** React 19 + TypeScript
- **Ferramenta de build:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **Editor de blocos:** Blockly 10.4
- **Gestão de estado:** Zustand
- **Encaminhamento:** React Router 7
- **Carregamento para dispositivo:** esp-web-tools, esptool-js
- **Internacionalização:** i18next (5 idiomas: japonês / inglês / espanhol / português / chinês tradicional)

### API Backend

- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Base de dados:** Cloudflare D1 (users, classes, class_members, compile_usage, subscriptions, etc.)
- **Autenticação:** JWT
- **Pagamentos:** Stripe Billing (Fase D-1, em produção desde 2026-04-18)

### Servidor de Turmas (independente)

- **Repositório:** `fablab-westharima/digicode-class-server` (privado)
- **Runtime:** Node.js + Hono + better-sqlite3
- **Função:** Gestão de tarefas (assignments) e respostas (submissions). XML de Blockly de grande dimensão armazenado em SQLite em vez de D1
- **Implementação:** HPE ML30 (`https://class.digital-fab.jp`)

### Servidor de Compilação

- **Repositório:** `fablab-westharima/arduino-compile-server` (público)
- **Runtime:** Node.js + Express
- **Compilador:** Arduino CLI 1.3.1
- **Plataforma alvo:** ESP32 Arduino Core 3.3.4
- **Implementação:** HPE ML30 (compilação na nuvem) / Railway (backup)
- **Versão local:** Imagem Docker publicada (`ghcr.io/fablab-westharima/digicode-compile-server`)

### Firmware ESP32

- **Linguagem:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **Bibliotecas:** DigiCodeHumanoid / DigiCodeTransform / DigiCodeWheel (implementação própria)

---

## Fluxo de Dados

### Fluxo de Carregamento de Programa (USB)

```
Editor de blocos → Servidor de compilação → Geração de binário → Web Serial API do browser → ESP32
```

### Fluxo de Carregamento de Programa (WiFi OTA)

```
Editor de blocos → Servidor de compilação → Geração de binário → HTTP POST para endpoint OTA do ESP32
```

### Fluxo da Função de Turmas

```
Professor: Browser → API Backend (D1) → Servidor de turmas (ML30 SQLite)
Aluno: Browser → API Backend → Obter tarefa / submeter resposta → Servidor de turmas
```

---

## Estrutura de Diretórios

### Frontend

```
variants/ota/frontend/
├── public/
│   ├── firmware/         # Binários de firmware
│   └── docs/             # Documentação (5 idiomas)
├── src/
│   ├── blocks/           # Definições de blocos Blockly (arduino/ + common/)
│   ├── components/       # Componentes React
│   │   ├── editor/       # Editor / seletor de modo
│   │   ├── serial/       # Monitor série
│   │   ├── device/       # Gestão de dispositivos
│   │   ├── settings/     # Configurações / plano
│   │   └── ui/           # Componentes UI (shadcn)
│   ├── pages/            # Componentes de página
│   ├── services/         # Serviços API
│   ├── stores/           # Stores Zustand
│   ├── i18n/             # Internacionalização (5 idiomas)
│   └── data/             # Projetos de exemplo, etc.
```

### API Backend

```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # Ponto de entrada
│   ├── routes/           # Rotas API
│   ├── middleware/       # Autenticação, etc.
│   └── db/               # Esquema D1
└── wrangler.toml         # Configuração Cloudflare Workers
```

---

## Segurança

### Autenticação e Autorização
- Gestão de sessões através de tokens JWT
- Todos os pedidos API incluem token
- Restrição de funcionalidades por plano (integração Stripe)

### CORS
- Pedidos do frontend são permitidos
- Pedidos de dispositivos ESP32 são permitidos (para OTA)

### Proteção de Dados
- Palavras-passe armazenadas com hash
- HTTPS em produção
- Proteção XSS (escape do React)

---

## Testes

- **Testes unitários:** Ambiente vitest configurado (implementação de testes pendente)
- **Testes E2E:** Ainda não implementados

---

## Escalabilidade

### Escalamento Horizontal
- Cloudflare Workers: escalamento automático
- Cloudflare D1: replicação automática
- Servidor de compilação: configuração dual ML30 + Railway

### Otimização de Desempenho
- Frontend: builds rápidos com Vite e divisão de código
- Backend: entrega edge com Workers
- Base de dados: otimização de índices

---

## Referências

- [Documentação React](https://react.dev/)
- [Documentação Blockly](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
