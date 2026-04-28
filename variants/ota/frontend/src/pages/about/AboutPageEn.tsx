import { AboutShell, FeatureCard, UniqueFeature, PlanRow, BoardCategory } from './components';

export default function AboutPageEn() {
  return (
    <AboutShell backLabel="Back to Editor" labels={{ freeLabel: 'Free', proLabel: 'PRO' }}>
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">DigiCode</h1>
        <p className="text-xl text-[#8B949E] mb-2">
          A browser-based block programming editor for microcontrollers
        </p>
        <p className="text-sm text-[#8B949E]">
          No Arduino IDE required / USB, BLE, and WiFi flashing / ESP32 and RP2040 family support
        </p>
      </section>

      {/* Background */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Background</h2>
        <div className="space-y-4 text-[#C9D1D9] leading-relaxed">
          <p>
            DigiCode was born at FabLab Nishi-Harima during the hardware design (PCB and enclosure design) of educational robots and IoT devices.
          </p>
          <p>
            When using existing block programming tools, the supported boards and pin assignments are dictated by the editor itself, forcing us to
            {' '}<strong className="text-[#E6EDF3]">adapt hardware design to software constraints</strong>.
            Even if you design your own custom microcontroller board or breakout board, you can't use it unless the editor supports it.
          </p>
          <p>
            <strong className="text-[#E6EDF3]">So we decided to build our own editor.</strong>
            {' '}That's what started this project.
          </p>
          <p>
            In addition, existing tools often required installing Arduino IDE or only supported USB flashing, which was inconvenient for classrooms and workshops.
            We aimed for an environment that runs entirely in the browser and supports wireless flashing.
          </p>
          <p className="text-sm text-[#8B949E]">
            Software development is a collaboration with AI (Claude).
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Core Features</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Runs Entirely in the Browser"
            description="No software installation required — no Arduino IDE needed. Building with blocks, compiling, and flashing all happen in the browser. A cloud compile server handles the build, so your PC specs don't matter."
          />
          <FeatureCard
            title="Three Flashing Methods"
            description="In addition to wired USB flashing, wireless flashing via BLE (Bluetooth Low Energy) and WiFi (OTA) is supported. Convenient for updating enclosed robots or flashing multiple devices at once in a classroom."
          />
          <FeatureCard
            title="Major ESP32 and RP2040 Boards"
            description="Supports the ESP32 family (Plain / S3 / C3 / C6), M5Stack series (Basic, StickC Plus, ATOM, Stamp, etc.), Seeed XIAO series (C3 / S3 / C6), Raspberry Pi Pico / Pico W, XIAO RP2040, and Arduino Nano RP2040 Connect."
          />
          <FeatureCard
            title="500+ Blocks"
            description="In addition to basic blocks like logic, loops, math, and text, a rich collection of hardware control blocks is available for sensors, motors, servos, NeoPixel, OLED, buzzers, MQTT, Home Assistant, and more."
          />
          <FeatureCard
            title="Original Robot Support"
            description="Dedicated blocks for three variants of FabLab Nishi-Harima's original robots: Humanoid (bipedal), Wheel, and Transform (Ninja). Walking, dancing, and gestures can all be controlled with blocks alone."
          />
          <FeatureCard
            title="5-Language Support"
            description="Supports Japanese, English, Spanish, Portuguese, and Traditional Chinese. All block labels and UI elements are fully translated."
          />
        </div>
      </section>

      {/* Class Features (Enterprise only) */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          Class Features (Enterprise only)
        </h2>
        <p className="text-[#8B949E] mb-6 leading-relaxed">
          Class management for schools, workshops, and in-house training. Teachers (admins) create classes,
          provision student accounts, distribute assignments, and grade submissions — all in one place.
          Inspired by TinkerCAD Classroom, with features tailored specifically for microcontroller and robotics education.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Class Creation & Management"
            description="Choose between two class types: Workshop (1 month) or Classroom (4 months). Up to 3 classes × 40 students per admin (120 students max). Expired classes are auto-deleted, with warning banners shown 7 days in advance."
          />
          <FeatureCard
            title="Bulk Student Account Creation"
            description="Admin pastes a list of names, and login IDs + initial passwords are auto-generated. Download the whole roster as CSV or HTML for easy distribution. Students can change their own passwords afterwards."
          />
          <FeatureCard
            title="Assignment Distribution (Blockly + PDF)"
            description="Admins create assignment templates (Blockly XML) in the editor and distribute them to the whole class, along with optional PDF reference materials. Due dates are configurable. Students can only edit their own answer file — no new files, no imports (cheating prevention)."
          />
          <FeatureCard
            title="Submit / Grade / Return Workflow"
            description="Students can save any time and submit when ready. Admins view progress on a dashboard, open answers in a read-only Blockly viewer, grade (0-100 score + comment), or return for resubmission. Students check their results in a dedicated 'Graded' menu."
          />
          <FeatureCard
            title="Class Duplication & Record Export"
            description="Duplicate an existing class's assignments (including PDF attachments) to a new class with one click — perfect for reusing teaching materials across cohorts. Finished classes can be downloaded as a ZIP archive (assignments, answers, grade CSV, student roster)."
          />
          <FeatureCard
            title="Lifecycle Management"
            description="Expired classes are auto-deleted daily at JST 00:00, with warning banners from 7 days out. On plan cancellation, classes are preserved for a 1-month grace period before deletion. Student compile usage is deducted from the admin's Enterprise quota (unlimited), so class size never matters."
          />
        </div>
      </section>

      {/* Unique Features */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          Features You Won't Find in Other Block Editors
        </h2>
        <p className="text-[#8B949E] mb-4">
          DigiCode includes many features not found in existing block editors (such as mBlock and ArduBlock).
        </p>
        <div className="flex items-center gap-4 mb-8 text-sm text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#238636]" />
            <span className="text-[#3FB950] font-medium">Free</span> = available to all users
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DA3633]" />
            <span className="text-[#F85149] font-medium">PRO</span> = Pro / Enterprise plans (free trial periods may apply)
          </span>
        </div>

        <div className="space-y-8">
          <UniqueFeature
            title="Custom Pin Assignments"
            description="Freely configure the default GPIO pin numbers assigned when blocks are placed, to match your hardware design. Save them as presets and switch per project or board. While existing block editors force the hardware to match the editor's pin numbers, DigiCode lets you prioritize hardware design."
            tag="Design Flexibility"
            pricing="pro"
          />
          <UniqueFeature
            title="Per-Pin Servo Pulse Width"
            description="Set servo motor pulse width (min/max) individually per pin. In addition to presets for 180°, 270°, and 360° servos, you can specify any microsecond value directly. Even robots that mix servos from different manufacturers can be tuned optimally per servo."
            tag="Hardware Compatibility"
            pricing="pro"
          />
          <UniqueFeature
            title="Servo Trim Adjustment"
            description="Fine-tune the trim (offset) of servos for robots with a GUI slider. Adjustments are saved to the ESP32's NVS (non-volatile memory) and persist across power cycles. You can also run individual servo tests (sweep, home position, walking test) from the browser."
            tag="Adjustment & Tuning"
          />
          <UniqueFeature
            title="PID Tuning Tool"
            description="A GUI tool to adjust PID parameters (Kp, Ki, Kd) for line tracing, wall following, speed control, and angle control — via sliders or direct input. Save and load presets, and send values to a connected ESP32 in real time over serial. Greatly streamlines tuning for robot competitions."
            tag="For Competitions"
          />
          <UniqueFeature
            title="Favorite Blocks"
            description="From 35+ block categories, pick only the ones you use most and register them as favorites. Solves the common problem of having too many categories to find the block you need."
            tag="Usability"
          />
          <UniqueFeature
            title="Robot Mode Selector"
            description="With just one click, switch among modes — Humanoid (Bipedal), Wheel, Transform (Ninja), Micromouse, Line Tracer, Home Assistant, Generic Device, and more — to show only the blocks relevant to that robot or use case. Prevents beginners from being overwhelmed by hundreds of blocks."
            tag="Usability"
          />
          <UniqueFeature
            title="Serial Plotter"
            description="Plot serial data from the ESP32 in real time. Auto-detects multiple channels and supports labeled values (e.g., sensor1:123,sensor2:456). Includes Y-axis range settings, pause, and data download. Useful for verifying sensors and observing PID behavior."
            tag="Debug"
          />
          <UniqueFeature
            title="Real-time Generated Code View"
            description="View the Arduino C++ code generated from your blocks in real time. The code updates every time you add or change a block, so you can learn what each block produces and step up to text-based programming."
            tag="Learning Support"
          />
          <UniqueFeature
            title="Automatic ADC2 Pin Conflict Detection"
            description="On ESP32, ADC2 pins cannot be used as analog inputs while WiFi is active. DigiCode automatically detects ADC2 usage at code generation time and warns you — preventing a common pitfall before it happens."
            tag="ESP32-Specific"
          />
          <UniqueFeature
            title="Batch OTA Flashing (Multiple Devices)"
            description="Flash multiple ESP32 devices simultaneously via WiFi OTA. Perfect for updating 10 or 20 robots at once in classrooms or workshops. Per-device progress is displayed in real time."
            tag="For Classrooms"
          />
          <UniqueFeature
            title="MQTT / Home Assistant Blocks"
            description="Includes 21 MQTT communication blocks and 43 Home Assistant Auto Discovery blocks. Define entities — sensors, switches, lights, fans, covers — with blocks alone, and they are automatically registered with Home Assistant. Great for IoT projects that turn an ESP32 into a smart home device."
            tag="IoT"
          />
          <UniqueFeature
            title="Sample Projects"
            description="Built-in sample projects organized into categories: Basics, Sensors, Motors, Robots, Applications, Competitions, and IoT. Load with one click and start trying them immediately."
            tag="Learning Support"
          />
          <UniqueFeature
            title="Tutorials"
            description="11 built-in tutorials including LED blink, sensors, servos, Humanoid walking, obstacle avoidance, line tracing, and micromouse. Selecting one loads a sample project so you can follow along while reading the explanation."
            tag="Learning Support"
          />
          <UniqueFeature
            title="Local Compile Server (Docker)"
            description="Run the public Docker image (ghcr.io/fablab-westharima/digicode-compile-api) on your own machine to compile locally. Uses the same image as the cloud, so compile results match exactly (no lib drift). Works offline and doesn't consume your cloud compile quota (unlimited). Ideal for classrooms with restricted internet access or developers who compile frequently."
            tag="Offline Ready"
          />
        </div>
      </section>

      {/* Supported Boards */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Supported Boards</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BoardCategory
            title="Generic ESP32"
            boards={['ESP32', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6']}
          />
          <BoardCategory
            title="M5Stack Series"
            boards={['M5Stack Basic/Gray/Fire', 'M5StickC Plus', 'ATOM Lite', 'ATOM Matrix', 'M5Stamp Pico', 'M5Stamp C3/C3U', 'M5StampS3A']}
          />
          <BoardCategory
            title="Seeed XIAO Series"
            boards={['XIAO ESP32C3', 'XIAO ESP32S3', 'XIAO ESP32C6', 'XIAO RP2040']}
          />
          <BoardCategory
            title="Raspberry Pi / RP2040"
            boards={['Raspberry Pi Pico', 'Raspberry Pi Pico W', 'Arduino Nano RP2040 Connect']}
          />
        </div>
      </section>

      {/* Plans */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Plans</h2>
        <div className="space-y-6 text-[#C9D1D9]">
          {/* Plan table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#30363D]">
                  <th className="text-left py-3 pr-4 text-[#8B949E] font-medium">Feature</th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Guest<br/><span className="text-xs font-normal">$0 (unregistered)</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Free<br/><span className="text-xs font-normal">$0</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Lite<br/><span className="text-xs font-normal">$5/mo</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Pro<br/><span className="text-xs font-normal">$10/mo</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Enterprise<br/><span className="text-xs font-normal">$20/mo</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#C9D1D9]">
                <PlanRow
                  feature="Cloud compile quota (per month)"
                  guest="50"
                  free="50"
                  lite="250"
                  pro="500"
                  enterprise="Unlimited"
                />
                <PlanRow feature="Block Programming (500+ blocks)" guest free lite pro enterprise />
                <PlanRow feature="USB / BLE / WiFi Flashing" guest free lite pro enterprise />
                <PlanRow feature="Servo Trim / PID Tuning" guest free lite pro enterprise />
                <PlanRow feature="Serial Plotter" guest free lite pro enterprise />
                <PlanRow feature="Favorite Blocks / Robot Modes" guest free lite pro enterprise />
                <PlanRow feature="Sample Projects / Tutorials" guest free lite pro enterprise />
                <PlanRow feature="MQTT / Home Assistant Integration" guest free lite pro enterprise />
                <PlanRow
                  feature="Project Storage (local JSON file)"
                  guest free lite pro enterprise
                  note="All users save locally. Migrate to another PC by copying the file."
                />
                <PlanRow feature="Local Compile Server (Docker)" guest free lite pro enterprise />
                <PlanRow feature="Extensions (Pin Assignments / Servo Pulse Width)" pro enterprise />
                <PlanRow feature="Class Features (for schools & workshops)" enterprise />
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[#8B949E]">
            PRO / Enterprise features may be temporarily unlocked for everyone during promotional periods.
          </p>

          <p className="text-sm text-[#8B949E]">
            Plan changes and cancellations are self-service via Stripe. Invoices and receipts can be downloaded from the customer portal. Access it from "Plan & Billing" after signing in.
          </p>

          <p>
            Supported browsers are <strong className="text-[#E6EDF3]">Chrome / Edge</strong> (because Web Bluetooth API and Web Serial API are required).
          </p>
          <p className="text-[#8B949E]">
            We welcome your feedback and suggestions.
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
            DigiCode Finder (device discovery app for WiFi OTA)
          </a>
        </p>
        <p className="mt-4 text-xs text-[#484F58]">
          Translations for non-Japanese languages are AI-assisted. We welcome reports of inaccuracies.
        </p>
      </footer>
    </AboutShell>
  );
}
