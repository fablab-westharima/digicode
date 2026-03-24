# Perguntas Frequentes (FAQ)

## Conta e Início de Sessão

### P: É necessário registo de conta?

**R:** Sim, é necessário registo para guardar projetos e usar funcionalidades de compilação.

### P: Esqueci a minha palavra-passe

**R:** Funcionalidade de recuperação em desenvolvimento. Por favor contacte-nos.

### P: Posso iniciar sessão de múltiplos dispositivos?

**R:** Sim, pode iniciar sessão de múltiplos dispositivos com a mesma conta.

---

## Editor e Blocos

### P: Não consigo encontrar um bloco

**R:** Verifique:
1. **Modo robot** - Selecionou o modo apropriado?
2. **Categoria** - Expanda cada categoria
3. **Seleção de placa** - Blocos disponíveis mudam conforme placa

---

## Compilar e Carregar

### P: Compilação falha

**R:** Causas comuns:

| Erro | Solução |
|------|---------|
| Biblioteca não encontrada | Tente novamente |
| Erro de sintaxe | Verifique blocos não conectados |
| Sem memória | Remova blocos desnecessários |

### P: ESP32 não é reconhecido

**R:** Verifique:
1. Cabo USB compatível com dados
2. Driver CP2102/CH340 instalado
3. Tente porta USB diferente

---

## WiFi OTA

### P: Diferença entre OTA e USB?

| Método | Vantagem | Desvantagem |
|--------|----------|-------------|
| **USB** | Estável, rápido | Requer cabo |
| **WiFi OTA** | Sem fios | Requer configuração inicial |

---

## Hardware

### P: Que placa ESP32 devo usar?

**R:** Placas verificadas:
- **ESP32-DevKitC** - Recomendada
- **ESP32-WROOM-32** - Padrão
- **ESP32-S3** - Algumas limitações

---

## Documentos Relacionados

- [Primeiros Passos](./getting-started.md)
- [Referência de Blocos](./block-reference.md)
- [Resolução de Problemas](./troubleshooting.md)
