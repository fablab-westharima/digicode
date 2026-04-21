# Guia de Configuração OTA (Opcional)

**Última atualização:** 2026-04-21

> **Este guia é opcional.** DigiCode funciona **apenas com um cabo USB**. Familiariza-te primeiro com o fluxo USB em [Primeiros Passos](./getting-started.md) e consulta este guia quando necessário.

---

## O Que é WiFi OTA?

WiFi OTA (Over-The-Air) permite carregar programas sem fios via WiFi. Uma vez configurado, podes atualizar programas sem cabo USB.

### Vantagens

- Carregamento sem cabo USB
- Método mais rápido (~15 seg)
- Atualiza múltiplos dispositivos simultaneamente
- Atualiza dispositivos dentro de caixas

### Desvantagens / Notas

- Requer configuração inicial (carregamento de firmware + configuração WiFi)
- Requer ligação WiFi
- PC e ESP32 devem estar na mesma rede
- Requer Bonjour/mDNS (instalação adicional no Windows)
- Não é possível carregar durante falhas de WiFi ou mudanças de rede

> **Recomendado para nível intermédio+:** Problemas com WiFi OTA podem requerer recarregar firmware via USB para recuperar.

---

## Pré-requisitos

1. **Placa ESP32** (compatível com WiFi OTA, supportsOta: true)
2. **Router WiFi** (uma rede à qual o ESP32 possa ligar-se)
3. **DigiCode Finder** (recomendado)
   - https://github.com/fablab-westharima/DigiCode-Finder/releases

---

## Passo 1: Carregar o Firmware

Para usar WiFi OTA / BLE, precisas de carregar o **firmware** (software base OTA) uma vez via USB.

1. Ligar o ESP32 com cabo USB
2. Clicar em **"Carregamento de Firmware"** no menu esquerdo
3. Clicar em "INSTALL"
4. Selecionar porta série
5. Aguardar conclusão (~1 min)

> Uma vez carregado, normalmente não é necessário recarregar o firmware. É necessário recarregar após apagamento completo da flash.

---

## Passo 2: Ligar o ESP32 ao WiFi

1. Ligar o ESP32 via USB (mesma ligação que carregamento de firmware)
2. Clicar em **"Configuração WiFi"** no menu esquerdo
3. Selecionar porta série e clicar em "Ligar"
4. No diálogo de configuração WiFi, inserir:
   - **SSID**: Nome da tua rede WiFi
   - **Palavra-passe**: Palavra-passe do teu WiFi
5. Clicar em "Teste de Ligação"
6. Após sucesso, mostra endereço IP fixo

> Se o teste de ligação falhar, as configurações não são guardadas. Verifica o teu SSID e palavra-passe.

---

## Passo 3: Detetar Dispositivo com DigiCode Finder

### O Que é DigiCode Finder?

Aplicação de secretária que deteta automaticamente dispositivos DigiCode na tua rede via mDNS (v1.4.1).

### Instalação

**Descarregar:** https://github.com/fablab-westharima/DigiCode-Finder/releases

| SO | Ficheiro |
|----|---------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

### Utilizadores Windows: Instalar Bonjour

Se os dispositivos não forem detetados após abrir o DigiCode Finder, é necessário Bonjour.

1. No menu do DigiCode Finder: "Help" → "Install Bonjour (Windows)"
2. Descarregar Bonjour Print Services do site oficial da Apple
3. Instalar e reiniciar o PC

### Deteção de Dispositivos

1. Abrir DigiCode Finder
2. Dispositivos DigiCode na mesma rede são listados automaticamente
3. Mostra nome do dispositivo, endereço IP e versão de firmware

### Copiar Endereço IP

1. Clicar em "Selecionar" junto ao dispositivo alvo
2. Endereço IP copiado para a área de transferência

### Selecionar Múltiplos Dispositivos

1. Marcar múltiplos dispositivos
2. Clicar em "Selecionar" (JSON com múltiplos IPs é copiado)

---

## Passo 4: Carregar via WiFi OTA

### Dispositivo Único

