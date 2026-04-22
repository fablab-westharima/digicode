# Usar la Generación de Bloques con IA

<!-- Este documento fue traducido por IA del original en japonés (2026-04-22) -->

**Última actualización:** 2026-04-22

La función de generación de bloques con IA de DigiCode te permite generar blocos Blockly automáticamente a partir de instrucciones en lenguaje natural.

---

## 1. Descripción general

Esta función utiliza el modelo BYOK (Trae tu propia clave): usas tu propia clave API de IA para generar bloques.

| Elemento | Detalles |
|----------|---------|
| **Modelo** | BYOK (usa tu propia clave API) |
| **Proveedores compatibles** | OpenAI / Claude (Anthropic) / Google Gemini / Personalizado (compatible con OpenAI) |
| **Plan requerido** | Lite / Pro / Enterprise (cuentas de estudiante excluidas) |
| **Almacenamiento de clave API** | localStorage del navegador (local en tu dispositivo) |
| **Datos enviados a DigiCo** | Ninguno (las instrucciones y resultados van directamente de tu navegador al proveedor) |

> **Nota:** Tu clave API se almacena en el localStorage del navegador. Ten cuidado al usar un dispositivo compartido con otras cuentas.

---

## 2. Configuración inicial

1. Abre el menú de cuenta en la barra lateral
2. Haz clic en **"Configuración de IA"** (justo debajo de "Cambiar contraseña")
   - Solo visible en planes Lite / Pro / Enterprise
3. Selecciona tu proveedor (OpenAI / Claude / Gemini / Personalizado)
4. Ingresa tu clave API del proveedor seleccionado
   - Consulta el sitio oficial del proveedor para obtener una clave (enlace disponible en el diálogo)
5. Ingresa un nombre de modelo (déjalo en blanco para usar el modelo predeterminado)
6. Haz clic en **"Guardar"**

> **Eliminar tu clave API:** Si ya hay una clave API ingresada, aparece un enlace "Eliminar clave API" en el diálogo. Un clic elimina y guarda.

---

## 3. Cómo usar

1. Encuentra el widget **"Generación de Bloques con IA"** en la parte inferior de la barra lateral en la página del editor
2. Escribe tu instrucción en el campo de entrada (ej.: `Hacer parpadear el LED del pin 13 cada segundo`)
3. Haz clic en el botón **"Generar"** o presiona `Ctrl+Enter` (Mac: `Cmd+Enter`)
4. Los bloques generados se añadirán a tu espacio de trabajo

> **Consejo:** Los bloques generados se **añaden** a los bloques existentes, no se reemplazan. Para empezar de cero, limpia el espacio de trabajo manualmente antes de generar.

---

## 4. Cómo elegir un proveedor

Los nombres de modelos, precios y límites de velocidad cambian con frecuencia. Consulta la documentación oficial para obtener información actualizada.

| Proveedor | Nivel gratuito | Facilidad de configuración | Costo | Obtener clave API |
|---|---|---|---|---|
| **OpenAI** | Básicamente no (créditos iniciales en algunos casos) | Requiere tarjeta de crédito | Medio | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Claude (Anthropic)** | No (requiere plan de pago) | Requiere tarjeta de crédito | Medio | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| **Google Gemini** | Sí, en algunos modelos | Cuenta de Google (instantáneo) | Bajo a gratuito | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Personalizado (Ollama, etc.)** | — (servidor local) | Requiere servidor local | Gratuito (solo electricidad) | — |

---

## 5. Consejos para mejores instrucciones

**Las instrucciones más específicas producen mejores resultados.**

| Vago | Específico |
|---|---|
| "Enviar valor del sensor de temperatura" | "Enviar temperatura y humedad del DHT11 por MQTT" |
| "Mover hacia adelante" | "Avanzar durante 2 segundos y luego detenerse" |
| "Medir distancia" | "Medir distancia con sensor ultrasónico HC-SR04 e imprimir en serial" |

- **Usa el vocabulario del modo**: para `robots_wheel`, usa términos como "avanzar", "girar a la derecha"; para `homeassistant`, usa "publicar MQTT", "conectar WiFi"
- **Funciona en cualquier idioma**: las instrucciones en español, inglés, japonés, chino, etc. son todas compatibles

---

## 6. Solución de problemas

| Síntoma | Causa / Solución |
|---|---|
| **Error de red (posible CORS)** | Tu clave API puede ser inválida o estar vencida. Vuelve a ingresar una clave válida en Configuración de IA |
| **Error 429 (límite de velocidad)** | Has alcanzado el límite de solicitudes o agotado tu nivel gratuito. Revisa el panel de tu proveedor |
| **Error 404 (modelo no encontrado)** | El nombre del modelo puede estar obsoleto o haber cambiado. Consulta los documentos oficiales del proveedor |
| **No aparecen bloques tras la generación** | La generación falló después de 3 intentos. Intenta reescribir la instrucción de forma más específica |
| **Error "clave API no configurada"** | Primero ingresa y guarda tu clave API en Configuración de IA |

---

## 7. Limitaciones conocidas (MVP)

La generación actual de bloques con IA es una versión inicial (MVP). Se planean mejoras en futuras actualizaciones.

- **Solo modo de adición**: Los bloques generados se añaden a los bloques existentes, no se reemplazan. Limpia el espacio de trabajo manualmente para empezar de nuevo
- **Bloques WiFi/BLE no disponibles en modos robot**: Los modos `robots_wheel` / `robots_humanoid` / `robots_transform` no incluyen categorías de WiFi o BLE. Cambia al modo `all_blocks` o `generic` para usar WiFi/BLE con la generación
- **Generación de una sola vez**: Cada instrucción genera una vez. La IA no recuerda generaciones anteriores (modo conversacional aún no implementado)

---

## 8. Privacidad y seguridad

- **Almacenamiento de clave API**: Se almacena en texto plano en el localStorage del navegador. Existe riesgo de exposición mediante XSS. No recomendamos usar esta función en un dispositivo compartido
- **Flujo de datos**: Las instrucciones y resultados generados se envían directamente desde tu navegador al proveedor de IA. Los servidores de DigiCo LLC no están involucrados
- **Facturación**: Los cargos de uso se facturan directamente a tu cuenta del proveedor. DigiCo LLC no tiene ninguna participación en la facturación
