# Primeros Pasos

Esta guía explica cómo empezar con DigiCode.

---

## Requisitos

### Hardware Requerido

- **Placa ESP32** (DevKitC, NodeMCU, etc.)
- **Cable USB** (compatible con datos)
- **PC** (Windows/Mac/Linux)

### Software Requerido

- **Navegador Web** (Chrome o Edge recomendado)
- **DigiCode Finder** (app de escritorio, recomendado)

---

## Configuración Inicial

### Paso 1: Acceder a DigiCode

1. Abre tu navegador
2. Ve a [https://digicode-frontend.pages.dev](https://digicode-frontend.pages.dev)
3. Crea una cuenta o inicia sesión

### Paso 2: Seleccionar Placa

1. Clic en el selector de placa en la barra lateral
2. Selecciona tu placa ESP32
3. El modo se guarda automáticamente

### Paso 3: Cargar Firmware Inicial

![Pasos de Primeros Pasos](/docs/images/getting-started-steps.svg)

1. Conecta ESP32 al PC vía USB
2. Clic en "**Cargar Firmware**" en el menú lateral
3. Clic en el botón "INSTALAR"
4. Selecciona el puerto serial
5. Espera a que se complete la carga (~1 minuto)

### Paso 4: Configurar WiFi (para OTA)

Después de cargar el firmware, si planeas usar WiFi OTA:

1. Clic en "**Configuración WiFi**"
2. Selecciona el puerto serial y conecta
3. Ingresa SSID y contraseña
4. Clic en "Probar Conexión"
5. Se mostrará una IP fija al tener éxito

---

## Tu Primer Programa

### Crear un Programa de Parpadeo LED

1. Arrastra el bloque "**Esperar**" al área de trabajo
2. Arrastra el bloque "**LED Interno ON**"
3. Arrastra otro bloque "**Esperar**"
4. Arrastra el bloque "**LED Interno OFF**"
5. Conéctalos en secuencia

### Subir al ESP32

1. Clic en el botón "**Subir**"
2. Elige método de carga:
   - **WiFi OTA**: Selecciona dispositivo de la lista
   - **USB**: Selecciona puerto serial
3. Espera a que se complete la carga
4. ¡Verifica que el LED parpadee!

---

## Próximos Pasos

- [Referencia de Bloques](./block-reference.md) - Aprende todos los bloques disponibles
- [Configuración de Hardware](./hardware-setup.md) - Conecta sensores y actuadores
- [Guía de Configuración OTA](./05-ota-guide.md) - Configuración detallada de WiFi OTA
