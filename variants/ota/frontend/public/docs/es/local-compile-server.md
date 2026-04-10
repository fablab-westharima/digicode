# Configuración del Servidor de Compilación Local

Con DigiCode, puedes ejecutar un servidor de compilación en tu propia computadora en lugar del servidor en la nube. Esto permite compilaciones ilimitadas a alta velocidad.

---

## Aviso Importante

> **Importante: Tamaño de Imagen Docker**
>
> La imagen Docker del servidor de compilación local es de **aproximadamente 10GB**.
> La descarga toma tiempo, por favor ten en cuenta:
>
> - **No descargues usando hotspot móvil**
>   - Puede exceder límites de datos
>   - Podría resultar en cargos altos
> - **Conexión por cable estable (fibra óptica, etc.) recomendada**
> - Tiempo estimado de descarga:
>   - Fibra óptica (100Mbps): ~15-20 minutos
>   - Conexión móvil: **No recomendado**

---

## Requisitos

- **Docker Desktop** (gratis)
- Conexión a internet estable (solo descarga inicial)
- Espacio en disco: 15GB o más

---

## Paso 1: Instalar Docker Desktop

### Windows

1. Visita [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Clic en "Download for Windows"
3. Ejecuta el instalador
4. Sigue las instrucciones en pantalla
5. Reinicia el PC después de la instalación

### Mac

1. Visita [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Clic en "Download for Mac" (selecciona Intel/Apple Silicon)
3. Abre el archivo `.dmg` descargado
4. Arrastra icono de Docker a la carpeta Aplicaciones
5. Inicia "Docker" desde Aplicaciones

---

## Paso 2: Descargar e Iniciar Servidor de Compilación

Ejecuta en terminal:

```bash
docker run -d -p 3001:3001 --name digicode-compiler ghcr.io/fablab-westharima/digicode-compile-server:latest
```

Primera ejecución descarga imagen de ~10GB. **Conexión por cable recomendada.**

---

## Paso 3: Verificar Operación

```bash
curl http://localhost:3001/health
```

Si ves esto, éxito:

```json
{"status":"ok","timestamp":"...","service":"digicode-compile-server","templateAvailable":true}
```

---

## Paso 4: Configurar DigiCode

1. Abre DigiCode
2. Clic en ▼ junto al botón "**Subir**"
3. Selecciona "**Servidor Local**"
4. Ejecuta compilación para verificar

---

## Operaciones del Servidor

### Detener

```bash
docker stop digicode-compiler
```

### Reiniciar

```bash
docker start digicode-compiler
```

### Ver Logs

```bash
docker logs digicode-compiler
```

---

## Ventajas y Desventajas

### Ventajas

- Compilaciones **ilimitadas**
- **Compilación rápida** sin latencia de red
- Funciona sin conexión (después de descarga inicial)

### Desventajas

- Descarga inicial de ~10GB requerida
- Instalación de Docker requerida
- Usa recursos del PC (memoria, CPU)

---

## Documentos Relacionados

- [Primeros Pasos](./getting-started.md)
- [Solución de Problemas](./troubleshooting.md)
