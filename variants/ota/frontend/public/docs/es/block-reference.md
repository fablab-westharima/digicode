# Referencia de Bloques

Lista completa de todos los bloques disponibles en DigiCode y cómo usarlos.

## Tabla de Contenidos

1. [Bloques Básicos](#bloques-básicos)
2. [Interrupciones y Tiempo](#interrupciones-y-tiempo)
3. [Datos (Arrays)](#datos-arrays)
4. [Sensores](#sensores)
5. [Actuadores](#actuadores)
6. [Pantalla](#pantalla)
7. [NeoPixel (LED)](#neopixel-led)
8. [Audio](#audio)
9. [Comunicación](#comunicación)
10. [Almacenamiento](#almacenamiento)
11. [Cámara](#cámara)
12. [Robot](#robot)
13. [Placas Compatibles](#placas-compatibles)

---

## Bloques Básicos

Bloques para la estructura básica del programa y el control de E/S del ESP32.

### Estructura del Programa

| Nombre del Bloque | Descripción | Notas |
|-------------------|-------------|-------|
| **Setup** | Se ejecuta una vez al inicio | Coloca el código de inicialización aquí |
| **Loop** | Procesamiento principal repetido | Coloca la lógica de sensores y control |

### E/S Digital

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Configurar Modo Pin** | Configura el modo de entrada/salida del pin | Número de pin, Modo (INPUT/OUTPUT/INPUT_PULLUP) |
| **Escritura Digital** | Salida HIGH/LOW al pin | Número de pin, Valor (HIGH/LOW) |
| **Lectura Digital** | Lee el estado del pin | Número de pin → true/false |
| **LED Interno ON** | Enciende el LED integrado del ESP32 (GPIO2) | — |
| **LED Interno OFF** | Apaga el LED integrado del ESP32 (GPIO2) | — |

### E/S Analógica

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Lectura Analógica** | Lee valor analógico | Número de pin (GPIO32-39 recomendado) → 0-4095 |
| **Salida PWM** | Salida de señal PWM | Número de pin, Ciclo de trabajo (0-255) |

### Tiempo y Temporización

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Esperar** | Espera el tiempo especificado | Tiempo (milisegundos) |
| **Tiempo Transcurrido** | Obtiene el tiempo transcurrido desde el inicio (ms) | → milisegundos |

### Comunicación Serial

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Iniciar Serial** | Inicializa la comunicación serial | Velocidad en baudios (9600/57600/115200) |
| **Imprimir Serial** | Envía al monitor serial | Valor de salida |
| **Imprimir Serial (con nueva línea)** | Salida con nueva línea | Valor de salida |

### Conversión Numérica

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Mapear Número** | Mapea un número a un rango diferente | Valor, Min/Max entrada, Min/Max salida → valor mapeado |

### Utilidades ESP32

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Reiniciar ESP32** | Reinicia el ESP32 | — |
| **Deep Sleep** | Entra en suspensión profunda (ahorro de energía) | Segundos (reinicia desde el principio al despertar) |
| **Light Sleep** | Entra en suspensión ligera | Segundos (continúa desde la siguiente línea al despertar) |
| **Memoria Libre (bytes)** | Obtiene la memoria heap disponible | → bytes |
| **ID del Chip ESP** | Obtiene el ID único del chip | → cadena |
| **Frecuencia CPU (MHz)** | Obtiene la frecuencia del reloj del CPU | → MHz |
| **Reproducir Tono** | Salida de sonido a la frecuencia especificada | Número de pin, Frecuencia (Hz), Duración (ms) |

---

## Interrupciones y Tiempo

Bloques para interrupciones de pin, temporizadores periódicos y recuperación de tiempo.

> **Nota:** Nunca llames `delay()` ni `Serial.print()` dentro de un manejador de interrupción — esto bloqueará el ESP32. Usa variables `volatile` para marcar eventos y manéjalos en el loop principal.

### Interrupciones de Pin

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Adjuntar Interrupción** | Llama al manejador cuando el pin cambia | Pin, Modo (RISING/FALLING/CHANGE), Manejador |
| **Eliminar Interrupción** | Elimina el manejador de interrupción | Pin |
| **Verificar Interrupción** | Verifica el flag de interrupción y ejecuta el manejador | Coloca dentro del loop |

### Temporizador (Ticker)

**Compatible:** Solo ESP32 (Ticker.h)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Iniciar Ticker** | Llama al manejador repetidamente en el intervalo | Intervalo (ms), Manejador |
| **Detener Ticker** | Detiene el temporizador periódico | — |
| **Verificar Ticker** | Verifica el flag del temporizador y ejecuta el manejador | Coloca dentro del loop |

### Sincronización NTP

**Compatible:** Placas con WiFi (requiere conexión WiFi)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Sincronizar NTP** | Sincroniza el tiempo con el servidor NTP | URL del servidor, Desfase de zona horaria (seg, JST=32400) |
| **Obtener Tiempo Unix** | Obtiene el timestamp Unix actual | → segundos |
| **Obtener Tiempo Formateado** | Obtiene el tiempo como cadena formateada | Formato (%Y-%m-%d %H:%M:%S etc.) → cadena |
| **Obtener Componente de Tiempo** | Obtiene año/mes/día/hora/min/seg | Selección → número |

### RTC (Reloj en Tiempo Real)

**Librería:** RTClib (preinstalada en Dockerfile)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar RTC** | Inicializa DS3231/DS1307 via I2C | Selección de modelo |
| **Establecer Tiempo RTC** | Establece fecha/hora en el RTC | Año/Mes/Día/Hora/Min/Seg |
| **Obtener RTC** | Obtiene año/mes/día/hora/min/seg/tiempo unix | Selección → número |
| **Tiempo RTC Formateado** | Obtiene el tiempo como "YYYY-MM-DD HH:MM:SS" | → cadena |

---

## Datos (Arrays)

Bloques para operaciones con arrays.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Crear Array** | Crea array 1D/2D/3D | Nombre de variable, Tipo, Dimensiones, Tamaño |
| **Establecer Elemento** | Establece valor en índice del array | Nombre de variable, Índice, Valor |
| **Obtener Elemento** | Obtiene valor del índice del array | Nombre de variable, Índice → Valor |
| **Tamaño del Array** | Obtiene el número de elementos | Nombre de variable → número |
| **Contenido del Array** | Define los valores iniciales | Número de elementos, Cada valor |

---

## Sensores

### Sensor Ultrasónico (HC-SR04)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar HC-SR04** | Inicializa el sensor ultrasónico | Pin Trig, Pin Echo |
| **Distancia Ultrasónica (cm)** | Mide la distancia | → cm |

**Conexión:** Trig→GPIO18 / Echo→GPIO19 / VCC→5V / GND→GND

### RUS-04 (Sensor Ultrasónico con RGB)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar RUS-04** | Inicializa sensor y LEDs RGB | Pin Trig/Echo/RGB, Cantidad de LEDs |
| **Distancia RUS-04 (cm)** | Mide la distancia | → cm |
| **RGB Ambos Ojos RUS-04** | Establece color de ambos ojos | Color izquierdo, Color derecho |
| **RGB Ojo RUS-04** | Establece color de un ojo | Izquierdo/Derecho, Color |
| **Brillo RGB RUS-04** | Establece el brillo del LED | 0-255 |
| **Apagar RGB RUS-04** | Apaga los LEDs | — |

### Sensor de Temperatura/Humedad (DHT11/DHT22)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar DHT** | Inicializa el sensor DHT | Tipo (DHT11/DHT22), Pin |
| **Temperatura DHT (°C)** | Obtiene temperatura | → Celsius |
| **Humedad DHT (%)** | Obtiene humedad | → porcentaje |

### Sensores Digitales

| Nombre del Bloque | Descripción | Detecta |
|-------------------|-------------|---------|
| **Botón** | Botón/Interruptor | Estado de pulsación |
| **Sensor de Movimiento PIR** | Sensor infrarrojo de movimiento | Movimiento |
| **Sensor de Inclinación** | Sensor de inclinación | Inclinación |
| **Sensor de Vibración** | Sensor de vibración/impacto | Vibración |
| **Sensor Magnético** | Sensor de efecto Hall | Imán |
| **Interruptor Fotoeléctrico** | Sensor de ruptura infrarroja | Ruptura |
| **Sensor de Obstáculo IR** | Sensor infrarrojo de obstáculos | Obstáculo |
| **Sensor de Llama (Digital)** | Detección de llama | Fuego |
| **Sensor de Gas (Digital)** | Sensor de gas serie MQ | Gas |
| **Interruptor de Límite** | Microinterruptor | Contacto |
| **Lectura Digital** | Lectura digital genérica | → HIGH/LOW |

### Sensores Analógicos

| Nombre del Bloque | Descripción | Salida |
|-------------------|-------------|--------|
| **Potenciómetro** | Resistencia variable | Crudo/Porcentaje/Ángulo |
| **Sensor de Luz (LDR)** | Sensor de luz CdS | Crudo/Porcentaje |
| **Temperatura Termistor** | Termistor NTC | Celsius |
| **Temperatura LM35** | Sensor de temperatura LM35 | Celsius |
| **Sensor de Gas (Analógico)** | Salida analógica MQ | 0-4095 |
| **Humedad del Suelo** | Sensor de humedad del suelo | Crudo/Porcentaje |
| **Sensor de Nivel de Agua** | Sensor de nivel de agua | Crudo/Porcentaje |
| **Sensor de Llama (Analógico)** | Salida analógica de llama | 0-4095 |
| **Sensor IR Reflectivo** | Sensor reflectivo infrarrojo | 0-4095 |
| **Joystick** | Palanca analógica de 2 ejes | Eje X/Eje Y |
| **Lectura Analógica** | Lectura analógica genérica | → 0-4095 |
| **Voltaje de Batería (V)** | Mide el voltaje de la batería via divisor de tensión | Pin ADC, Relación del divisor → V |
| **% de Batería** | Convierte voltaje a porcentaje | Voltaje, Min V, Max V → % |

### Sensor Táctil (Integrado en ESP32)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Sensor Táctil** | Inicializa el sensor táctil capacitivo | Pin (T0-T9), Umbral |
| **¿Tocado?** | Detecta toque | → true/false |
| **Valor Sensor Táctil** | Obtiene valor capacitivo crudo | → número (menor = toque más fuerte) |

**Pines compatibles:** T0(GPIO4) / T2(GPIO2) / T3(GPIO15) etc.

### Sensor de Sonido

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Sensor de Sonido** | Inicializa el sensor de micrófono | Pin ADC (GPIO32-39) |
| **Nivel de Sonido** | Obtiene el nivel de volumen | → 0-4095 |
| **¿Sonido Detectado?** | Detecta sonido por encima del umbral | Umbral → true/false |

### Sensor de Luz (CdS)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Sensor de Luz** | Inicializa el sensor CdS | Pin ADC (GPIO32-39) |
| **Nivel de Luz** | Obtiene el brillo | → 0-4095 (mayor = más brillante) |

### Sensores de Línea (QTR/TCRT)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar QTR-8A** | Inicializa sensor QTR analógico | Número de sensores, Cada pin |
| **Inicializar QTR-8RC** | Inicializa sensor QTR digital | Número de sensores, Cada pin |
| **Calibrar QTR** | Calibración manual | — |
| **Calibración Automática QTR** | Calibración automática | — |
| **Posición de Línea QTR** | Obtiene posición de línea (0-7000) | → valor de posición |
| **Posición de Línea QTR (Normalizada)** | Normalizado de -1.0 a 1.0 | → flotante |
| **Valor Sensor QTR** | Obtiene valor individual del sensor | Número de sensor → valor |
| **Leer Todo QTR** | Lee todos los sensores a la vez | — |
| **Valor Crudo QTR** | Valor antes de calibración | Número de sensor → valor |
| **¿Línea Detectada QTR?** | Verifica si se detecta línea | → true/false |
| **¿QTR Calibrado?** | Verifica el estado de calibración | → true/false |
| **Control Emisor QTR** | Enciende/apaga los LEDs emisores | ON/OFF |

**Sensor de Línea Genérico (TCRT5000 etc.):**

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Sensor de Línea** | Inicializa sensor de línea genérico | Número de sensores (2-8), Cada pin |
| **Inicializar Sensor de Línea (Simple)** | Configuración izquierda/derecha de 2 sensores | Pin izquierdo, Pin derecho |
| **Inicializar Sensor de Línea (3 sensores)** | Configuración de 3 sensores | Pines izquierdo/centro/derecho |
| **Calibrar Sensor de Línea** | Ejecuta calibración | — |
| **Posición Sensor de Línea** | Obtiene posición de línea | → -100 a 100 |
| **Valor Sensor de Línea** | Lee sensor individual | Número de sensor → 0/1 |
| **¿Línea Detectada?** | Verifica si está sobre la línea | → true/false |
| **Valor Crudo Sensor de Línea** | Valor analógico crudo | Número de sensor → valor |

### Sensores de Pared (Micromouse)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Sensor de Pared** | Inicializa sensores IR de pared | Número de sensores, Cada pin |
| **¿Pared Presente?** | Detecta pared en dirección | Dirección (frente/izquierda/derecha) → true/false |
| **Valor Sensor de Pared** | Obtiene valor de reflexión crudo | Número de sensor → valor |
| **Error Sensor de Pared** | Obtiene el error de posición respecto a la pared | → valor |
| **Información Sensor de Pared** | Obtiene estados de todos los sensores | — |
| **Leer Sensor de Pared** | Actualiza los valores del sensor | — |
| **Umbral Sensor de Pared** | Establece umbral de detección de pared | Umbral |

### Encoders

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Encoder** | Inicializa el encoder rotativo | Pines A/B |
| **Distancia Encoder** | Obtiene la distancia recorrida | → mm |
| **Velocidad Encoder** | Obtiene la velocidad actual | → mm/s |
| **Conteo Encoder** | Obtiene el conteo de pulsos | → número |
| **Resetear Encoder** | Resetea el conteo | — |
| **Esperar Distancia Encoder** | Espera hasta recorrer la distancia especificada | Distancia (mm) |

### MPU6050 (Acelerómetro/Giroscopio)

**Librería:** Adafruit MPU6050 (preinstalada) / **Conexión:** SDA/SCL

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar MPU6050** | Inicializa via I2C | Rango de acelerómetro, Rango de giroscopio |
| **Actualizar MPU6050** | Lee sensor y actualiza ángulos | Coloca en el loop |
| **Aceleración** | Obtiene aceleración en el eje (m/s²) | X/Y/Z → m/s² |
| **Giroscopio** | Obtiene velocidad angular (rad/s) | X/Y/Z → rad/s |
| **Temperatura MPU6050** | Obtiene temperatura del chip | → °C |
| **Obtener Ángulo** | Obtiene Pitch/Roll (filtro complementario) | Pitch/Roll → grados |
| **Calibrar MPU6050** | Calibra en reposo | Número de muestras |

### BME280 (Presión/Temperatura/Humedad) / BMP280 (Presión/Temperatura)

**Librería:** Adafruit BME280 / Adafruit BMP280 (preinstaladas)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar BME280** | Inicializa via I2C | Dirección I2C (0x76/0x77) |
| **Leer BME280** | Obtiene temperatura/humedad/presión | Selección de elemento → valor |
| **Inicializar BMP280** | Inicializa via I2C (sin humedad) | Dirección I2C |
| **Leer BMP280** | Obtiene temperatura/presión | Selección de elemento → valor |
| **Altitud BMP280 (m)** | Calcula altitud desde la presión | Presión a nivel del mar (hPa, estándar: 1013.25) → m |

### VL53L0X (Sensor de Distancia ToF)

**Librería:** Adafruit VL53L0X (preinstalada) / **Rango:** 30–1200mm

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar VL53L0X** | Inicializa sensor ToF (I2C, 0x29) | → true/false |
| **Distancia VL53L0X (mm)** | Obtiene distancia | → mm (0 en error) |

### AS5600 (Encoder Magnético)

**Librería:** Seeed_Arduino_AS5600 (preinstalada) / **Conexión:** SDA/SCL

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar AS5600** | Inicializa encoder magnético (I2C, 0x36) | → true/false |
| **Ángulo AS5600 (°)** | Obtiene ángulo absoluto (0–360°) | → grados (resolución 0.088°) |
| **Valor Crudo AS5600 (0-4095)** | Obtiene valor de 12 bits | → 0-4095 |

---

## Actuadores

### Servomotor

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Conectar Servo** | Conecta el servo al pin | Número de pin |
| **Ángulo Servo** | Rota el servo al ángulo | Pin, Ángulo (0-180°) |
| **Ángulo Servo (Variable)** | Establece ángulo desde variable | Pin, Valor de ángulo |
| **Desconectar Servo** | Desconecta el servo (ahorro de energía) | Pin |
| **Barrido Servo** | Mueve del ángulo inicial al final | Pin, Ángulo inicial, Ángulo final, Velocidad |

### Motor DC (L298N)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Motor** | Inicializa el driver de motor L298N | Motor (A/B), Pines IN1/IN2/ENA |
| **Acción Motor** | Controla el motor | Motor, Dirección (Adelante/Atrás/Stop), Velocidad (0-255) |
| **Velocidad Motor** | Cambia solo la velocidad | Motor, Velocidad |
| **Detener Motor** | Detiene el motor | Motor (A/B/Ambos) |

### Motor Paso a Paso (28BYJ-48)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Stepper** | Inicializa el 28BYJ-48 | Pines IN1-IN4 |
| **Mover Stepper** | Mueve por número de pasos | Pasos, Dirección |
| **Rotar Stepper** | Rota por ángulo | Ángulo, Dirección |
| **Detener Stepper** | Detiene el motor paso a paso | — |

---

## Pantalla

### Pantalla OLED (SSD1306)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar OLED** | Inicializa OLED I2C | Ancho (64/128), Alto (32/64), Pines SDA/SCL |
| **Mostrar OLED** | Muestra texto | Texto, Coordenadas X/Y, Tamaño (Pequeño/Mediano/Grande) |
| **Limpiar OLED** | Limpia la pantalla | — |
| **Actualizar OLED** | Aplica el buffer de pantalla | — |
| **Dibujar Línea OLED** | Dibuja una línea | X1,Y1,X2,Y2 |
| **Dibujar Rectángulo OLED** | Dibuja un rectángulo | X,Y,Ancho,Alto, Relleno/Contorno |

### Pantalla LCD de Caracteres (I2C 16x2)

**Librería:** LiquidCrystal_I2C (preinstalada) / Direcciones I2C comunes: 0x27 o 0x3F

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar LCD** | Inicializa LCD I2C | Columnas, Filas, Dirección I2C |
| **Imprimir LCD** | Imprime texto en la posición actual | Texto |
| **Imprimir LCD En** | Imprime en (col, fila) | Columna, Fila, Texto |
| **Limpiar LCD** | Borra todo el texto, cursor al inicio | — |
| **Retroiluminación LCD** | Enciende/apaga la retroiluminación | ON/OFF |

### Pantalla TFT (ILI9341 / ST7789 / ST7735)

**Conexión:** SPI (SPI por hardware)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar TFT** | Inicializa TFT | Driver, Pines CS/DC/RST |
| **Rellenar Pantalla TFT** | Rellena toda la pantalla con un color | Color |
| **Píxel TFT** | Dibuja un píxel | X,Y, Color |
| **Línea TFT** | Dibuja una línea | X1,Y1,X2,Y2, Color |
| **Rectángulo TFT** | Dibuja un rectángulo | X,Y,Ancho,Alto, Relleno, Color |
| **Círculo TFT** | Dibuja un círculo | X,Y,Radio, Relleno, Color |
| **Cursor TFT** | Establece posición/tamaño/color del cursor de texto | X,Y, Tamaño, Color |
| **Imprimir TFT** | Imprime texto en la posición del cursor | Texto |
| **Color RGB TFT** | Genera código de color de 16 bits desde R/G/B | R,G,B (0-255 cada uno) → valor de color |

---

## NeoPixel (LED)

Controla LEDs direccionables como WS2812B.

### Operaciones Básicas

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar NeoPixel** | Inicializa la tira LED | Pin, Cantidad de LEDs |
| **Color LED** | Establece color del LED individual | Índice, R/G/B (0-255) |
| **Color Todos LEDs** | Establece todos los LEDs al mismo color | R/G/B (0-255) |
| **Mostrar NeoPixel** | Aplica los colores (llamar después de cambios) | — |
| **Apagar NeoPixel** | Apaga todos los LEDs | — |
| **Brillo NeoPixel** | Establece el brillo general | 0-255 |

### Efectos

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Efecto Arcoíris** | Animación arcoíris | Velocidad |
| **Efecto Rebote** | LED rebotando | Color, Velocidad |
| **Efecto Ciclo** | Efecto rotativo | Color, Velocidad |

### Operaciones Simples (nombre de color)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Color Todos (Simple)** | Establece todos los LEDs por nombre de color | Color (Rojo/Verde/Azul/Amarillo/Púrpura/Cian/Blanco/Apagado etc.) |
| **LED # Color (Simple)** | Establece LED individual por nombre de color | Índice, Color |

---

## Audio

### Zumbador / Altavoz

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Tono Zumbador** | Reproduce tono | Pin, Nota (Do-Si/Hz personalizado), Duración (ms) |
| **Detener Zumbador** | Detiene el sonido | Pin |
| **Reproducir Melodía** | Reproduce melodía preestablecida | Pin, Melodía (Inicio/Éxito/Error/Completado) |

### DFPlayer Mini (Reproducción MP3)

**Conexión:** DFPlayer TX→ESP32 RX, DFPlayer RX (resistencia 1kΩ)→ESP32 TX

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar DFPlayer** | Inicializa el DFPlayer Mini | Pin RX, Pin TX |
| **Reproducir DFPlayer** | Reproduce la pista especificada | Número de pista (1–999) |
| **Pausar DFPlayer** | Pausa la reproducción | — |
| **Reanudar DFPlayer** | Reanuda desde pausa | — |
| **Detener DFPlayer** | Detiene la reproducción | — |
| **Volumen DFPlayer** | Establece el nivel de volumen | 0-30 (30 = máximo) |

---

## Comunicación

### WiFi

**Compatible:** Placas con WiFi (serie ESP32 / Pico W)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **📶 Conectar WiFi** | Conecta a la red WiFi | SSID, Contraseña |
| **WiFi Conectado** | Verifica el estado de conexión | → true/false |
| **Reconectar WiFi** | Intenta reconectar si está desconectado | — |
| **Dirección IP WiFi** | Obtiene la dirección IP actual | → cadena |
| **Señal WiFi (RSSI)** | Obtiene la intensidad de la señal (dBm) | → dBm |

### Cliente HTTP

**Requiere:** Conexión WiFi

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **HTTP GET** | Envía solicitud HTTP GET | URL → cadena de respuesta |
| **HTTP GET (con encabezados)** | GET con encabezados personalizados | URL, Nombre/Valor del encabezado → respuesta |
| **HTTP POST** | Envía solicitud HTTP POST | URL, Cuerpo → respuesta |
| **HTTP POST JSON** | Envía datos JSON via POST | URL, Cadena JSON → respuesta |
| **HTTP PUT** | Envía solicitud HTTP PUT | URL, Cuerpo → respuesta |
| **HTTP DELETE** | Envía solicitud HTTP DELETE | URL → respuesta |
| **Último Estado HTTP** | Obtiene el último código de estado | → número |
| **¿Éxito (2xx)?** | Verifica si la última respuesta fue exitosa | → true/false |
| **Codificar URL** | Codifica una cadena en formato URL | Cadena → cadena codificada |
| **Construir URL** | Construye URL con parámetros de consulta | URL base, Parámetros |

### Cliente MQTT

**Requiere:** Conexión WiFi. Se necesita un broker MQTT separado (Mosquitto / Home Assistant etc.).

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Configurar MQTT** | Configura WiFi y broker MQTT | SSID/PW, Broker, Puerto, ID de cliente |
| **Conectar a Broker MQTT** | Conecta al broker | Usuario/Contraseña (opcional) |
| **Publicar MQTT** | Publica mensaje en el tema | Tema, Mensaje, Flag de retención |
| **Suscribir MQTT** | Suscribe al tema | Tema |
| **MQTT Al Recibir Mensaje** | Maneja el mensaje recibido | Manejador (usa variables de tema/mensaje recibidos) |
| **Loop MQTT** | Mantiene la conexión MQTT (en el loop) | — |
| **MQTT Conectado** | Verifica el estado de conexión | → true/false |
| **Desconectar MQTT** | Desconecta del broker | — |
| **Cancelar Suscripción MQTT** | Cancela la suscripción al tema | Tema |
| **Tamaño Buffer MQTT** | Establece el tamaño del buffer de recepción | Bytes |
| **Keepalive MQTT** | Establece el intervalo de keepalive | Segundos |
| **Última Voluntad MQTT** | Establece el mensaje de última voluntad | Tema, Mensaje |
| **Conectar a Broker MQTT (con LWT)** | Conecta con última voluntad | Usuario/Contraseña |
| **Estado Conexión MQTT** | Obtiene el código de estado de conexión | → número (-4 a 5) |
| **Publicar MQTT (QoS)** | Publica con configuración de QoS | Tema, Mensaje, QoS (0/1/2) |

### JSON

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Parsear JSON** | Parsea la cadena JSON | Cadena JSON |
| **Parsear JSON (con tamaño)** | Parsea con tamaño de buffer | Cadena JSON, Bytes del buffer |
| **Obtener Cadena JSON** | Obtiene valor de cadena por clave | Clave → cadena |
| **Obtener Número JSON** | Obtiene valor numérico por clave | Clave → número |
| **Obtener Entero JSON** | Obtiene valor entero por clave | Clave → entero |
| **Obtener Booleano JSON** | Obtiene valor booleano por clave | Clave → true/false |
| **Obtener JSON Anidado** | Obtiene valor anidado por ruta | Ruta, Tipo → valor |
| **¿Tiene Clave JSON?** | Verifica si la clave existe | Clave → true/false |
| **Tamaño Array JSON** | Obtiene el número de elementos del array | Clave → número |
| **Obtener Elemento Array JSON** | Obtiene elemento del array | Clave, Índice, Tipo → valor |
| **Crear JSON** | Inicia la creación de un objeto JSON | — |
| **Establecer Cadena JSON** | Establece valor de cadena para clave | Clave, Valor |
| **Establecer Número JSON** | Establece valor numérico para clave | Clave, Valor |
| **Establecer Booleano JSON** | Establece valor booleano para clave | Clave, Valor |
| **JSON a Cadena** | Convierte JSON a cadena | → cadena |
| **JSON a Cadena (Formateado)** | Convierte JSON a cadena formateada | → cadena |
| **JSON Simple** | Construye JSON desde 2 pares clave/valor | Clave1/Valor1, Clave2/Valor2 → cadena JSON |

### Integración con Home Assistant (HA)

> Los bloques de HA requieren un broker MQTT y Home Assistant ya configurados. Primero configura la conexión usando los bloques MQTT.

**Registro del Dispositivo:**

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Dispositivo HA** | Inicializa como dispositivo HA | Broker, Nombre del dispositivo, ID del dispositivo |
| **Inicializar Dispositivo HA (con auth)** | Inicializa con autenticación | Broker, Nombre, ID, Usuario/Contraseña |
| **Loop HA** | Mantiene la conexión HA (en el loop) | — |
| **HA Conectado** | Verifica la conexión HA | → true/false |
| **Intervalo de Reporte HA** | Ejecuta manejador cada N segundos | Segundos, Manejador |

**Tipos de entidades:**

| Tipo de Entidad | Bloque de Creación | Comando / Reporte |
|-----------------|-------------------|-------------------|
| **Sensor** | Crear Sensor HA (Temperatura/Humedad etc.) | Actualizar Sensor HA |
| **Sensor Binario** | Crear Sensor Binario HA (Movimiento/Puerta etc.) | Actualizar Sensor Binario HA |
| **Interruptor** | Crear Interruptor HA | Interruptor HA Al Recibir Comando / Reportar Estado |
| **Luz (ON/OFF)** | Crear Luz HA | Luz HA Al Cambiar Estado / Reportar Estado |
| **Luz (RGB)** | Crear Luz HA (RGB) | Luz HA Al Cambiar RGB / Reportar RGB |
| **Botón** | Crear Botón HA | Botón HA Al Presionar |
| **Número Deslizante** | Crear Número HA (mín/máx/paso) | Número HA Al Cambiar / Establecer Número HA |
| **Ventilador** | Crear Ventilador HA | Ventilador HA Al Cambiar Estado / ON/OFF |
| **Cubierta** | Crear Cubierta HA (Persiana/Cortina etc.) | Cubierta HA Al Recibir Comando / Establecer Estado |
| **Disparador** | Crear Disparador HA | Disparar HA |
| **Escena** | Crear Escena HA | Escena HA Al Ejecutar |
| **Escáner de Etiquetas** | Crear Escáner de Etiquetas HA | Escanear Etiqueta HA |

### OTA (Actualización de Firmware por Aire)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Configurar OTA** | Configura OTA | Nombre de host, Contraseña OTA (opcional) |
| **Configurar OTA Simple** | Habilita OTA con configuración mínima | — |
| **Loop OTA** | Maneja solicitudes OTA (en el loop) | — |
| **Nombre de Host OTA** | Obtiene el nombre de host OTA | → cadena |

### BLE (Bluetooth de Baja Energía)

**Compatible:** Solo ESP32 (Pico W no soporta BLE) / **Librería:** NimBLE-Arduino (preinstalada)

**Nordic UART Service (NUS) — comunicación serial con smartphone:**

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Configurar BLE UART** | Inicia el servicio NUS | Nombre del dispositivo |
| **Enviar BLE** | Envía cadena al teléfono | Texto |
| **BLE Al Recibir** | Maneja datos recibidos (variable bleMessage) | Manejador |
| **¿BLE Conectado?** | Verifica el estado de conexión | → true/false |
| **Desconectar BLE** | Desconecta y reinicia la publicidad | — |

**Servidor GATT Personalizado:**

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar BLE** | Inicializa la pila BLE | Nombre del dispositivo |
| **Agregar Servicio GATT** | Crea servicio GATT personalizado | UUID del servicio |
| **Agregar Característica** | Agrega característica | UUID de servicio, UUID de característica, leer/escribir/notificar |
| **Notificación BLE** | Envía notificación via característica | UUID de característica, Valor |
| **BLE Al Escribir** | Maneja escritura en característica | UUID de característica, Manejador |
| **Iniciar Publicidad BLE** | Inicia la publicidad BLE | — |

**iBeacon y Escaneo:**

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Transmitir iBeacon** | Transmite como iBeacon | UUID, Major, Minor |
| **Iniciar Escaneo BLE** | Escanea dispositivos BLE cercanos | Duración (seg) |
| **BLE Al Encontrar Dispositivo** | Maneja dispositivo descubierto (bleFoundName / bleFoundAddress / bleFoundRssi) | Manejador |
| **RSSI BLE** | Obtiene la intensidad de señal del dispositivo conectado | → dBm |

### Cliente WebSocket

**Requiere:** Conexión WiFi

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Conectar WebSocket** | Conecta al servidor WebSocket | Host, Puerto, Ruta → true/false |
| **Enviar WebSocket** | Envía mensaje de texto | Texto |
| **WebSocket Al Recibir Mensaje** | Maneja datos recibidos (variable wsMessage) | Manejador |
| **¿WebSocket Conectado?** | Verifica el estado de conexión | → true/false |
| **Desconectar WebSocket** | Cierra la conexión | — |

### UART2/3 (Serial 2/3)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Serial2** | Inicializa Serial2 (UART2) | Velocidad en baudios, Pin RX, Pin TX (por defecto: RX=16, TX=17) |
| **Imprimir Serial2** | Envía datos (sin nueva línea) | Datos |
| **Imprimir Serial2 (con nueva línea)** | Envía datos con nueva línea | Datos |
| **Leer Serial2** | Lee 1 byte | → número (-1 = sin datos) |
| **Leer Serial2 Hasta** | Lee hasta el carácter terminador | Terminador → cadena |
| **Disponible Serial2** | Obtiene bytes disponibles en el buffer de recepción | → número |

### Control Remoto IR

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Receptor IR** | Inicializa el receptor IR | Pin |
| **Código Recibido IR** | Obtiene el código IR recibido (cadena hex) | → cadena ("0" sin señal) |
| **Inicializar Emisor IR** | Inicializa el LED emisor IR | Pin |
| **Enviar IR** | Envía señal IR | Protocolo, Código (hex) |

### RFID (MFRC522 / M5Stack RFID2 Unit)

> **Regulaciones de Radio:** En Japón, usar un MFRC522 sin certificación puede violar la Ley de Radio. Para uso en Japón, se recomienda la **M5Stack RFID 2 Unit** (certificada).

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar RFID (M5Stack)** | Inicializa M5Stack RFID 2 Unit via I2C (certificado) | — |
| **⚠️ Inicializar RFID (Genérico)** | Inicializa MFRC522 genérico via SPI (verificar certificación) | Pin CS, Pin RST |
| **¿Tarjeta RFID Presente?** | Detecta tarjeta/etiqueta | → true/false |
| **Leer UID RFID** | Obtiene el UID de la tarjeta (cadena hex) | → ej. "04:A3:B5:C9" |
| **Leer Datos RFID** | Lee 16 bytes del bloque (0-63) | Número de bloque → cadena |
| **Escribir Datos RFID** | Escribe hasta 16 caracteres en el bloque | Número de bloque, Datos → true/false |

### CAN Bus (ESP32-TWAI)

**Compatible:** Solo ESP32 (controlador TWAI integrado) / Requiere IC transceptor CAN externo (ej. SN65HVD230)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar CAN** | Inicializa el bus CAN | Pin TX, Pin RX, Velocidad en baudios → true/false |
| **Enviar CAN** | Envía mensaje CAN | ID (entero), Datos (cadena máx 8 bytes) |
| **¿Mensaje CAN Disponible?** | Verifica si hay nuevo mensaje CAN | → true/false |
| **ID Recibido CAN** | Obtiene el ID del último mensaje recibido | → número |
| **Datos Recibidos CAN** | Obtiene los datos del último mensaje recibido | → cadena |

### I2C / SPI Bajo Nivel

Para acceso directo a dispositivos no cubiertos por los bloques de sensores de alto nivel.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **🔍 Escanear I2C** | Imprime todas las direcciones de dispositivos I2C en Serial | — |
| **📡 Escribir I2C** | Escribe bytes en el dispositivo I2C | Dirección, Datos |
| **📡 Leer I2C** | Lee bytes del dispositivo I2C | Dirección, Número de bytes → valor |
| **📡 Escribir Registro I2C** | Escribe en el registro del dispositivo | Dirección, Registro, Valor |
| **📡 Leer Registro I2C** | Lee del registro del dispositivo | Dirección, Registro → valor |
| **🔌 Inicializar SPI** | Inicializa SPI con pin CS | Pines SCK/MOSI/MISO/CS |
| **🔌 Transferir SPI** | Envía y recibe 1 byte via SPI | Datos → byte de respuesta |

---

## Almacenamiento

### NVS / Preferences (Almacén Clave-Valor)

Almacena datos persistentemente en la memoria flash del ESP32. Los datos sobreviven a los reinicios.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Abrir Preferences** | Abre el espacio de nombres | Espacio de nombres, Flag de solo lectura |
| **Cerrar Preferences** | Cierra y libera recursos | — |
| **Guardar Preferences** | Guarda valor por clave (int/float/string) | Clave, Valor |
| **Leer Preferences** | Recupera valor por clave | Clave, Valor por defecto → valor |
| **Eliminar Preferences** | Elimina una clave | Clave |
| **Limpiar Preferences** | Elimina todas las claves en el espacio de nombres | — |

### EEPROM (Almacén Dirección-Valor)

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Escribir EEPROM** | Escribe 1 byte en la dirección | Dirección, Valor (0-255) |
| **Leer EEPROM** | Lee 1 byte de la dirección | Dirección → valor |

### Tarjeta SD

**Conexión:** SPI (especifica pin CS) / Se recomienda formato FAT32

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar SD** | Inicializa la tarjeta SD | Pin CS → true/false |
| **Escribir SD** | Escribe en el archivo | Nombre de archivo, Contenido, Añadir/Sobreescribir |
| **Leer SD** | Lee el contenido del archivo | Nombre de archivo → cadena |
| **¿Existe SD?** | Verifica si existe el archivo/directorio | Ruta → true/false |
| **Eliminar SD** | Elimina el archivo | Nombre de archivo |
| **Añadir CSV SD** | Añade una fila de datos CSV | Nombre de archivo, Col1/Col2/Col3 |

### LittleFS (Flash Integrado del ESP32)

Usa la memoria flash integrada del ESP32 como sistema de archivos — no se necesita hardware adicional.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Montar LittleFS** | Monta LittleFS (inicializa) | — |
| **Escribir LittleFS** | Escribe en el archivo | Nombre de archivo, Contenido |
| **Leer LittleFS** | Lee el contenido del archivo | Nombre de archivo → cadena |
| **¿Existe LittleFS?** | Verifica si existe el archivo | Ruta → true/false |
| **Eliminar LittleFS** | Elimina el archivo | Nombre de archivo |

---

## Cámara

Captura imágenes estáticas, envía via HTTP y transmite video MJPEG.

**Modelos compatibles:**
- **ESP32-CAM** (AI-Thinker)
- **XIAO ESP32S3 Sense** (Seeed Studio)
- **M5Camera** (M5Stack — Unit Cam / Unit Cam S3 / Timer Cam)

**Requiere:** Conexión WiFi para transmisión y envío HTTP

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Cámara** | Inicializa la cámara (configuración automática de pines) | Modelo de placa → true/false |
| **Capturar Cámara** | Toma foto al buffer interno | → true/false (llamar bloque de guardar/enviar después) |
| **Guardar Cámara en SD** | Guarda imagen capturada como JPEG en SD | → true/false (SD debe estar inicializada) |
| **Enviar Cámara HTTP** | Envía imagen capturada via HTTP POST | → true/false (WiFi requerido) |
| **Iniciar Stream Cámara** | Inicia el servidor de stream MJPEG | Puerto (accede en http://\<IP\>:\<Puerto\>/stream) |

---

## Robot

### Humanoid (Bípedo)

Controla un robot bípedo con 4 servos.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Humanoid** | Inicializa Humanoid | Pines pierna izq/der/tobillo izq/der |
| **Posición Inicial Humanoid** | Regresa a posición de pie | — |
| **Humanoid Caminar** | Camina adelante/atrás | Pasos, Dirección, Velocidad |
| **Humanoid Girar** | Rota izquierda/derecha | Cuenta, Dirección, Velocidad |
| **Humanoid Saltar** | Movimiento de salto | Cuenta, Velocidad |
| **Humanoid Bailar** | Movimiento de baile | Cuenta, Velocidad |
| **Humanoid Balancear** | Se balancea izquierda y derecha | Cuenta, Velocidad |
| **Humanoid Inclinar** | Se inclina izquierda/derecha | Cuenta, Velocidad |
| **Humanoid Moonwalk** | Movimiento moonwalk | Cuenta, Velocidad |
| **Humanoid Gesto** | Expresa emoción con movimiento y sonido | Tipo de gesto (Feliz/Triste/Enojado etc.) |
| **Humanoid Sonido** | Reproduce efecto de sonido | Tipo de sonido (Inicio/Botón etc.) |
| **Humanoid Crusaito** | Camina con piernas cruzadas | Cuenta, Velocidad |
| **Humanoid Aleteo** | Movimiento tipo aleteo | Cuenta, Velocidad |
| **Humanoid Balanceo de Puntillas** | Balanceo en puntillas | Cuenta, Velocidad |
| **Humanoid Temblor** | Movimiento de temblor | Cuenta, Velocidad |
| **Humanoid Giro Ascendente** | Sube y rota | Cuenta, Velocidad |
| **Humanoid Sacudir Pierna** | Sacude la pierna | Cuenta, Velocidad |
| **Humanoid Arriba Abajo** | Movimiento arriba-abajo | Cuenta, Velocidad |

### Robot Wheel (Ruedas)

Controla un robot de 2 ruedas con servos de rotación continua.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Wheel** | Inicializa el robot de ruedas | Pines rueda izquierda/derecha |
| **Wheel Adelante** | Avanza | Velocidad (Normal/Rápida/Lenta) |
| **Wheel Atrás** | Retrocede | Velocidad |
| **Wheel Girar Izquierda** | Gira a la izquierda | Velocidad |
| **Wheel Girar Derecha** | Gira a la derecha | Velocidad |
| **Wheel Rotar Izquierda** | Rota en el lugar hacia la izquierda | Velocidad |
| **Wheel Rotar Derecha** | Rota en el lugar hacia la derecha | Velocidad |
| **Wheel Detener** | Detiene | — |

### Transform (Ninja)

Controla un robot transformable entre los modos Walk (cuadrúpedo) y Roll (tracción de ruedas).

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Transform** | Inicializa Ninja | Configuración de pines (desde preset) |
| **Modo Ninja** | Cambia solo el modo (Walk/Roll) | Selección de modo |
| **Transformar Ninja** | Transforma físicamente | Walk↔Roll |
| **Alinear Ninja** | Ajusta ángulos de servo | — |
| **Calibrar Ninja** | Ajusta el desplazamiento izquierda/derecha | — |
| **Inicio Ninja** | Regresa a posición vertical | — |
| **Caminar Ninja** | Camina en modo Walk | Dirección, Velocidad, Cuenta |
| **Caminar Ninja (Potencia)** | Camina con porcentaje de potencia | Dirección, Velocidad (%), Cuenta |
| **Rodar Ninja** | Rueda en modo Roll | Dirección, Velocidad, Duración |
| **Rodar Ninja (Potencia)** | Rueda con porcentaje de potencia | Dirección, Velocidad (%) |
| **Rotar Ninja (Roll)** | Rota en modo Roll | Dirección, Velocidad |
| **Girar Ninja (Walk)** | Rota en modo Walk | Dirección, Velocidad |
| **Detener Ninja** | Detiene el modo especificado | Modo |
| **Trotar Ninja** | Camina rápido | Dirección, Velocidad |
| **Flexiones Ninja** | Movimiento de flexiones | Cuenta, Velocidad |
| **Lateral Ninja** | Mueve lateralmente | Dirección, Velocidad |
| **Bailar Ninja** | Baila | Velocidad |

### Control PID

Controlador PID para seguimiento de línea, control de pared, control de velocidad y más.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Control PID** | Crea el controlador PID | Nombre, Propósito (Línea/Pared/Velocidad/Ángulo) |
| **PID** | Calcula la salida desde el error | Error → salida |
| **Establecer Ganancias** | Establece Kp/Ki/Kd | Kp, Ki, Kd |
| **Resetear** | Resetea el integrador y estado | — |
| **Calcular PID Seguimiento Línea** | Calcula velocidades de motor desde posición del sensor | Velocidad base, Posición línea → Vel. izq/der |
| **Calcular Velocidad Motor PID (Izq)** | Calcula velocidad del motor izquierdo | Velocidad base, Error PID → velocidad |
| **Calcular Velocidad Motor PID (Der)** | Calcula velocidad del motor derecho | Velocidad base, Error PID → velocidad |
| **Velocidad Motor Calculada PID** | Obtiene la velocidad calculada | Izquierda/Derecha → velocidad |

### Tracción Diferencial (Differential Drive)

Bloques de control de alto nivel para robot de tracción diferencial usando dos drivers L298N.

| Nombre del Bloque | Descripción | Parámetros |
|-------------------|-------------|------------|
| **Inicializar Tracción Diferencial** | Inicializa el robot | Pines Motor Izq/Der IN1, Ancho de vía (mm) |
| **Establecer Velocidad** | Establece velocidades individuales de rueda | Velocidad izquierda, Velocidad derecha |
| **Avanzar** | Avanza | Velocidad |
| **Retroceder** | Retrocede | Velocidad |
| **Detener** | Detiene (inercia) | — |
| **Frenar** | Parada brusca | — |
| **Liberar** | Libera motores | — |
| **Rotar en el Lugar** | Rota en el lugar | Dirección, Velocidad |
| **Curva** | Curva con control de curvatura | Velocidad, Curvatura (0-100%) |
| **Avanzar Distancia** | Avanza una distancia específica | Distancia (mm), Velocidad |
| **Rotar** | Rota un ángulo específico | Ángulo (grados), Dirección |
| **Seguir Línea** | Seguimiento de línea con corrección PID | Velocidad base, Error sensor, Corrección PID |
| **Velocidad Actual** | Obtiene la velocidad actual de la rueda | Izquierda/Derecha → mm/s |

---

## Placas Compatibles

DigiCode es un editor de programación por bloques centrado en ESP32. Los bloques se muestran u ocultan automáticamente según las capacidades de la placa seleccionada.

| Flag | Significado | Placas de ejemplo |
|------|-------------|-------------------|
| `supportsWifi` | Los bloques WiFi, HTTP, MQTT y HA están disponibles | Toda la serie ESP32, Pico W, Nano RP2040 Connect |
| `supportsOta` | La carga de firmware WiFi OTA (DigiCode OTA) está disponible | Serie ESP32 (no RP2040) |
| `supportsBle` | Los bloques BLE (NimBLE) están disponibles | Solo serie ESP32 (no Pico W) |

> **Nota:** Pico W soporta WiFi pero no BLE. Los bloques de RFID, CAN y Cámara son solo para ESP32.

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md)
- [Guía de Conexión de Hardware](./hardware-setup.md)
- [Solución de Problemas](./troubleshooting.md)
- [Hardware Recomendado](./recommended-hardware.md)
