# Carregamento de Programas - Arduino

**Última atualização:** 2025-12-28

---

## Placas Compatíveis

- Arduino Uno
- Arduino Nano
- Arduino Leonardo

---

## Características do Arduino

- **Linguagem:** Arduino C++
- **Ligação:** USB ou adaptador FTDI
- **Formato:** Intel HEX ou Binary

---

## Passos de Carregamento

### Método 1: Ligação USB

1. Conecte Arduino ao PC
2. Gere binário no DigiCode
3. Carregue com avrdude ou Arduino IDE

### Método 2: Via FTDI

1. Conecte adaptador FTDI
2. Configure portas TX/RX
3. Carregue com avrdude

---

## Resolução de Problemas

| Sintoma | Solução |
|---------|---------|
| Porta não aparece | Instale driver USB |
| Programador não responde | Verifique baudrate |

---

## Documentos Relacionados

- [Passos Comuns](./01-program-setup-common.md)
- [Guia ESP32](./04-program-setup-esp32.md)
