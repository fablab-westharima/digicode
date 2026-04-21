# DigiCode Architecture Overview

**Last Updated:** 2026-04-21

Overall system configuration and technology stack of DigiCode.

## System Configuration

| Component | Technology | Deployment |
|-----------|------------|------------|
| **Frontend** | React 19 + Blockly | Cloudflare Pages |
| **Backend API** | Hono + Cloudflare Workers | Cloudflare Workers |
| **Class Server** | Hono + better-sqlite3 | HPE ML30 (`class.digital-fab.jp`) |
| **Compile Server** | Node.js + Arduino CLI | HPE ML30 / Railway |
| **Database** | Cloudflare D1 (SQLite) | Cloudflare |
| **File Storage** | Cloudflare R2 | Cloudflare (bucket provisioned, currently unused) |
| **Payments** | Stripe Billing | Stripe (live in production) |

---

## Technology Stack

### Frontend

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **Block editor:** Blockly 10.4
- **State management:** Zustand
- **Routing:** React Router 7
- **Device upload:** esp-web-tools, esptool-js
- **Internationalization:** i18next (five languages: Japanese / English / Spanish / Portuguese / Traditional Chinese)

### Backend API

- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Database:** Cloudflare D1 (users, classes, class_members, compile_usage, subscriptions, etc.)
- **Authentication:** JWT
- **Payments:** Stripe Billing (Phase D-1, live since 2026-04-18)

### Class Server (independent)

- **Repository:** `fablab-westharima/digicode-class-server` (Private)
- **Runtime:** Node.js + Hono + better-sqlite3
- **Role:** Manages assignments and submissions. Large Blockly XML is stored in SQLite rather than D1
- **Deployment:** HPE ML30 (`https://class.digital-fab.jp`)

### Compile Server

- **Repository:** `fablab-westharima/arduino-compile-server` (Public)
- **Runtime:** Node.js + Express
- **Compiler:** Arduino CLI 1.3.1
- **Target:** ESP32 Arduino Core 3.3.4
- **Deployment:** HPE ML30 (cloud compile) / Railway (backup)
- **Local edition:** Docker image published (`ghcr.io/fablab-westharima/digicode-compile-server`)

### ESP32 Firmware

- **Language:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **Libraries:** DigiCodeHumanoid / DigiCodeTransform / DigiCodeWheel (in-house implementation)

---

## Data Flow

### Program Upload Flow (USB)

```
Block editor → Compile server → Binary generation → Browser Web Serial API → ESP32
```

### Program Upload Flow (WiFi OTA)

```
Block editor → Compile server → Binary generation → HTTP POST to ESP32 OTA endpoint
```

### Class Feature Flow

```
Teacher: Browser → Backend API (D1) → Class server (ML30 SQLite)
Student: Browser → Backend API → Assignment fetch / submission → Class server
```

---

## Directory Structure

### Frontend

```
variants/ota/frontend/
├── public/
│   ├── firmware/         # Firmware binaries
│   └── docs/             # Documentation (5 languages)
├── src/
│   ├── blocks/           # Blockly block definitions (arduino/ + common/)
│   ├── components/       # React components
│   │   ├── editor/       # Editor / mode selector
│   │   ├── serial/       # Serial monitor
│   │   ├── device/       # Device management
│   │   ├── settings/     # Settings / plan
│   │   └── ui/           # UI components (shadcn)
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── stores/           # Zustand stores
│   ├── i18n/             # Localization (5 languages)
│   └── data/             # Sample projects etc.
```

### Backend API

```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # API routes
│   ├── middleware/       # Authentication etc.
│   └── db/               # D1 schema
└── wrangler.toml         # Cloudflare Workers config
```

---

## Security

### Authentication & Authorization
- Session management via JWT tokens
- All API requests are authenticated with a token
- Per-plan feature gating (Stripe integration)

### CORS
- Requests from the frontend are allowed
- Requests from ESP32 devices are allowed (for OTA)

### Data Protection
- Passwords are stored hashed
- HTTPS in production
- XSS protection (React's escaping)

---

## Testing

- **Unit tests:** vitest environment set up (test implementation to come)
- **E2E tests:** Not yet implemented

---

## Scalability

### Horizontal Scaling
- Cloudflare Workers: auto-scaling
- Cloudflare D1: automatic replication
- Compile server: dual ML30 + Railway configuration

### Performance Optimization
- Frontend: fast Vite builds and code splitting
- Backend: Workers edge delivery
- Database: index optimization

---

## References

- [React Documentation](https://react.dev/)
- [Blockly Documentation](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
