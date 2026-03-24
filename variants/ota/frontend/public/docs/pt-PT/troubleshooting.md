# Resolução de Problemas

Problemas comuns e soluções para DigiCode.

## Problemas de Carregamento de Firmware

### ESP32 Não Reconhecido

**Sintoma:** Nada apresentado na lista de portas seriais

**Soluções:**
1. Verifique se o cabo USB é **compatível com dados**
2. Instale drivers USB para ESP32
3. Tente uma porta USB diferente
4. Desconecte e reconecte o cabo USB

### Erro Durante Carregamento

**Sintoma:** Erro como "Failed to connect"

**Soluções:**
1. Mantenha pressionado o botão **BOOT** ao iniciar carregamento
2. Verifique que nenhuma outra aplicação está a usar a porta
3. Reinicie o navegador e tente novamente

## Problemas de Operação do Programa

### Programa Não Funciona

**Soluções:**
1. Pressione o botão RESET do ESP32
2. Verifique mensagens de erro no monitor serial
3. Verifique números de pinos corretos

## Problemas WiFi OTA

### Dispositivo Não Encontrado

**Soluções:**
1. Verifique se ESP32 e PC estão na **mesma rede WiFi**
2. Verifique se firewall não está a bloquear mDNS
3. Reinicie ESP32

## Suporte

Reporte em GitHub Issues com:
- Navegador e versão
- Nome da placa ESP32
- Captura de ecrã do erro

**GitHub Issues:** https://github.com/fablab-westharima/DigiCode/issues
