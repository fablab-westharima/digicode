# Resolução de Problemas

**Última atualização:** 2026-04-21

Problemas comuns e soluções para o DigiCode.

---

## Problemas de Carregamento de Programa

### ESP32 Não Reconhecido

**Sintoma:** O ESP32 não aparece no diálogo de seleção de porta série

**Soluções:**

1. Verifique se o cabo USB é **compatível com transferência de dados** (cabos apenas de carga não funcionam)
2. Instale o driver USB para ESP32
   - **CP2102**: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   - **CH340**: http://www.wch.cn/downloads/CH341SER_ZIP.html
3. Experimente uma porta USB diferente
4. Desligue e volte a ligar o cabo USB do ESP32
5. Mude o browser para Chrome / Edge (é necessária a Web Serial API)

### Erro Durante o Carregamento

**Sintoma:** É apresentado um erro como "Failed to connect"

**Soluções:**

1. Mantenha o botão **BOOT** do ESP32 pressionado ao iniciar o carregamento
2. Mantenha o botão BOOT pressionado durante o carregamento
3. Verifique se nenhuma outra aplicação está a usar a porta (ex.: monitor série)
4. Reinicie o browser e tente novamente

### Quota de Compilação Esgotada

**Sintoma:** É apresentada a mensagem "Limite mensal de compilação atingido"

**Soluções:**

1. Aguarde pelo próximo mês
2. Atualize para um plano superior (Lite / Pro / Enterprise)
3. Use o [Servidor de Compilação Local](./local-compile-server.md) — não consome quota na nuvem

---

## Problemas de WiFi OTA

### Dispositivo Não Encontrado por WiFi OTA

**Sintoma:** O dispositivo não é detetado pelo DigiCode Finder

**Soluções:**

1. Confirme que o ESP32 e o PC estão na **mesma rede WiFi**
2. Confirme que o **Bonjour Print Services** (apenas Windows) está instalado
3. Verifique se a firewall não está a bloquear o mDNS (porta 5353)
4. Verifique no monitor série se a ligação WiFi foi bem-sucedida e o endereço IP
5. Reinicie o ESP32 (botão RESET)

### A Atualização OTA Para a Meio

**Sintoma:** A atualização para por volta dos 20%

**Soluções:**

1. O sinal WiFi pode ser fraco → aproxime o ESP32 do router
2. Reinicie o ESP32 e tente novamente
3. Recarregue o firmware por USB e depois tente novamente WiFi OTA

### Dispositivo Sem Resposta Após Carregamento WiFi OTA

**Sintoma:** O carregamento foi bem-sucedido, mas o programa não executa

**Soluções:**

1. Recarregue o firmware por USB
2. "Apagar memória flash completa (depuração)" → Carregamento de Firmware → Configuração WiFi

---

## Problemas de BLE

### Dispositivo BLE Não Encontrado

**Sintoma:** Ao premir "Procurar Dispositivos" não aparece nenhum dispositivo

**Soluções:**

1. **Compatibilidade do browser** — Confirme que está a usar Chrome / Edge (é necessário Web Bluetooth)
2. **Compatibilidade da placa** — ESP32-S2 não suporta BLE; RP2040 Pico W também não suporta BLE
3. Reinicie o ESP32
4. Reinicie o browser

### O Emparelhamento BLE Falha

**Sintoma:** O dispositivo é encontrado mas o emparelhamento falha

**Soluções:**

1. Coloque o ESP32 perto do computador
2. Desligue temporariamente outros dispositivos BLE (rato, teclado, etc.)
3. Reinicie o ESP32 e tente novamente

### Nome Antigo do Dispositivo no macOS

**Sintoma:** Após alterar o nome do dispositivo, o browser do macOS continua a mostrar o nome antigo

**Solução:** Este é um problema ao nível do SO causado pela cache BLE do macOS e não pode ser corrigido pelo DigiCode. Funciona corretamente no Windows; utilizadores de Mac podem ser afetados.

---

## Problemas de Execução do Programa

### O Programa Não Executa

**Sintoma:** O carregamento foi bem-sucedido, mas o programa não funciona

**Soluções:**

