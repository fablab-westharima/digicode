# Lista de Hardware Recomendado

**Última actualización:** 2026-04-21

Lista de dispositivos verificados para DigiCode. Recomendamos comprar en tiendas de confianza para garantizar un funcionamiento estable.

---

## Aviso Importante

> **Sobre copias baratas y clones**
>
> Los clones económicos vendidos en AliExpress, Wish, Temu, etc. tienen problemas reportados:
> - Distribución de pines diferente
> - Especificaciones de voltaje/corriente distintas a las indicadas
> - ICs de driver diferentes (incompatibles)
> - Gran variabilidad en la calidad
>
> No podemos ofrecer soporte para estos productos, por favor compra en las tiendas recomendadas.

---

## Tiendas Recomendadas

| Tienda | Características | URL |
|--------|----------------|-----|
| **Akizuki Denshi** | Componentes electrónicos clásico, amplia selección | https://akizukidenshi.com/ |
| **Switch Science** | Orientado a Makers, documentación en japonés | https://www.switch-science.com/ |
| **Sengoku Densho** | Tienda histórica de Akihabara, venta presencial | https://www.sengoku.co.jp/ |
| **Marutsu Online** | Soporte empresarial, garantía de calidad | https://www.marutsu.co.jp/ |
| **Tienda Oficial M5Stack** | Fuente primaria de la serie M5Stack | https://m5stack.com/ |
| **Seeed Studio Oficial** | Fuente primaria de la serie XIAO | https://www.seeedstudio.com/ |
| **DigiKey** | Distribuidor internacional autorizado | https://www.digikey.jp/ |
| **Mouser** | Distribuidor internacional autorizado | https://www.mouser.jp/ |

---

## Placas ESP32

DigiCode es un editor de bloques **exclusivo para placas basadas en ESP32**.

### ESP32 Genérico