1. Criar o teu programa no editor de blocos
2. Clicar em **"Carregar"** → **"WiFi OTA"**
3. Colar endereço IP no diálogo de seleção de dispositivo
4. Clicar em "Iniciar Carregamento" (~15 seg)

### Carregamento em Massa para Múltiplos Dispositivos

1. Selecionar e copiar múltiplos dispositivos no DigiCode Finder
2. Clicar em "Carregar" → "WiFi OTA"
3. Múltiplos dispositivos aparecem no diálogo
4. Marcar alvos e clicar em "Iniciar Carregamento em Massa"

---

## Carregamento BLE (Opcional)

Carregamento via Bluetooth Low Energy. Útil para locais sem WiFi ou atualizar dispositivos em caixas.

### Vantagens / Desvantagens do BLE

**Vantagens:**
- Sem WiFi necessário
- Sem cabo
- Atualizar dispositivos em caixas

**Desvantagens:**
- Mais lento que WiFi OTA (~40 seg)
- Requer navegador compatível com Web Bluetooth
- Pré-requisito: carregamento de firmware (igual a WiFi OTA)

### Pré-requisitos

- Firmware carregado (igual ao Passo 1)
- Navegador compatível com Web Bluetooth (Chrome, Edge)

### Placas compatíveis

Todas as placas ESP32 com BLE (supportsBle: true).

### Passos

1. Criar o teu programa
2. Clicar em **"Carregar"** → **"BLE"**
3. Clicar em "Procurar dispositivos"
4. Selecionar "DigiCode-XXXXXX" no diálogo Bluetooth do navegador
5. Clicar em "Emparelhar"
6. O carregamento começa (~40 seg)

### Resolução de Problemas BLE

| Sintoma | Solução |
|---------|---------|
| Dispositivo não encontrado | Reiniciar ESP32, reiniciar navegador |
| Emparelhamento falhado | Aproximar-se, desligar outras ligações BLE |
| Carregamento para a meio | Reiniciar ESP32 e tentar novamente |

---

## Configuração do Nome do Dispositivo

Útil para gerir múltiplos dispositivos.

1. Abrir "Configuração WiFi" via USB
2. Inserir novo nome no campo "Nome do Dispositivo"
3. Clicar em "Guardar"

**Nomenclatura recomendada:**
```
DigiCode-[propósito]-[número]
Ex: DigiCode-robot-001, DigiCode-class-02
```

---

## Resolução de Problemas

### Dispositivo Não Detetado

| Causa | Solução |
|-------|---------|
| WiFi não ligado | Verificar configuração WiFi via USB |
| Rede diferente | Garantir que PC e ESP32 estão no mesmo WiFi |
| Bonjour não instalado (Windows) | Instalar Bonjour Print Services |
| Firewall | Permitir mDNS (porta 5353) |

### Carregamento Para a Meio

| Causa | Solução |
|-------|---------|
| Sinal WiFi fraco | Aproximar ESP32 do router |
| Congestionamento de rede | Pausar outras transferências grandes |
| Tempo limite | Reiniciar ESP32 e tentar novamente |

### Dispositivo Sem Resposta Após Carregamento

| Causa | Solução |
|-------|---------|
| Erro no programa | Recarregar firmware via USB |
| Perda de configuração WiFi | Refazer configuração WiFi via USB |

---

## Repor Configuração WiFi

Para repor a configuração WiFi:

1. Abrir "Carregamento de Firmware"
2. Executar "Apagar flash completo (depuração)"
3. Recarregar firmware
4. Refazer configuração WiFi

---

## Notas de Segurança

- Usar apenas em ambientes de rede fidedignos
- Não recomendado em WiFi público
- Considerar VPN ou redes isoladas para ambientes de produção

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|---------|
| [Primeiros Passos](./getting-started.md) | Fluxo básico USB |
| [Passos Comuns](./01-program-setup-common.md) | Terminologia, resumo de métodos |
| [Guia ESP32](./04-program-setup-esp32.md) | Configuração específica do ESP32 |
| [Resolução de Problemas](./troubleshooting.md) | Guia de resolução de problemas |
