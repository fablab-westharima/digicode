# Carregamento de Programas - RP2040

**Última atualização:** 2025-12-28

---

## Placas Compatíveis

- Raspberry Pi Pico
- Pimoroni Tiny 2040
- Outras placas baseadas em RP2040

---

## Características do RP2040

- **Bootloader:** Fixo em ROM
- **Método de ligação:** Apenas USB
- **Formato de carregamento:** UF2

---

## Passos de Carregamento

1. **Entrar em Modo Boot**
   - Desconecte RP2040 do PC
   - Mantenha BOOTSEL pressionado enquanto liga ao PC
   - Aparece unidade `RPI-RP2`

2. **Gerar Ficheiro UF2 no DigiCode**
   - Selecione placa **RP2040**
   - Crie programa
   - Clique em **Compilar** e **Transferir**

3. **Copiar Ficheiro UF2**
   - Arraste para unidade `RPI-RP2`

4. **Carregamento Completo**
   - RP2040 reinicia automaticamente

---

## Resolução de Problemas

| Sintoma | Solução |
|---------|---------|
| Unidade não aparece | Mantenha BOOTSEL pressionado |
| Sem resposta após cópia | Transfira novamente ficheiro UF2 |

---

## Documentos Relacionados

- [Passos Comuns](./01-program-setup-common.md)
- [Guia ESP32](./04-program-setup-esp32.md)
