# Lista de Hardware Recomendado

Lista de dispositivos verificados para DigiCode.

## Aviso Importante

> **Sobre Copias/Clones Baratos**
>
> Los clones baratos vendidos en AliExpress, Wish, Temu, etc. tienen problemas reportados:
> - Distribuciones de pines diferentes
> - Especificaciones de voltaje/corriente difieren de la etiqueta
> - ICs de driver diferentes (incompatibles)
> - Grandes variaciones de calidad
>
> No podemos proporcionar soporte para estos, por favor compra de vendedores recomendados.

---

## Placas ESP32

| Producto | Precio (aprox) | Notas |
|----------|----------------|-------|
| **ESP32 NodeMCU (con placa de expansión)** | €15-20 | **Más recomendado** |
| **ESP32-DevKitC-32E** | €12-15 | Placa de desarrollo estándar |
| **ESP32-DevKitC-VE** | €15-18 | 8MB Flash/RAM, mayor capacidad |

### Placas No Recomendadas

| Producto | Razón |
|----------|-------|
| NodeMCU-32S (versiones baratas) | Puede tener distribución de pines diferente |
| ESP32-CAM (OV2640) | Pocos pines, no apto para control de servos |
| ESP32-S2 | Distribución GPIO diferente |

---

## Servomotores

### Servos Recomendados (180 grados)

| Producto | Precio (aprox) | Uso |
|----------|----------------|-----|
| **SG90** | €3-5 | Estándar OTTO, carga ligera |
| **MG90S** | €8-10 | Engranaje metálico, carga media |
| **MG996R** | €10-12 | Alto torque, robots grandes |

### Servos de Rotación Continua

| Producto | Precio (aprox) | Uso |
|----------|----------------|-----|
| **FS90R** | €4-6 | Rotación continua, OTTO Wheel |

---

## Sensores

### Sensor Ultrasónico

| Producto | Precio (aprox) |
|----------|----------------|
| **HC-SR04** | €2-4 |

### Sensores de Temperatura/Humedad

| Producto | Precio (aprox) | Precisión |
|----------|----------------|-----------|
| **DHT11** | €3-5 | Temp ±2°C, Humedad ±5% |
| **DHT22** | €6-8 | Temp ±0.5°C, Humedad ±2% |
| **BME280** | €8-12 | Temp+Humedad+Presión |

---

## Pantallas (OLED)

| Producto | Tamaño | Precio (aprox) |
|----------|--------|----------------|
| **0.96" OLED** | 128x64 | €4-6 |

---

## NeoPixel (WS2812B)

| Producto | LEDs | Precio (aprox) |
|----------|------|----------------|
| **NeoPixel Ring 12LED** | 12 | €8-10 |
| **WS2812B Stick 8LED** | 8 | €3-4 |

---

## Drivers de Motor

| Producto | Corriente | Precio (aprox) |
|----------|-----------|----------------|
| **L298N** | 2A/ch | €5-8 |
| **TB6612FNG** | 1.2A/ch | €3-5 |

---

## Partes para Robot OTTO

### Configuración Recomendada (OTTO Bípedo)

| Parte | Recomendado | Cant | Precio Unit |
|-------|-------------|------|-------------|
| Placa ESP32 | ESP32 NodeMCU | 1 | €15 |
| Servo | SG90 | 4 | €3 |
| Sensor Ultrasónico | HC-SR04 | 1 | €2 |
| Buzzer | Altavoz Piezo | 1 | €1 |
| **Total** | | | **~€30** |

---

## Documentos Relacionados

- [Guía de Configuración de Hardware](./hardware-setup.md)
- [Solución de Problemas](./troubleshooting.md)
- [Primeros Pasos](./getting-started.md)
