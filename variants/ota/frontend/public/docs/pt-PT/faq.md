# Perguntas Frequentes (FAQ)

**Última atualização:** 2026-04-21

Perguntas e respostas comuns sobre o DigiCode.

## Índice

1. [Conta e Início de Sessão](#conta-e-início-de-sessão)
2. [Editor e Blocos](#editor-e-blocos)
3. [Carregamento de Programa](#carregamento-de-programa)
4. [WiFi OTA / BLE](#wifi-ota--ble)
5. [Hardware](#hardware)
6. [Gestão de Projetos](#gestão-de-projetos)
7. [Função de Turmas](#função-de-turmas)
8. [Planos e Preços](#planos-e-preços)

---

## Conta e Início de Sessão

### P: É necessário registo de conta?

**R:** Não, **pode criar e carregar programas como convidado**. No entanto, é necessária uma conta para guardar projetos na nuvem (disponível a partir do plano Free).

### P: Esqueci a minha palavra-passe

**R:** No ecrã de início de sessão, clique no link "Esqueceu a sua palavra-passe?" para enviar um link de redefinição para o seu endereço de e-mail registado.

### P: Posso iniciar sessão em vários dispositivos?

**R:** Sim, pode iniciar sessão em vários dispositivos com a mesma conta. Os projetos são guardados na nuvem e acessíveis a partir de qualquer dispositivo.

---

## Editor e Blocos

### P: Não encontro um bloco

**R:** Verifique o seguinte:

1. **Modo de robô** — Selecionou o modo correto? O DigiCode tem 7 modos:
   - Humanoid (bípede)
   - Wheel (robô com rodas)
   - Transform (robô transformável)
   - Home Assistant (integração IoT)
   - Generic (uso geral)
   - All Blocks (todos os blocos)
   - Custom (personalizado)

2. **Categoria** — Expanda cada categoria na caixa de ferramentas

3. **Compatibilidade da placa** — Alguns blocos ficam ocultos consoante a placa selecionada
   - Exemplo: Os blocos BLE não são mostrados no Pico W (sem suporte BLE)

### P: Não consigo ligar blocos

**R:** Os blocos têm formas de conector específicas:

- **Formas de entalhe/saliência** — Blocos que ligam verticalmente (ordem de execução)
- **Orifícios redondos** — Blocos de entrada de valor (números, strings, etc.)
- **Formas triangulares** — Blocos de entrada de condição (booleano)

Blocos com formas incompatíveis não podem ser ligados.

### P: Os blocos desapareceram ao mudar de placa

**R:** Ao mudar de placa, os blocos não compatíveis podem ser removidos do espaço de trabalho (ex.: blocos BLE no Pico W). Guarde o projeto antes de mudar.

### P: O texto japonês aparece distorcido

**R:** Pode ocorrer distorção de caracteres ao usar japonês em comunicação série. Verifique se a velocidade de transmissão do monitor série coincide (normalmente 115200).

---

## Carregamento de Programa

### P: Qual é a diferença entre "Carregamento de Programa" e "Carregamento de Firmware"?

**R:**

| Operação | Descrição | Frequência |
|----------|-----------|------------|
| **Carregamento de Programa** | Carregar o programa criado no editor de blocos | Cada vez (USB / WiFi OTA / BLE) |
| **Carregamento de Firmware** | Carregar o software base necessário para WiFi OTA / BLE | **Apenas na primeira vez** ao usar WiFi OTA ou BLE |

**O Carregamento de Firmware não é necessário se usar apenas carregamento por USB.**

### P: Qual método de carregamento é recomendado?

**R:** O **carregamento direto por USB** é o mais fiável e recomendado para principiantes e desenvolvimento típico. Quando estiver familiarizado e quiser atualizar sem cabo, configure WiFi OTA ou BLE.

### P: A compilação falha

**R:** Causas comuns e soluções:

| Erro | Causa | Solução |
|------|-------|---------|
| Biblioteca não encontrada | Biblioteca necessária não instalada | Instalada automaticamente no servidor. Tente novamente |
| Erro de sintaxe | Erro de ligação de blocos | Verificar se há blocos desligados |
| Sem memória | Programa demasiado grande | Remover blocos desnecessários |
| Quota de compilação excedida | Limite do plano atingido | Atualizar plano ou usar Compilação Local |

### P: O ESP32 não é reconhecido

**R:** Verifique o seguinte por ordem:

1. **Cabo USB** — É compatível com transferência de dados? (Cabos apenas de carga não funcionam)
2. **Driver** — Está instalado o driver CP2102 / CH340?
3. **Porta** — Experimente uma porta USB diferente
4. **Browser** — Está a usar Chrome / Edge? (É necessária a Web Serial API)

### P: Erro durante o carregamento

**R:** Erros comuns e soluções:

- **"A fatal error occurred: Failed to connect"**
  → Mantenha o botão BOOT do ESP32 pressionado ao iniciar o carregamento
- **"Timed out waiting for packet header"**
  → Reduza a velocidade de transmissão e tente novamente
- **"No serial data received"**
  → Verifique o cabo USB e a porta

### P: A compilação demora muito tempo

**R:** A primeira compilação pode demorar entre 30 segundos e 1 minuto. Para builds mais rápidos, use o [Servidor de Compilação Local](./local-compile-server.md) (recomendado plano Pro ou superior).

---

## WiFi OTA / BLE

### P: Dispositivo não encontrado (WiFi OTA)

**R:** Verifique o seguinte:

1. **Mesma rede WiFi** — O PC e o ESP32 estão na mesma rede?
2. **Firewall** — O mDNS (porta 5353) está bloqueado?
3. **Bonjour** (apenas Windows) — O Bonjour Print Services está instalado?
4. **Ligação WiFi do ESP32** — Consegue ver o endereço IP no monitor série?

### P: Dispositivo BLE não encontrado

**R:**

1. **Compatibilidade do browser** — Está a usar Chrome / Edge? (É necessário Web Bluetooth)
2. **Compatibilidade da placa** — ESP32-S2 não suporta BLE; RP2040 Pico W também não suporta BLE
3. **macOS** — A cache BLE do macOS pode mostrar um nome de dispositivo desatualizado (problema ao nível do SO). Funciona corretamente no Windows; Mac pode ser afetado.

### P: A atualização OTA pára a meio

**R:**

1. Execute a atualização numa área com boa cobertura WiFi
2. Coloque o ESP32 perto do router
3. Desligue temporariamente outros dispositivos WiFi
4. Reinicie o router

---

## Hardware

### P: Que placa ESP32 devo usar?

**R:** O DigiCode é exclusivo para placas baseadas em ESP32. As seguintes placas foram verificadas:

- **ESP32-DevKitC** — a mais comum
- **M5StampS3A** — placa recomendada pelo DigiCode (placa de expansão dedicada em desenvolvimento)
- **ESP32-S3** — alto desempenho
- **XIAO ESP32S3** — compatível com câmara

Consulte [Hardware Recomendado](./recommended-hardware.md) para mais detalhes.

### P: O servo não se move

**R:**

1. **Alimentação** — Os servos consomem muita corrente; a alimentação USB (500 mA) pode ser insuficiente. Use uma fonte externa (5V/2A ou mais)
2. **Número de pino** — Verifique se a configuração de pinos está correta
3. **Inicialização** — Certifique-se de que colocou um bloco de ligação de servo

### P: Os valores do sensor estão incorretos

**R:**

1. **Ligações** — Verifique se os cabos VCC / GND / sinal estão corretamente ligados
2. **Tensão** — Verifique a tensão de funcionamento do sensor (3,3V / 5V)
3. **Pinos analógicos** — Use pinos compatíveis com ADC (GPIO32–39)

### P: O robô Humanoid não caminha corretamente

**R:**

1. **Calibração** — Use o bloco de posição inicial para verificar a postura vertical
2. **Largura de pulso do servo** — Ajuste a largura de pulso na página de configuração de pinos (500–2400 µs)
3. **Velocidade** — Reduza a velocidade para melhorar a estabilidade
4. **Centro de gravidade** — Ajuste a posição da bateria

---

## Gestão de Projetos

### P: Não consigo guardar o meu projeto

**R:**

1. Iniciou sessão? (Os convidados só podem guardar localmente)
2. Introduziu um nome para o projeto?
3. A ligação de rede está a funcionar corretamente?

### P: O meu projeto desapareceu

**R:**

1. Iniciou sessão com a conta correta?
2. Pesquise na lista de projetos
3. Projetos eliminados acidentalmente não podem ser restaurados

### P: Posso partilhar um projeto?

**R:** Com a Função de Turmas, os professores podem distribuir tarefas aos alunos e os alunos podem submeter as suas respostas (plano Enterprise). Uma função geral de partilha de projetos está planeada para desenvolvimento futuro.

### P: Posso editar projetos de exemplo?

**R:** Ao carregar um projeto de exemplo, é criada automaticamente uma cópia. O exemplo original não é modificado.

---

## Função de Turmas

### P: O que é a Função de Turmas?

**R:** Uma função de gestão de turmas para escolas e instituições de ensino (**plano Enterprise**).

| Função | Capacidades |
|--------|-------------|
| **Professor** | Criar turmas, distribuir tarefas, rever respostas, duplicar turmas |
| **Aluno** | Aderir a turmas (URL de convite), submeter tarefas, ver histórico de submissões |

### P: Os alunos precisam de se registar?

**R:** Sim, os alunos também precisam de uma conta DigiCode. Ao aderir a uma turma através do URL de convite enviado pelo professor, são concedidas permissões de nível Enterprise (fornecidas pelo Fablab Nishiharima).

### P: Que plano inclui a Função de Turmas?

**R:** A Função de Turmas é exclusiva do **plano Enterprise**. Não está disponível nos planos individuais Free / Lite / Pro.

### P: Onde é armazenado o XML Blockly das tarefas?

**R:** O XML Blockly de tarefas e respostas é armazenado no servidor de turmas (`class.digital-fab.jp`) no HPE ML30. No D1 só são armazenadas informações básicas de gestão (IDs de turma, membros, etc.).

### P: O que acontece se o servidor de turmas ficar inativo?

**R:** As funcionalidades de turma (distribuição de tarefas, submissão de respostas) ficam indisponíveis, mas a criação e carregamento normal de programas no DigiCode continua a funcionar. O sistema está desenhado para limitar o impacto apenas às operações de tarefas e respostas.

---

## Planos e Preços

### P: Posso usar gratuitamente?

**R:** Sim, o **plano Free** permite usar as funcionalidades básicas sem custo.

| Plano | Ideal para | Mensal | Compilação na nuvem | Função de Turmas |
|-------|-----------|:------:|:-------------------:|:----------------:|
| **Free** | Experimentar / Compilação Local | ¥0 | 50/mês | — |
| **Lite** | Amadores individuais | — | 250/mês | — |
| **Pro** | Programadores / Makers | — | 500/mês | — |
| **Enterprise** | Instituições de ensino / Equipas | — | Ilimitada | ✓ |

Para preços atuais, consulte a [página de planos](/plan).

### P: Como altero o meu plano?

**R:** Vá ao menu de conta (canto superior direito) → "Plano e Faturação". Pode alterar planos, atualizar informações de faturação ou cancelar através do Portal de Clientes Stripe.

### P: O que é uma Conta Convidada?

**R:** Uma conta à qual o Fablab Nishiharima concedeu permissões de nível Enterprise. Não precisa de subscrever um plano por si próprio. No entanto, também pode subscrever um plano superior por sua conta (nesse caso, as permissões de convite são removidas).

### P: Existem licenças para instituições de ensino?

**R:** O **plano Enterprise** fornece funcionalidades de gestão de turmas para instituições de ensino. Para licenciamento em volume ou acordos especiais, contacte o [Fablab Nishiharima](https://fablab-westharima.com/).

### P: O uso do Servidor de Compilação Local consome quota de compilação na nuvem?

**R:** Não, usar o Servidor de Compilação Local não consome quota de compilação na nuvem. Ideal para compilações ilimitadas e de alta velocidade nos planos Pro / Enterprise. → [Servidor de Compilação Local](./local-compile-server.md)

---

## Outros

### P: Quais browsers são suportados?

**R:**

| Browser | Suporte | Notas |
|---------|---------|-------|
| Chrome | ✓ Recomendado | Web Serial / Web Bluetooth suportado |
| Edge | ✓ | Web Serial / Web Bluetooth suportado |
| Firefox | △ | Carregamento USB / BLE não suportado |
| Safari | △ | Carregamento USB / BLE não suportado |

Use Chrome ou Edge para carregamento USB / BLE.

### P: Posso usar num smartphone?

**R:** O editor de blocos funciona em smartphones, mas o carregamento USB não está disponível. O carregamento WiFi OTA é possível a partir de um smartphone.

### P: Posso usar sem ligação à internet?

**R:** Atualmente é necessária ligação à internet. Com o Servidor de Compilação Local, a compilação em si pode ser executada sem ligação.

### P: Encontrei um erro

**R:** Por favor reporte em [GitHub Issues](https://github.com/fablab-westharima/DigiCode/issues) com as seguintes informações:

- Browser e versão
- Sistema operativo
- Plano em uso
- Passos para reproduzir o erro
- Mensagem de erro (se existir)

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md)
- [Referência de Blocos](./block-reference.md)
- [Guia de Ligação de Hardware](./hardware-setup.md)
- [Resolução de Problemas](./troubleshooting.md)