| Producto | Precio aprox. | Notas | Enlace |
|---------|--------------|-------|--------|
| **ESP32 NodeMCU (con placa de expansión)** | ¥1,782 | Configuración versátil para principiantes. Conector DC (6.5–16V) incluido | [Switch Science](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1,480+ | Placa de desarrollo estándar, certificación TELEC | [Akizuki](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) |
| **ESP32-DevKitC-VE** | ¥1,770+ | 8MB Flash/RAM, gran capacidad | [Akizuki](https://akizukidenshi.com/catalog/g/g115674/) |
| **ESPr Developer 32** | ¥2,200 | Diseño japonés, certificación TELEC | [Switch Science](https://www.switch-science.com/products/3210) |

### Serie M5Stack

| Producto | Precio aprox. | Notas | Enlace |
|---------|--------------|-------|--------|
| **M5StampS3A + Placa de Expansión Dedicada** | — | **MCU principal recomendado por DigiCode (placa de expansión dedicada en desarrollo; detalles al lanzamiento)** | [M5Stack Oficial](https://shop.m5stack.com/) |
| **M5StickC Plus2** | ¥4,400 | Compacto, con pantalla | [Switch Science](https://www.switch-science.com/products/9426) |
| **ATOM Lite** | ¥1,815 | Ultra-compacto, 1 NeoPixel | [Switch Science](https://www.switch-science.com/products/6262) |
| **ATOM Matrix** | ¥2,420 | Matriz NeoPixel 5×5 | [Switch Science](https://www.switch-science.com/products/6260) |
| **M5Camera / Unit Cam S3 / Timer Cam** | ¥3,000+ | Módulos con cámara (compatible BP7) | [M5Stack Oficial](https://shop.m5stack.com/) |

### Serie Seeed XIAO

| Producto | Precio aprox. | Notas | Enlace |
|---------|--------------|-------|--------|
| **XIAO ESP32S3** | ¥1,100 | Ultra-compacto, USB-C | [Switch Science](https://www.switch-science.com/products/8887) |
| **XIAO ESP32S3 Sense** | ¥2,530 | Cámara + micrófono integrados (compatible BP7) | [Switch Science](https://www.switch-science.com/products/8868) |
| **XIAO ESP32C3** | ¥980 | Bajo consumo, RISC-V | [Switch Science](https://www.switch-science.com/products/8363) |
| **XIAO ESP32C6** | ¥1,280 | Compatible con Matter | [Seeed Studio](https://www.seeedstudio.com/Seeed-XIAO-ESP32C6-p-5884.html) |

### Compatible con Limitaciones

| Producto | Limitación |
|---------|-----------|
| ESP32-CAM (OV2640) | Pocos pines disponibles; no adecuado para control de servos (usar solo como cámara) |

### No Compatible con DigiCode

| Producto | Razón |
|---------|-------|
| Arduino Uno / Nano | DigiCode es exclusivo para ESP32; no compatible |
| Raspberry Pi Pico (base) | Sin WiFi; funcionalidad muy limitada |
| ESP8266 | DigiCode no soporta ESP8266 |
| Otros MCU (Renesas / STM, etc.) | Sin soporte planificado |

---

## Servomotores

### Servomotores Recomendados (180°)

| Producto | Precio aprox. | Uso | Enlace |
|---------|--------------|-----|--------|
| **SG90** | ¥440 | Estándar para robot bípedo, carga ligera | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1,240 | Engranaje metálico, carga media | [Akizuki](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | Alto torque | [Akizuki](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1,480 | Alto torque, robots grandes | [Akizuki](https://akizukidenshi.com/catalog/g/g112534/) |

### Servomotores Recomendados (Rotación Continua / 360°)

| Producto | Precio aprox. | Uso | Enlace |
|---------|--------------|-----|--------|
| **FS90R** | ¥500 | Rotación continua, para robots Wheel | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |

### Notas sobre el Uso de Servomotores

```
⚠️ Notas importantes sobre la alimentación
- Los servomotores son inestables con alimentación USB (500 mA)
- Usa alimentación externa (5V/2A o más) al ejecutar varios servos
- NO alimentes servos desde el pin 3.3V del ESP32 (requiere 5V)
```

---

## Sensores

### Sensores Ultrasónicos

| Producto | Precio aprox. | Uso | Enlace |
|---------|--------------|-----|--------|
| **HC-SR04** | ¥300+ | Sensor ultrasónico estándar | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) / [Switch Science](https://www.switch-science.com/products/6080) |
| **Sensor ToF VL53L0X** | ¥1,500+ | Medición de distancia de alta precisión (30–1200 mm) | [Switch Science](https://www.switch-science.com/products/7385) |

### Sensores de Temperatura, Humedad y Ambientales

| Producto | Precio aprox. | Precisión | Enlace |
|---------|--------------|----------|--------|
| **DHT11** | ¥550 | Temp ±2°C, Humedad ±5% | [Akizuki](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22 (AM2302)** | ¥1,160 | Temp ±0.5°C, Humedad ±2% | [Akizuki](https://akizukidenshi.com/catalog/g/g107002/) |
| **Módulo BME280** | ¥1,380+ | Temp + humedad + presión (alta precisión) | [Akizuki](https://akizukidenshi.com/catalog/g/g109421/) |
| **Módulo BMP280** | ¥550+ | Temp + presión (sin humedad) | [Akizuki](https://akizukidenshi.com/catalog/g/g109058/) |

### Sensores de Movimiento y Orientación

| Producto | Precio aprox. | Uso | Enlace |
|---------|--------------|-----|--------|
| **Módulo MPU6050** | ¥500+ | Acelerómetro + giroscopio (péndulo invertido, micromouse) | [Akizuki](https://akizukidenshi.com/catalog/g/g109026/) |
| **Módulo Encoder Magnético AS5600** | ¥600+ | Sensor de ángulo absoluto | [Switch Science](https://www.switch-science.com/products/9069) |

### Notas sobre HC-SR04

```
⚠️ Nota sobre niveles de voltaje
- HC-SR04 opera a 5V; ESP32 opera a 3.3V
- El pin Echo puede emitir 5V
- Usa un divisor de voltaje (1kΩ + 2kΩ) en el pin Echo
```

---

## Pantallas

### OLED (SSD1306)

| Producto | Tamaño | Precio aprox. | Enlace |
|---------|--------|--------------|--------|
| **OLED 0.96" (blanco)** | 128×64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g112031/) |
| **OLED 0.96" (azul)** | 128×64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g115870/) |

### LCD de Caracteres (I2C 16×2)

| Producto | Precio aprox. | Notas | Enlace |
|---------|--------------|-------|--------|
| **LCD de Caracteres I2C 16×2** | ¥800+ | Vía PCF8574, económico y popular | [Akizuki](https://akizukidenshi.com/catalog/g/g109109/) |

### TFT (ILI9341 / ST7789 / ST7735)

| Producto | Tamaño | Precio aprox. | Notas |
|---------|--------|--------------|-------|
| **TFT ST7789 1.3"** | 240×240 | ¥1,500+ | SPI, color |
| **TFT ILI9341 2.4"** | 240×320 | ¥1,800+ | SPI, pantalla grande |

---

## NeoPixel (WS2812B)

| Producto | LEDs | Precio aprox. | Enlace |
|---------|------|--------------|--------|
| **NeoPixel Ring 12LED** | 12 | ¥1,078 | [Switch Science](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1,287 | [Switch Science](https://www.switch-science.com/products/1537) |
| **Barra WS2812B 8LED** | 8 | ¥350 | [Akizuki](https://akizukidenshi.com/catalog/g/g114307/) |
| **Módulo WS2812B (individual)** | 1 | ¥70 | [Akizuki](https://akizukidenshi.com/catalog/g/g108414/) |

### Notas sobre Alimentación

```
⚠️ Consumo de corriente
- Hasta 60 mA por LED (blanco, brillo máximo)
- 8 LEDs = hasta 480 mA
- 16 LEDs = hasta 960 mA
- Las matrices grandes requieren alimentación externa (5V)
```

---

## Controladores de Motor

| Producto | Corriente nominal | Precio aprox. | Enlace |
|---------|-----------------|--------------|--------|
| **Controlador de Motor Dual L298N 2A** | 2A/ch | ¥2,180 | [Akizuki](https://akizukidenshi.com/catalog/g/g106680/) |
| **Módulo Driver de Motor DRV8835** | 1.2A/ch | ¥550 | [Akizuki](https://akizukidenshi.com/catalog/g/g109848/) |
| **Kit Driver Motor DC Dual TB6612FNG** | 1.2A/ch | ¥450 | [Akizuki](https://akizukidenshi.com/catalog/g/g111219/) / [Switch Science](https://www.switch-science.com/products/236) |

---

## Zumbadores y Audio

| Producto | Tipo | Precio aprox. | Enlace |
|---------|------|--------------|--------|
| **Altavoz Piezoeléctrico (Pasivo)** | Pasivo | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **DFPlayer Mini (Reproductor MP3)** | MP3 | ¥600+ | [Akizuki](https://akizukidenshi.com/catalog/g/g113277/) |

**DigiCode recomienda zumbadores pasivos** (con soporte para reproducción de melodías)

---

## Específico para Robots

### Configuración Recomendada (Humanoid Bípedo)

| Componente | Recomendado | Cant. | Precio unit. | Enlace |
|------------|-------------|-------|-------------|--------|
| Placa ESP32 | ESP32 NodeMCU (con placa expansión) | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Servo | SG90 | 4 | ¥440 | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| Sensor ultrasónico | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| Zumbador | Altavoz piezoeléctrico | 1 | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **Total** | | | **¥3,882** | |

> Una vez disponible el M5StampS3A + placa de expansión dedicada, se recomendará una configuración más compacta.

### Configuración Recomendada (Robot Wheel)

| Componente | Recomendado | Cant. | Precio unit. | Enlace |
|------------|-------------|-------|-------------|--------|
| Placa ESP32 | ESP32 NodeMCU (con placa expansión) | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| Servo de rotación continua | FS90R | 2 | ¥500 | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |
| Sensor ultrasónico | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| **Total** | | | **¥3,082** | |

---

## Documentos Relacionados

- [Guía de Conexión de Hardware](./hardware-setup.md)
- [Solución de Problemas](./troubleshooting.md)
- [Primeros Pasos](./getting-started.md)
