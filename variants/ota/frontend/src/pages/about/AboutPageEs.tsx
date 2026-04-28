import { AboutShell, FeatureCard, UniqueFeature, PlanRow, BoardCategory } from './components';

export default function AboutPageEs() {
  return (
    <AboutShell backLabel="Volver al editor" labels={{ freeLabel: 'Gratis', proLabel: 'PRO' }}>
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">DigiCode</h1>
        <p className="text-xl text-[#8B949E] mb-2">
          Un editor de programación por bloques para microcontroladores, totalmente en el navegador
        </p>
        <p className="text-sm text-[#8B949E]">
          Sin necesidad de Arduino IDE / Grabación por USB, BLE y WiFi / Compatible con las familias ESP32 y RP2040
        </p>
      </section>

      {/* Origen del proyecto */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Origen del proyecto</h2>
        <div className="space-y-4 text-[#C9D1D9] leading-relaxed">
          <p>
            DigiCode nació en FabLab Nishi-Harima durante el diseño de hardware (placas y carcasas) de robots educativos y dispositivos IoT.
          </p>
          <p>
            Al usar herramientas de programación por bloques existentes, las placas compatibles y la asignación de pines están definidas por la propia herramienta, obligando a
            {' '}<strong className="text-[#E6EDF3]">adaptar el diseño de hardware a las restricciones del software</strong>.
            Aunque diseñes tu propia placa de microcontrolador o una breakout personalizada, no puedes usarla si el editor no la admite.
          </p>
          <p>
            <strong className="text-[#E6EDF3]">Decidimos, entonces, crear nuestro propio editor.</strong>
            {' '}Así comenzó este proyecto.
          </p>
          <p>
            Además, las herramientas existentes solían requerir instalar Arduino IDE o solo admitir grabación por USB, lo que resultaba inconveniente en aulas y talleres.
            Buscamos un entorno que funcione completamente en el navegador y admita grabación inalámbrica.
          </p>
          <p className="text-sm text-[#8B949E]">
            El desarrollo de software se realiza en colaboración con IA (Claude).
          </p>
        </div>
      </section>

      {/* Características principales */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Características principales</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Todo en el navegador"
            description="No requiere instalar ningún software (como Arduino IDE). Montar bloques, compilar y grabar, todo ocurre en el navegador. La compilación se realiza en un servidor en la nube, así que no importa la potencia de tu PC."
          />
          <FeatureCard
            title="Tres métodos de grabación"
            description="Además de grabación por cable USB, admite grabación inalámbrica vía BLE (Bluetooth Low Energy) y WiFi (OTA). Útil para actualizar robots ya encapsulados o grabar varios dispositivos a la vez en el aula."
          />
          <FeatureCard
            title="Principales placas ESP32 y RP2040"
            description="Compatible con la familia ESP32 (estándar / S3 / C3 / C6), la serie M5Stack (Basic, StickC Plus, ATOM, Stamp, etc.), la serie Seeed XIAO (C3 / S3 / C6), Raspberry Pi Pico / Pico W, XIAO RP2040 y Arduino Nano RP2040 Connect."
          />
          <FeatureCard
            title="Más de 500 bloques"
            description="Además de bloques básicos como lógica, bucles, matemáticas y texto, dispone de una amplia colección de bloques de control de hardware para sensores, motores, servos, NeoPixel, OLED, zumbadores, MQTT, Home Assistant y más."
          />
          <FeatureCard
            title="Robots originales compatibles"
            description="Bloques dedicados para tres variantes de los robots propios de FabLab Nishi-Harima: Humanoid (bípedo), Wheel (con ruedas) y Transform (Ninja). Controla la caminata, el baile y los gestos utilizando solo bloques."
          />
          <FeatureCard
            title="Soporte para 5 idiomas"
            description="Compatible con japonés, inglés, español, portugués y chino tradicional. Todas las etiquetas de bloques y elementos de la interfaz están traducidos."
          />
        </div>
      </section>

      {/* Funciones de clase (solo Enterprise) */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          Funciones de clase (solo Enterprise)
        </h2>
        <p className="text-[#8B949E] mb-6 leading-relaxed">
          Gestión de clases para instituciones educativas, talleres y formación corporativa. El docente (administrador) crea la clase,
          provisiona cuentas de alumnos, distribuye tareas y califica las entregas — todo en un mismo lugar.
          Inspirado en TinkerCAD Classroom, con funciones diseñadas específicamente para la educación en microcontroladores y robótica.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Creación y gestión de clases"
            description="Elige entre dos tipos: Taller (1 mes) o Aula (4 meses). Hasta 3 clases × 40 alumnos por administrador (máx. 120 alumnos). Las clases caducadas se eliminan automáticamente y muestran un aviso 7 días antes."
          />
          <FeatureCard
            title="Creación masiva de cuentas de alumnos"
            description="El administrador pega una lista de nombres y el sistema genera automáticamente IDs de inicio de sesión y contraseñas iniciales. Descarga la lista completa en CSV o HTML para distribuirla fácilmente. Los alumnos pueden cambiar su contraseña después."
          />
          <FeatureCard
            title="Distribución de tareas (Blockly + PDF)"
            description="Los administradores crean plantillas de tareas (Blockly XML) en el editor y las distribuyen a toda la clase, junto con material de referencia en PDF opcional. Las fechas de entrega son configurables. Los alumnos solo pueden editar su propio archivo de respuesta — no crear ni importar archivos (prevención de copia)."
          />
          <FeatureCard
            title="Flujo de entrega / calificación / devolución"
            description="Los alumnos pueden guardar cuantas veces quieran y enviar cuando estén listos. Los administradores ven el progreso en un dashboard, abren las respuestas en un visor Blockly de solo lectura, califican (puntaje 0-100 + comentario) o devuelven para reenvío. Los alumnos ven sus resultados en un menú dedicado 'Calificaciones'."
          />
          <FeatureCard
            title="Duplicación y exportación de registros"
            description="Duplica las tareas de una clase existente (incluidos PDFs adjuntos) a una nueva clase con un clic — perfecto para reutilizar material didáctico entre cohortes. Las clases completadas se pueden descargar como un archivo ZIP (tareas, respuestas, CSV de notas, lista de alumnos)."
          />
          <FeatureCard
            title="Gestión del ciclo de vida"
            description="Las clases caducadas se eliminan automáticamente todos los días a las 00:00 JST, con avisos desde 7 días antes. Al cancelar la suscripción, se concede un mes de gracia antes de la eliminación. El uso de compilación de los alumnos se descuenta del cupo Enterprise del administrador (ilimitado), por lo que el tamaño de la clase no importa."
          />
        </div>
      </section>

      {/* Funciones únicas */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          Funciones que no encontrarás en otros editores de bloques
        </h2>
        <p className="text-[#8B949E] mb-4">
          DigiCode incluye muchas funciones que no están presentes en editores de bloques existentes (como mBlock y ArduBlock).
        </p>
        <div className="flex items-center gap-4 mb-8 text-sm text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#238636]" />
            <span className="text-[#3FB950] font-medium">Gratis</span> = disponible para todos los usuarios
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DA3633]" />
            <span className="text-[#F85149] font-medium">PRO</span> = planes Pro / Enterprise (puede haber períodos de acceso gratuito)
          </span>
        </div>

        <div className="space-y-8">
          <UniqueFeature
            title="Asignación de pines personalizable"
            description="Configura libremente los números de pines GPIO por defecto al colocar bloques, para que coincidan con tu diseño de hardware. Guárdalos como preajustes y cambia entre ellos según el proyecto o la placa. Mientras que los editores existentes obligan al hardware a seguir los números de pines del editor, DigiCode te permite priorizar el diseño del hardware."
            tag="Flexibilidad de diseño"
            pricing="pro"
          />
          <UniqueFeature
            title="Ancho de pulso de servo por pin"
            description="Configura el ancho de pulso (min/max) del servo individualmente por pin. Además de preajustes para servos de 180°, 270° y 360°, puedes especificar cualquier valor en microsegundos directamente. Incluso robots que mezclan servos de distintos fabricantes pueden ajustarse de forma óptima por cada servo."
            tag="Compatibilidad de hardware"
            pricing="pro"
          />
          <UniqueFeature
            title="Ajuste de trim de servos"
            description="Ajusta con precisión el trim (offset) de los servos para robots con un deslizador gráfico. Los ajustes se guardan en la NVS (memoria no volátil) del ESP32 y se mantienen tras apagar el equipo. También puedes ejecutar pruebas individuales de servos (barrido, posición inicial, prueba de caminata) desde el navegador."
            tag="Ajuste y calibración"
          />
          <UniqueFeature
            title="Herramienta de ajuste PID"
            description="Una herramienta gráfica para ajustar parámetros PID (Kp, Ki, Kd) para seguimiento de línea, control de pared, control de velocidad y control de ángulo — mediante deslizadores o entrada directa. Guarda y carga preajustes, y envía los valores a un ESP32 en tiempo real por serial. Acelera enormemente el ajuste en competiciones de robótica."
            tag="Para competiciones"
          />
          <UniqueFeature
            title="Bloques favoritos"
            description="De más de 35 categorías de bloques, selecciona solo los que usas más y regístralos como favoritos. Resuelve el problema habitual de tener demasiadas categorías para encontrar el bloque que necesitas."
            tag="Facilidad de uso"
          />
          <UniqueFeature
            title="Selector de modo de robot"
            description="Con un solo clic, cambia entre modos — Humanoid (Bípedo), Wheel, Transform (Ninja), Micromouse, Seguidor de Línea, Home Assistant, Dispositivo Genérico, etc. — para mostrar solo los bloques relevantes a ese robot o caso de uso. Evita que los principiantes se vean abrumados por cientos de bloques."
            tag="Facilidad de uso"
          />
          <UniqueFeature
            title="Graficador serial"
            description="Grafica datos seriales del ESP32 en tiempo real. Detecta automáticamente múltiples canales y admite valores etiquetados (por ejemplo, sensor1:123,sensor2:456). Incluye ajuste de rango del eje Y, pausa y descarga de datos. Útil para verificar sensores y observar el comportamiento del PID."
            tag="Depuración"
          />
          <UniqueFeature
            title="Vista del código generado en tiempo real"
            description="Visualiza en tiempo real el código Arduino C++ generado por tus bloques. El código se actualiza cada vez que añades o modificas un bloque, para que aprendas qué genera cada bloque y puedas dar el salto a la programación basada en texto."
            tag="Apoyo al aprendizaje"
          />
          <UniqueFeature
            title="Detección automática de conflictos con pines ADC2"
            description="En el ESP32, los pines ADC2 no pueden usarse como entradas analógicas mientras el WiFi está activo. DigiCode detecta automáticamente el uso de ADC2 en el momento de generar el código y te advierte — previene un problema común antes de que ocurra."
            tag="Específico de ESP32"
          />
          <UniqueFeature
            title="Grabación OTA por lotes (varios dispositivos)"
            description="Graba varios dispositivos ESP32 simultáneamente por WiFi OTA. Perfecto para actualizar 10 o 20 robots a la vez en aulas o talleres. El progreso de cada dispositivo se muestra en tiempo real."
            tag="Para aulas"
          />
          <UniqueFeature
            title="Bloques MQTT / Home Assistant"
            description="Incluye 21 bloques de comunicación MQTT y 43 bloques de Home Assistant Auto Discovery. Define entidades — sensores, interruptores, luces, ventiladores, persianas — solo con bloques, y se registran automáticamente en Home Assistant. Ideal para proyectos IoT que convierten un ESP32 en un dispositivo de hogar inteligente."
            tag="IoT"
          />
          <UniqueFeature
            title="Proyectos de ejemplo"
            description="Proyectos de ejemplo integrados organizados por categorías: Básicos, Sensores, Motores, Robots, Aplicaciones, Competiciones e IoT. Cárgalos con un clic y pruébalos al instante."
            tag="Apoyo al aprendizaje"
          />
          <UniqueFeature
            title="Tutoriales"
            description="11 tutoriales integrados como parpadeo de LED, sensores, servos, caminar con Humanoid, evasión de obstáculos, seguimiento de línea y micromouse. Al seleccionar uno se carga un proyecto de ejemplo para que puedas seguirlo mientras lees la explicación."
            tag="Apoyo al aprendizaje"
          />
          <UniqueFeature
            title="Servidor de compilación local (Docker)"
            description="Ejecuta la imagen Docker pública (ghcr.io/fablab-westharima/digicode-compile-api) en tu propio equipo para compilar localmente. Utiliza la misma imagen que la nube, por lo que los resultados de compilación coinciden exactamente (sin lib drift). Funciona sin conexión y no consume tu cuota de compilación en la nube (ilimitada). Ideal para aulas con acceso a Internet restringido o desarrolladores que compilan con frecuencia."
            tag="Funcionamiento sin conexión"
          />
        </div>
      </section>

      {/* Placas compatibles */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Placas compatibles</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BoardCategory
            title="ESP32 genéricos"
            boards={['ESP32', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6']}
          />
          <BoardCategory
            title="Serie M5Stack"
            boards={['M5Stack Basic/Gray/Fire', 'M5StickC Plus', 'ATOM Lite', 'ATOM Matrix', 'M5Stamp Pico', 'M5Stamp C3/C3U', 'M5StampS3A']}
          />
          <BoardCategory
            title="Serie Seeed XIAO"
            boards={['XIAO ESP32C3', 'XIAO ESP32S3', 'XIAO ESP32C6', 'XIAO RP2040']}
          />
          <BoardCategory
            title="Raspberry Pi / RP2040"
            boards={['Raspberry Pi Pico', 'Raspberry Pi Pico W', 'Arduino Nano RP2040 Connect']}
          />
        </div>
      </section>

      {/* Planes */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Planes</h2>
        <div className="space-y-6 text-[#C9D1D9]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#30363D]">
                  <th className="text-left py-3 pr-4 text-[#8B949E] font-medium">Característica</th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Invitado<br/><span className="text-xs font-normal">$0 (sin registro)</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Gratis<br/><span className="text-xs font-normal">$0</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Lite<br/><span className="text-xs font-normal">$5/mes</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Pro<br/><span className="text-xs font-normal">$10/mes</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Enterprise<br/><span className="text-xs font-normal">$20/mes</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#C9D1D9]">
                <PlanRow
                  feature="Cuota de compilación en la nube (al mes)"
                  guest="50"
                  free="50"
                  lite="250"
                  pro="500"
                  enterprise="Ilimitada"
                />
                <PlanRow feature="Programación por bloques (más de 500 bloques)" guest free lite pro enterprise />
                <PlanRow feature="Grabación USB / BLE / WiFi" guest free lite pro enterprise />
                <PlanRow feature="Trim de servos / Ajuste PID" guest free lite pro enterprise />
                <PlanRow feature="Graficador serial" guest free lite pro enterprise />
                <PlanRow feature="Bloques favoritos / Modos de robot" guest free lite pro enterprise />
                <PlanRow feature="Proyectos de ejemplo / Tutoriales" guest free lite pro enterprise />
                <PlanRow feature="Integración MQTT / Home Assistant" guest free lite pro enterprise />
                <PlanRow
                  feature="Guardado de proyectos (archivo JSON local)"
                  guest free lite pro enterprise
                  note="Todos los usuarios guardan localmente. Para migrar a otro PC basta copiar el archivo."
                />
                <PlanRow feature="Servidor de compilación local (Docker)" guest free lite pro enterprise />
                <PlanRow feature="Extensiones (Asignación de pines / Ancho de pulso de servo)" pro enterprise />
                <PlanRow feature="Funciones de clase (para centros educativos y talleres)" enterprise />
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[#8B949E]">
            Las funciones PRO / Enterprise pueden habilitarse gratuitamente para todos los usuarios durante períodos promocionales.
          </p>

          <p className="text-sm text-[#8B949E]">
            Los cambios de plan y la cancelación se gestionan con autoservicio vía Stripe. Las facturas y recibos se pueden descargar desde el portal de cliente. Accede desde "Plan y facturación" tras iniciar sesión.
          </p>

          <p>
            Los navegadores compatibles son <strong className="text-[#E6EDF3]">Chrome / Edge</strong> (porque se requieren las APIs Web Bluetooth y Web Serial).
          </p>
          <p className="text-[#8B949E]">
            Agradecemos tus comentarios y sugerencias.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-[#8B949E] pt-8 border-t border-[#30363D]">
        <p>DigiCode - FabLab Nishi-Harima</p>
        <p className="mt-1">
          <a
            href="https://github.com/fablab-westharima/DigiCode-Finder/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58A6FF] hover:underline"
          >
            DigiCode Finder (aplicación de detección de dispositivos para WiFi OTA)
          </a>
        </p>
        <p className="mt-4 text-xs text-[#484F58]">
          Las traducciones a idiomas distintos del japonés son asistidas por IA. Agradecemos que nos reporten inexactitudes.
        </p>
      </footer>
    </AboutShell>
  );
}
