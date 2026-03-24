# Preguntas Frecuentes (FAQ)

Preguntas y respuestas comunes sobre DigiCode.

## Tabla de Contenidos

1. [Cuenta e Inicio de Sesión](#cuenta-e-inicio-de-sesión)
2. [Editor y Bloques](#editor-y-bloques)
3. [Compilar y Subir](#compilar-y-subir)
4. [Actualización WiFi OTA](#actualización-wifi-ota)
5. [Hardware](#hardware)

---

## Cuenta e Inicio de Sesión

### P: ¿Se requiere registro de cuenta?

**R:** Sí, se requiere registro de cuenta para guardar proyectos y usar funciones de compilación. Las funciones básicas están disponibles con el plan gratuito.

### P: Olvidé mi contraseña

**R:** La función de restablecimiento de contraseña está en desarrollo. Por favor contáctenos a través del formulario de contacto.

### P: ¿Puedo iniciar sesión desde múltiples dispositivos?

**R:** Sí, puedes iniciar sesión desde múltiples dispositivos con la misma cuenta. Los proyectos se almacenan en la nube, así que puedes acceder desde cualquier dispositivo.

---

## Editor y Bloques

### P: No puedo encontrar un bloque

**R:** Por favor verifica:

1. **Modo robot** - ¿Has seleccionado el modo apropiado para tu robot?
2. **Categoría** - Expande cada categoría en la caja de herramientas
3. **Selección de placa** - Los bloques disponibles cambian según la placa seleccionada

### P: Los bloques desaparecieron al cambiar de placa

**R:** Cambiar de placa puede eliminar bloques incompatibles. Guarda tu proyecto antes de cambiar.

---

## Compilar y Subir

### P: La compilación falla

**R:** Causas comunes y soluciones:

| Error | Causa | Solución |
|-------|-------|----------|
| Biblioteca no encontrada | Biblioteca requerida no instalada | Autoinstalada en servidor. Reintenta. |
| Error de sintaxis | Error de conexión de bloques | Verifica bloques no conectados |
| Sin memoria | Programa muy grande | Elimina bloques innecesarios |

### P: ESP32 no es reconocido

**R:** Verifica en orden:

1. **Cable USB** - ¿Estás usando un cable compatible con datos?
2. **Driver** - ¿Está instalado el driver CP2102/CH340?
3. **Puerto** - Prueba un puerto USB diferente
4. **Navegador** - ¿Estás usando Chrome/Edge? (Se requiere Web Serial API)

---

## Actualización WiFi OTA

### P: Dispositivo no encontrado

**R:** Verifica:

1. **Misma red WiFi** - ¿PC y ESP32 están en la misma red?
2. **Firewall** - ¿Está bloqueado mDNS (puerto 5353)?
3. **Conexión WiFi ESP32** - ¿Puedes ver la IP en el monitor serial?

### P: ¿Cuál es la diferencia entre OTA y carga USB?

**R:**

| Método | Ventaja | Desventaja |
|--------|---------|------------|
| **Carga USB** | Estable, rápida | Requiere cable |
| **WiFi OTA** | Inalámbrica, actualización remota posible | Requiere config inicial, depende de WiFi |

---

## Hardware

### P: ¿Qué placa ESP32 debo usar?

**R:** Las siguientes placas están verificadas:

- **ESP32-DevKitC** - Más común, recomendada
- **ESP32-WROOM-32** - Módulo estándar
- **ESP32-S3** - Algunas limitaciones de funciones

### P: El servo no se mueve

**R:** Verifica:

1. **Alimentación** - Los servos consumen mucha corriente, USB puede no ser suficiente. Usa alimentación externa (5V/2A+)
2. **Número de pin** - Verifica que la configuración del pin sea correcta
3. **Inicialización** - ¿Has colocado el bloque de attach del servo?

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md)
- [Referencia de Bloques](./block-reference.md)
- [Configuración de Hardware](./hardware-setup.md)
- [Solución de Problemas](./troubleshooting.md)
