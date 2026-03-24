# Guia de Configuração OTA

**Última atualização:** 2025-12-28

---

## Introdução

O carregamento OTA (Over-The-Air) permite carregar programas para o ESP32 via WiFi.

---

## Vantagens e Limitações

### Vantagens
- Sem cabo USB necessário
- Atualizar múltiplos dispositivos simultaneamente
- Atualizar mesmo com dispositivo fechado

### Limitações
- Firmware deve ser carregado primeiro via USB
- Requer ambiente WiFi
- ESP32 e PC devem estar na mesma rede

---

## Passo 1: Conectar ESP32 a WiFi

1. Conecte ESP32 ao PC via USB
2. Clique em "**Configurações WiFi**"
3. Introduza SSID e palavra-passe
4. Clique em "Testar Ligação"
5. IP fixo será apresentado após sucesso

---

## Passo 2: Detetar Dispositivos com DigiCode Finder

### O que é DigiCode Finder?

Aplicação de desktop que deteta automaticamente dispositivos DigiCode via mDNS.

### Instalação

1. Vá a https://github.com/fablab-westharima/DigiCode-Finder/releases
2. Transfira o ficheiro para o seu SO
3. Instale e inicie

### Para Utilizadores Windows

**É necessário instalar Bonjour.**

---

## Passo 3: Carregamento WiFi OTA

1. Crie programa no DigiCode
2. Clique em "**Carregar**"
3. Selecione "**WiFi OTA**"
4. Selecione dispositivo
5. Clique em "Iniciar Carregamento"

---

## Resolução de Problemas

| Causa | Solução |
|-------|---------|
| WiFi não conectado | Verifique configurações WiFi via USB |
| Rede diferente | Verifique se PC e ESP32 estão na mesma WiFi |
| Bonjour não instalado | Instale Bonjour Print Services |
| Firewall | Permita mDNS (porta 5353) |

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| [Primeiros Passos](./getting-started.md) | Configuração inicial |
| [Resolução de Problemas](./troubleshooting.md) | Problemas e soluções |
