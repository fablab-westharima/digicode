# Carregamento de Programas - Passos Comuns

**Última atualização:** 2025-12-28

---

## Definições de Termos

| Termo | Descrição |
|-------|-----------|
| **Firmware** | Programa base DigiCode. Apenas USB, uma vez |
| **Programa** | Programa do utilizador. Pode ser atualizado a qualquer momento |

---

## Fluxo de Trabalho Geral

```
[Primeira Vez]
1. Carregar Firmware (USB) → 2. Configurar WiFi → 3. Carregar Programa

[Depois disso]
1. Editar Programa → 2. Carregar (WiFi OTA / BLE / USB)
```

---

## Diferença: Firmware vs Programa

| Aspeto | Firmware | Programa |
|--------|----------|----------|
| Frequência | Apenas inicial | A cada alteração |
| Método | Apenas USB | WiFi/BLE/USB |
| Conteúdo | Sistema OTA | Lógica do utilizador |
| Tempo | ~1 minuto | 10-30 segundos |

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| [Carregamento ESP32](./04-program-setup-esp32.md) | Configuração ESP32 |
| [Guia OTA](./05-ota-guide.md) | Configuração WiFi OTA |
| [Resolução de Problemas](./troubleshooting.md) | Problemas e soluções |
