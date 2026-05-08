# Guia de Configuração OTA (Opcional)

**Última atualização:** 2026-05-08

> ⚠️ **BLE / WiFi OTA são funcionalidades beta.** O carregamento e atualização básicos estão verificados, mas podem ocorrer desconexões / repetições em casos extremos. Para ambientes de uso crítico recomendamos carregar via USB.

> **Este guia é opcional.** DigiCode funciona **apenas com um cabo USB**. Familiariza-te primeiro com o fluxo USB em [Primeiros Passos](./getting-started.md) e consulta este guia quando necessário.

---

## 🚀 4 Passos para OTA a Funcionar

Visão geral para ativar WiFi OTA. Configuração inicial ~10 min.

1. **Carregamento de firmware** (via USB, ~1 min) → [detalhes](#passo-1-carregar-o-firmware)
2. **Configuração WiFi** (via USB, inserir SSID + palavra-passe, ~1 min) → [detalhes](#passo-2-ligar-o-esp32-ao-wifi)
3. **Deteção de dispositivo** (Mac / Linux mDNS nativo / Windows precisa de Bonjour ou DigiCode Finder) → [detalhes](#passo-3-detetar-o-dispositivo)
4. **Carregamento via WiFi OTA** (~15 seg, sem cabo daí em diante) → [detalhes](#passo-4-carregar-via-wifi-ota)

> 💡 **Sem WiFi disponível / configuração WiFi é muito** → recomendamos **[Carregamento BLE](#carregamento-ble-opcional)** (carregamento FW uma vez, sem configuração WiFi).

---

## ⚠️ Nota para Utilizadores de Windows

WiFi OTA é **avançado** no Windows — requer instalar o Bonjour e configurar rede / Firewall. Para utilizadores principiantes de Windows recomendamos:

- **Upload USB** (guiado pela GUI integrada do DigiCode, sem instalação extra)
- **Bluetooth (BLE) OTA** (sem cabo USB, sem instalação extra, adequado para principiantes)

Utilizadores Mac / Linux podem experimentar o WiFi OTA com mais fluidez.

---

## O Que é WiFi OTA — Prós e Contras

WiFi OTA (Over-The-Air) permite carregar programas sem fios via WiFi. Uma vez configurado, podes atualizar programas sem cabo USB.

| Aspeto | Veredito |
|---|---|
| ✅ Sem cabo | Sem necessidade de ligar/desligar USB cada vez |
| ✅ Mais rápido (~15 seg) | Mais rápido que USB (~30 seg) |
| ✅ Atualização em massa | Eficaz para atualizar toda uma turma |
| ✅ Dispositivos em caixa OK | Atualizar produtos terminados |
| ❌ Requer configuração inicial | Carregamento FW + configuração WiFi (~10 min) |
| ❌ Requer WiFi | PC e ESP32 devem estar na mesma LAN |
| ❌ Requer Bonjour / mDNS | Instalação extra no Windows |
| ❌ Restrição de pinos analógicos | ADC2 (GPIO 0/2/4/12-15/25-27) indisponível enquanto WiFi está ativo; apenas ADC1 (GPIO 32-39) |
| ❌ Recuperação requer USB | Refazer configuração WiFi via USB se se perder |

> **Recomendado para nível intermédio+**: Problemas com WiFi OTA podem requerer recarregar firmware via USB para recuperar.

> ⚠️ **Restrição de pinos analógicos (ESP32) ao usar WiFi OTA**
>
> O ADC2 do ESP32 não pode ser usado enquanto o WiFi está ativo. Ao usar WiFi OTA, restringe as entradas analógicas (potenciómetro / sensor de luz / sensor de distância / etc.) ao **ADC1 (GPIO 32-39)**.
>
> - ✅ **Disponível (ADC1)**: GPIO 32, 33, 34, 35, 36, 39
> - ❌ **Indisponível (ADC2)**: GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27
> - Referência: documentação oficial Espressif [ADC Limitations](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/adc.html)
>
> O ADC2 é totalmente utilizável ao gravar via USB. Se o teu projeto precisar de mais entradas analógicas do que os 6 pinos do ADC1, considera gravar via USB.

---

## Pré-requisitos

1. **Placa ESP32** (compatível com WiFi OTA, `supportsOta: true`)
2. **Router WiFi** (uma rede à qual o ESP32 possa ligar-se, mesma LAN que o PC)
3. **Ferramenta de deteção de dispositivo** (depende do ambiente, ver abaixo)

---

## Passo 1: Carregar o Firmware

Para usar WiFi OTA / BLE, precisas de carregar o **firmware** (recetor OTA) uma vez via USB.

1. Liga o ESP32 com cabo USB
2. Clica em **"Carregamento de Firmware"** no menu esquerdo
3. Clica em **"INSTALL"**
4. Seleciona porta série
5. Aguarda conclusão (~1 min)

> 💡 Uma vez carregado, normalmente não é necessário recarregar o firmware. É necessário recarregar após apagamento completo da flash.

---

## Passo 2: Ligar o ESP32 ao WiFi

1. Liga o ESP32 via USB (mesma ligação que carregamento de firmware)
2. Clica em **"Configuração WiFi"** no menu esquerdo
3. Seleciona porta série e clica em **"Ligar"**
4. No diálogo de configuração WiFi, insere:
   - **SSID**: Nome da tua rede WiFi
   - **Palavra-passe**: Palavra-passe do teu WiFi
5. Clica em **"Teste de Ligação"**
6. Após sucesso, mostra endereço IP fixo

> ⚠️ Se o teste de ligação falhar, as configurações não são guardadas. Verifica o teu SSID e palavra-passe.

---

## Passo 3: Detetar o Dispositivo

Mecanismo para o PC obter o endereço IP do ESP32. O mecanismo necessário depende do SO.

### Mac / Linux

Suporte mDNS nativo, **sem instalação extra**. O diálogo WiFi OTA do DigiCode auto-deteta dispositivos.

### Windows (2 opções)

#### A. Instalar Bonjour (recomendado)

Windows não tem mDNS integrado, por isso instala o Bonjour Print Services da Apple:

1. Descarrega `BonjourPSSetup.exe` de https://support.apple.com/en-us/106380
2. Instala → reinicia o PC
3. A deteção mDNS padrão do DigiCode passa a funcionar

#### B. DigiCode Finder (quando não é possível instalar Bonjour / ambiente restrito)

[DigiCode Finder](https://github.com/fablab-westharima/DigiCode-Finder/releases) é uma aplicação de secretária que serve como alternativa mDNS para Windows sem Bonjour.

| SO | Ficheiro |
|---|---|
| Windows | `.exe` |
| (Existem versões Mac / Linux mas o mDNS nativo é suficiente) | `.dmg` / `.AppImage` |

**Uso**:
1. Abre o DigiCode Finder
2. Os dispositivos DigiCode na mesma rede são detetados automaticamente
3. Mostra nome do dispositivo, endereço IP e versão de firmware
4. Clica em **"Selecionar"** junto ao dispositivo alvo → o IP é copiado para a área de transferência
5. Para múltiplos dispositivos, marca-os e clica em **"Selecionar"** → JSON com múltiplos IPs é copiado

---

## Passo 4: Carregar via WiFi OTA

### Dispositivo Único

1. Constrói o teu programa no editor de blocos
2. **"Carregar"** → **"WiFi OTA"**
3. No diálogo de seleção de dispositivo:
   - A auto-deteção mDNS funciona → escolhe da lista
   - Caso contrário → insere o endereço IP (cola o valor copiado do DigiCode Finder)
4. Clica em **"Iniciar Carregamento"** (~15 seg)

### Carregamento em Massa para Múltiplos Dispositivos

1. Seleciona múltiplos dispositivos no DigiCode Finder e copia como JSON
2. **"Carregar"** → **"WiFi OTA"**
3. Múltiplos dispositivos aparecem no diálogo
4. Marca os alvos e clica em **"Iniciar Carregamento em Massa"**

Útil para atualizações únicas de toda uma turma.

---

## Carregamento BLE (Opcional)

Carregamento via Bluetooth Low Energy. Útil para locais sem WiFi, dispositivos em caixas e como alternativa para principiantes em Windows.

### Prós e Contras do BLE

| Aspeto | Veredito |
|---|---|
| ✅ Sem WiFi necessário | Sem necessidade de router ou configuração WiFi |
| ✅ Sem cabo | Sem ligação USB cada vez |
| ✅ Sem instalação extra no Windows | Web Bluetooth está integrado no Chrome / Edge |
| ✅ Dispositivos em caixa OK | Atualizar produtos terminados |
| ❌ Mais lento que WiFi OTA (~40 seg) | Mais lento que USB / WiFi OTA |
| ❌ Carregamento FW necessário | Primeira vez via USB necessário (igual a WiFi OTA) |
| ❌ Limite de distância de emparelhamento | Precisa estar a poucos metros |

### Pré-requisitos

- Firmware carregado (igual ao [Passo 1](#passo-1-carregar-o-firmware))
- Navegador compatível com Web Bluetooth (Chrome / Edge)
- Placas compatíveis: ESP32 com BLE (`supportsBle: true`)

### Passos

1. Constrói o teu programa no editor de blocos
2. **"Carregar"** → **"BLE"**
3. Clica em **"Procurar dispositivos"**
4. Seleciona **"DigiCode-XXXXXX"** no diálogo Bluetooth do navegador
5. Clica em **"Emparelhar"**
6. O carregamento começa (~40 seg)

### Resolução de Problemas BLE

| Sintoma | Solução |
|---|---|
| Dispositivo não encontrado | Reiniciar ESP32, reiniciar navegador |
| Emparelhamento falhado | Aproximar-se, desligar outras ligações BLE |
| Carregamento para a meio | Reiniciar ESP32 e tentar novamente |

---

## Detalhes e Operações

### Configuração do Nome do Dispositivo

Útil para gerir múltiplos dispositivos.

1. Abre **"Configuração WiFi"** via USB
2. Insere o novo nome no campo **"Nome do Dispositivo"**
3. Clica em **"Guardar"**

**Nomenclatura recomendada:**
```
DigiCode-[propósito]-[número]
Ex: DigiCode-robot-001, DigiCode-class-02
```

### Repor Configuração WiFi

Para repor a configuração WiFi:

1. Abre **"Carregamento de Firmware"**
2. Executa **"Apagar flash completo (depuração)"**
3. Recarrega firmware
4. Refaz configuração WiFi

### Notas de Segurança

- Usar apenas em ambientes de rede fidedignos
- Não recomendado em WiFi público
- Considerar VPN ou redes isoladas para ambientes de produção

---

## Resolução de Problemas

### Dispositivo Não Detetado

| Causa | Solução |
|---|---|
| WiFi não ligado | Verificar configuração WiFi via USB |
| Rede diferente | Garantir que PC e ESP32 estão no mesmo WiFi |
| Bonjour não instalado (Windows) | Instalar Bonjour Print Services ou usar DigiCode Finder |
| Firewall | Permitir mDNS (porta 5353) |

### Carregamento Para a Meio

| Causa | Solução |
|---|---|
| Sinal WiFi fraco | Aproximar ESP32 do router |
| Congestionamento de rede | Pausar outras transferências grandes |
| Tempo limite | Reiniciar ESP32 e tentar novamente |

### Dispositivo Sem Resposta Após Carregamento

| Causa | Solução |
|---|---|
| Erro no programa | Recarregar firmware via USB |
| Perda de configuração WiFi | Refazer configuração WiFi via USB |

Para mais, consulta [Resolução de Problemas](./troubleshooting.md).

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md) — Fluxo básico USB
- [Passos Comuns](./01-program-setup-common.md) — Terminologia, resumo de métodos
- [Guia ESP32](./04-program-setup-esp32.md) — Configuração específica do ESP32
- [Resolução de Problemas](./troubleshooting.md) — Guia de resolução de problemas
- [DigiCode Finder GitHub](https://github.com/fablab-westharima/DigiCode-Finder) — Alternativa mDNS para Windows
