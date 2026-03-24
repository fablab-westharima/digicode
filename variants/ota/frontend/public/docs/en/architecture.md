# DigiCode Architecture Overview

System configuration and technology stack for DigiCode.

## System Configuration

![System Architecture](/docs/images/system-architecture.svg)

## Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 7
- **UI:** Tailwind CSS + shadcn/ui
- **Block editor:** Blockly 10.4
- **State management:** Zustand
- **Routing:** React Router 7
- **Device upload:** esp-web-tools, esptool-js

### Backend API
- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Database:** Cloudflare D1 (SQLite)
- **Authentication:** JWT
- **File storage:** Cloudflare R2

### Compile Server
- **Runtime:** Node.js
- **Framework:** Express
- **Compiler:** Arduino CLI 1.3.1
- **Target:** ESP32 Arduino Core 3.3.4

### ESP32 Firmware
- **Language:** Arduino C++
- **OTA:** ArduinoOTA / WiFi OTA
- **mDNS:** ESP32 mDNS
- **Communication:** HTTP Server, WebSocket (planned)

## Data Flow

### 1. Program Creation Flow

![Program Creation Flow](/docs/images/flow-program-creation.svg)

### 2. Authentication Flow

![Authentication Flow](/docs/images/flow-auth.svg)

### 3. WiFi OTA Update Flow

![WiFi OTA Update Flow](/docs/images/flow-ota.svg)

## Directory Structure

### Frontend
```
esp32-blockly-frontend/
├── public/
│   └── firmware/         # Firmware binaries
├── src/
│   ├── blocks/           # Blockly block definitions
│   ├── components/       # React components
│   │   ├── editor/       # Editor related
│   │   ├── serial/       # Serial monitor
│   │   ├── device/       # Device management
│   │   └── ui/           # UI components (shadcn)
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── stores/           # Zustand stores
│   └── data/             # Sample projects, etc.
├── e2e/                  # E2E tests (Playwright)
└── playwright.config.ts
```

### Backend API
```
esp32-blockly-backend/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # API routes
│   ├── middleware/       # Authentication, etc.
│   └── db/               # D1 schema
└── wrangler.toml         # Cloudflare Workers config
```

### Compile Server
```
arduino-compile-server/
├── server.js             # Express server
├── templates/            # Code generation templates
├── temp/                 # Temporary files
└── build/                # Build output
```

## Security

### Authentication & Authorization
- Session management via JWT tokens
- Token stored in localStorage
- All API requests include token

### CORS
- Allow requests from frontend (localhost:5173)
- Allow requests from ESP32 devices (for OTA)

### Data Protection
- Passwords are hashed
- HTTPS communication (production)
- XSS protection (React escaping)

## Scalability

### Horizontal Scaling
- Cloudflare Workers: Auto-scale
- Cloudflare D1: Auto-replication
- Compile server: Scale out on VPS

### Performance Optimization
- Frontend: Fast build with Vite, code splitting
- Backend: Edge delivery with Workers
- Database: Index optimization

## Future Extensions

### Short-term
- Unit test & E2E test expansion
- CI/CD pipeline
- Error handling improvements

### Medium-term
- Real-time communication via WebSocket
- Device firmware auto-update
- Cloud project sharing

### Long-term
- Multi-device coordination
- Educational content expansion
- Internationalization

## References

- [React Documentation](https://react.dev/)
- [Blockly Documentation](https://developers.google.com/blockly)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Arduino CLI](https://arduino.github.io/arduino-cli/)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
