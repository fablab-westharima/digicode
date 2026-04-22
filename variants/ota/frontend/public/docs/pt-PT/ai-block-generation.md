# Usar a Geração de Blocos com IA

<!-- Este documento foi traduzido por IA a partir do original em japonês (2026-04-22) -->

**Última atualização:** 2026-04-22

A funcionalidade de geração de blocos com IA do DigiCode permite gerar blocos Blockly automaticamente a partir de instruções em linguagem natural.

---

## 1. Visão geral

Esta funcionalidade utiliza o modelo BYOK (Traga a sua própria chave) — usa a sua própria chave API de IA para gerar blocos.

| Item | Detalhes |
|------|---------|
| **Modelo** | BYOK (use a sua própria chave API) |
| **Fornecedores suportados** | OpenAI / Claude (Anthropic) / Google Gemini / Personalizado (compatível com OpenAI) |
| **Plano necessário** | Lite / Pro / Enterprise (contas de estudante excluídas) |
| **Armazenamento da chave API** | localStorage do navegador (local no seu dispositivo) |
| **Dados enviados à DigiCo** | Nenhum (instruções e resultados vão diretamente do seu navegador ao fornecedor) |

> **Nota:** A sua chave API é armazenada em texto simples no localStorage do navegador. Tenha cuidado ao utilizar um dispositivo partilhado com outras contas.

---

## 2. Configuração inicial

1. Abra o menu de conta na barra lateral
2. Clique em **"Definições de IA"** (imediatamente abaixo de "Alterar palavra-passe")
   - Visível apenas nos planos Lite / Pro / Enterprise
3. Selecione o seu fornecedor (OpenAI / Claude / Gemini / Personalizado)
4. Introduza a sua chave API do fornecedor selecionado
   - Consulte o site oficial do fornecedor para obter uma chave (ligação disponível no diálogo)
5. Introduza um nome de modelo (deixe em branco para usar o modelo predefinido)
6. Clique em **"Guardar"**

> **Eliminar a chave API:** Se já tiver uma chave API introduzida, aparece uma ligação "Eliminar chave API" no diálogo. Um clique elimina e guarda.

---

## 3. Como utilizar

1. Encontre o widget **"Geração de Blocos com IA"** na parte inferior da barra lateral na página do editor
2. Escreva a sua instrução no campo de entrada (ex.: `Fazer piscar o LED no pino 13 a cada segundo`)
3. Clique no botão **"Gerar"** ou prima `Ctrl+Enter` (Mac: `Cmd+Enter`)
4. Os blocos gerados serão adicionados à sua área de trabalho

> **Dica:** Os blocos gerados são **adicionados** aos blocos existentes — os blocos existentes não são removidos. Para recomeçar do zero, limpe manualmente a área de trabalho antes de gerar.

---

## 4. Como escolher um fornecedor

Os nomes de modelos, preços e limites de taxa mudam frequentemente — consulte a documentação oficial para detalhes atuais.

| Fornecedor | Nível gratuito | Facilidade de configuração | Custo | Obter chave API |
|---|---|---|---|---|
| **OpenAI** | Basicamente não (créditos iniciais em alguns casos) | Requer cartão de crédito | Médio | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Claude (Anthropic)** | Não (requer plano pago) | Requer cartão de crédito | Médio | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| **Google Gemini** | Sim, em alguns modelos | Conta Google (imediato) | Baixo a gratuito | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Personalizado (Ollama, etc.)** | — (servidor local) | Requer servidor local | Gratuito (apenas eletricidade) | — |

---

## 5. Dicas para melhores instruções

**Instruções mais específicas produzem melhores resultados.**

| Vago | Específico |
|---|---|
| "Enviar valor do sensor de temperatura" | "Enviar temperatura e humidade do DHT11 por MQTT" |
| "Mover para a frente" | "Avançar durante 2 segundos e depois parar" |
| "Medir distância" | "Medir distância com sensor ultrassónico HC-SR04 e imprimir na porta série" |

- **Use o vocabulário do modo**: para `robots_wheel`, use termos como "avançar", "virar à direita"; para `homeassistant`, use "publicar MQTT", "ligar WiFi"
- **Funciona em qualquer idioma**: instruções em português, inglês, japonês, chinês, etc. são todas suportadas

---

## 6. Resolução de problemas

| Sintoma | Causa / Solução |
|---|---|
| **Erro de rede (possível CORS)** | A sua chave API pode ser inválida ou ter expirado. Reintroduza uma chave válida nas Definições de IA |
| **Erro 429 (limite de taxa)** | Atingiu o limite de pedidos ou esgotou o nível gratuito. Verifique o painel do seu fornecedor |
| **Erro 404 (modelo não encontrado)** | O nome do modelo pode estar obsoleto ou ter mudado. Consulte os documentos oficiais do fornecedor |
| **Nenhum bloco aparece após a geração** | A geração falhou após 3 tentativas. Tente reescrever a instrução de forma mais específica |
| **Erro "chave API não configurada"** | Primeiro introduza e guarde a sua chave API nas Definições de IA |

---

## 7. Limitações conhecidas (MVP)

A geração atual de blocos com IA é uma versão inicial (MVP). Melhorias estão planeadas para futuras atualizações.

- **Apenas modo de adição**: Os blocos gerados são adicionados aos blocos existentes, não substituídos. Limpe a área de trabalho manualmente para recomeçar
- **Blocos WiFi/BLE não disponíveis nos modos robot**: Os modos `robots_wheel` / `robots_humanoid` / `robots_transform` não incluem categorias WiFi ou BLE. Mude para o modo `all_blocks` ou `generic` para usar WiFi/BLE com geração
- **Geração única**: Cada instrução gera uma vez. A IA não se lembra de gerações anteriores (modo conversacional ainda não implementado)

---

## 8. Privacidade e segurança

- **Armazenamento da chave API**: Armazenada em texto simples no localStorage do navegador. Existe risco de exposição via XSS. Não recomendamos o uso desta funcionalidade num dispositivo partilhado
- **Fluxo de dados**: As instruções e resultados gerados são enviados diretamente do seu navegador ao fornecedor de IA. Os servidores da DigiCo LLC não estão envolvidos
- **Faturação**: Os encargos de utilização são faturados diretamente na sua conta do fornecedor. A DigiCo LLC não tem qualquer envolvimento na faturação
