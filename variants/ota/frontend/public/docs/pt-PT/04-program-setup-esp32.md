# Carregamento de Programas - ESP32

**Última atualização:** 2025-12-28

---

## Placas Compatíveis

- ESP32
- ESP32-S2 / S3
- ESP32-C2 / C3 / C5 / C6
- ESP8266

---

## Três Métodos de Carregamento

| Método | Caso de Uso | Características |
|--------|-------------|-----------------|
| **WiFi OTA** | Atualizações regulares | O mais rápido, sem cabo |
| **BLE** | Sem WiFi | Sem cabo, funciona sem WiFi |
| **USB** | Configuração inicial | Funciona em qualquer lugar |

---

## Método 1: WiFi OTA (Recomendado)

### Requisitos

- Firmware carregado via USB
- ESP32 conectado a WiFi
- DigiCode Finder

### Passos

1. **Iniciar DigiCode Finder**
2. **Selecionar dispositivo e copiar IP**
3. **Carregar no DigiCode (navegador)**

---

## Método 2: BLE

### Placas Compatíveis

- ESP32 (padrão)
- ESP32-C3
- ESP32-S3

> **Nota:** ESP32-S2 não suporta BLE.

---

## Método 3: USB

### Requisitos

- Cabo USB (compatível com dados)
- Driver USB (CP2102 ou CH340)

---

## Carregamento Inicial do Firmware

1. Clique em "**Carregar Firmware**" no menu lateral
2. Conecte ESP32 ao PC via USB
3. Clique em "INSTALAR"
4. Selecione porta serial
5. Aguarde (~1 minuto)

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| [Passos Comuns](./01-program-setup-common.md) | Terminologia |
| [Guia OTA](./05-ota-guide.md) | Configuração WiFi OTA |
| [Resolução de Problemas](./troubleshooting.md) | Problemas e soluções |