1. Prima o botão RESET do ESP32 para reiniciar
2. Verifique mensagens de erro no monitor série
3. Verifique se os números de pino estão corretos (os pinos disponíveis variam consoante a placa)
4. Verifique novamente as ligações de sensores / motores

### O LED Não Pisca

**Sintoma:** Foi carregado um programa de piscar LED, mas o LED não pisca

**Soluções:**

1. **Para GPIO2 (LED integrado)**:
   - Algumas placas não têm LED integrado
   - Experimente ligar um LED externo
2. **Para LED externo**:
   - Verifique a polaridade (+/−)
   - Ligue uma resistência (330Ω–1kΩ) em série
   - Verifique o número de pino

---

## Problemas da Função de Turmas

### Não Consigo Aderir à Turma pelo URL de Convite

**Sintoma:** Abrir o URL de convite não permite aderir à turma

**Soluções:**

1. Confirme que iniciou sessão no DigiCode (se não, inicie sessão e abra novamente o URL)
2. Verifique se o URL de convite expirou (consulte o professor)
3. Verifique se outra conta já usou este URL de convite

### As Tarefas Não São Apresentadas

**Sintoma:** Aderiu à turma mas as tarefas não aparecem

**Soluções:**

1. Recarregue a página
2. Verifique o estado do servidor de turmas (`class.digital-fab.jp`)
3. Consulte o professor se a tarefa já foi distribuída

### Não Consigo Submeter a Resposta

**Sintoma:** Erro ao premir o botão de submissão de resposta

**Soluções:**

1. Verifique a ligação de rede
2. O servidor de turmas pode estar temporariamente inativo → aguarde e tente novamente
3. Verifique se o XML Blockly é invulgarmente grande (normalmente não é um problema)

---

## Problemas de Planos e Faturação

### Não Consigo Alterar o Plano

**Sintoma:** O Portal de Clientes Stripe não abre ou ocorre um erro

**Soluções:**

1. Verifique se o bloqueador de pop-ups não está ativo
2. Verifique se os cookies do browser estão ativados
3. Verifique o estado dos servidores Stripe

### Subscrevi um Plano Tendo uma Conta Convidada

**Sintoma:** Tinha permissões de nível Enterprise do Fablab Nishiharima mas subscrevi Pro por minha conta

**Solução:** Ao subscrever por sua conta, as permissões de convite são **removidas**. A partir daí aplica-se o seu plano contratado. Reveja o diálogo de confirmação cuidadosamente antes de subscrever.

---

## Problemas do Browser

### O Editor Blockly Não É Apresentado

**Sintoma:** A página do editor está em branco ou os blocos não são mostrados

**Soluções:**

1. Limpe a cache do browser
2. Atualize o browser para a versão mais recente
3. Experimente outro browser (Chrome, Edge)
4. Confirme que o JavaScript está ativado

### É Apresentado um Erro de Compilação

**Sintoma:** Aparece um diálogo de "Erro de Compilação"

**Soluções:**

1. Reveja a mensagem de erro
2. Confirme que as ligações de blocos estão corretas
3. Confirme que todos os parâmetros necessários estão preenchidos
4. Experimente um projeto de exemplo para isolar o problema

---

## Outros

### O Projeto Não Pode Ser Guardado

**Sintoma:** Ocorre um erro ao premir o botão de guardar

**Soluções:**

1. Confirme que iniciou sessão (os convidados só podem guardar localmente)
2. Verifique a ligação à internet
3. Confirme que o armazenamento local do browser está ativado
4. Reinicie o browser

### O Projeto de Exemplo Não Pode Ser Carregado

**Sintoma:** Ao selecionar um exemplo não é refletido no editor

**Soluções:**

1. Recarregue a página
2. Termine sessão e inicie novamente
3. Experimente outro exemplo

---

## Suporte

Se nada do acima resolver o seu problema, reporte em [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues) com as seguintes informações:

- Browser e versão
- Sistema operativo
- Plano em uso
- Nome da placa ESP32
- Método de carregamento (USB / WiFi OTA / BLE)
- Captura de ecrã da mensagem de erro
- Passos para reproduzir o problema
