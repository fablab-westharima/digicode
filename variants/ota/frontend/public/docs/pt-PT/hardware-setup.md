# Guia de Configuração de Hardware

Como conectar sensores e atuadores ao ESP32.

## Distribuição de Pinos ESP32

### GPIO
- **GPIO 0-39**: E/S digital
- **GPIO 32-39**: Apenas entrada analógica
- **GPIO 0, 2**: LED integrado

### Pinos Especiais
- **GPIO 1, 3**: UART - evitar
- **GPIO 6-11**: Flash - não usar
- **GPIO 34-39**: Apenas entrada

### Alimentação
- **3.3V**: Para sensores
- **5V**: Via USB
- **GND**: Terra comum

## Ligações de Sensores

### Sensor Ultrassónico (HC-SR04)

```
HC-SR04    ESP32
VCC    →   3.3V ou 5V
GND    →   GND
Trig   →   GPIO 5
Echo   →   GPIO 18
```

### Sensor DHT11/DHT22

```
DHT        ESP32
VCC    →   3.3V
GND    →   GND
DATA   →   GPIO 4
```

## Ligações de Atuadores

### Servomotor

```
Servo      ESP32
VCC    →   5V (externa recomendada)
GND    →   GND
Signal →   GPIO 13
```

### NeoPixel

```
NeoPixel   ESP32
VCC    →   5V
GND    →   GND
DIN    →   GPIO 23
```

## Melhores Práticas

1. **Gestão de Alimentação**
   - 3.3V para sensores
   - Alimentação externa para motores
   - GND comum

2. **Prevenção de Ruído**
   - Distância entre motores e ESP32
   - Cabos curtos

---

## Documentos Relacionados

- [Hardware Recomendado](./recommended-hardware.md)
- [Resolução de Problemas](./troubleshooting.md)
