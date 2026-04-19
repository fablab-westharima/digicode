import { AboutShell, FeatureCard, UniqueFeature, PlanRow, BoardCategory } from './components';

export default function AboutPagePt() {
  return (
    <AboutShell backLabel="Voltar ao editor" labels={{ freeLabel: 'Grátis', proLabel: 'PRO' }}>
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">DigiCode</h1>
        <p className="text-xl text-[#8B949E] mb-2">
          Um editor de programação por blocos para microcontroladores, inteiramente no navegador
        </p>
        <p className="text-sm text-[#8B949E]">
          Sem necessidade do Arduino IDE / Gravação por USB, BLE e WiFi / Mais de 30 placas compatíveis
        </p>
      </section>

      {/* Origem do projeto */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Origem do projeto</h2>
        <div className="space-y-4 text-[#C9D1D9] leading-relaxed">
          <p>
            O DigiCode nasceu no FabLab Nishi-Harima durante o desenho de hardware (placas e caixas) de robôs educativos e dispositivos IoT.
          </p>
          <p>
            Ao utilizar ferramentas de programação por blocos existentes (como o OttoBlockly), as placas suportadas e a atribuição de pinos são definidas pela própria ferramenta, obrigando a
            {' '}<strong className="text-[#E6EDF3]">adaptar o desenho de hardware às restrições do software</strong>.
            Mesmo que desenhe uma placa de microcontrolador ou uma placa breakout originais, não as poderá usar se o editor não as suportar.
          </p>
          <p>
            <strong className="text-[#E6EDF3]">Decidimos então criar o nosso próprio editor.</strong>
            {' '}Foi assim que este projeto começou.
          </p>
          <p>
            Além disso, as ferramentas existentes exigiam frequentemente a instalação do Arduino IDE ou apenas suportavam gravação por USB, o que era inconveniente em salas de aula e workshops.
            Visámos um ambiente que funcione inteiramente no navegador e suporte gravação sem fios.
          </p>
          <p className="text-sm text-[#8B949E]">
            O desenvolvimento de software é feito em colaboração com IA (Claude).
          </p>
        </div>
      </section>

      {/* Funcionalidades principais */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Funcionalidades principais</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Tudo no navegador"
            description="Sem necessidade de instalar qualquer software (como o Arduino IDE). Montar blocos, compilar e gravar acontece tudo no navegador. A compilação corre num servidor na nuvem, portanto as especificações do seu PC não importam."
          />
          <FeatureCard
            title="Três métodos de gravação"
            description="Além da gravação por cabo USB, suporta gravação sem fios por BLE (Bluetooth Low Energy) e WiFi (OTA). Útil para atualizar robôs já encapsulados ou gravar vários dispositivos em simultâneo numa sala de aula."
          />
          <FeatureCard
            title="Mais de 30 placas compatíveis"
            description="Compatível com a série ESP32 (padrão/S3/C3/C6), série M5Stack (Basic, StickC Plus, ATOM, Stamp, etc.), série Seeed XIAO (C3/S3/C6/RP2040), Raspberry Pi Pico/Pico W, Arduino (Uno/Nano/Mega) e ESP8266."
          />
          <FeatureCard
            title="Mais de 500 blocos"
            description="Além dos blocos básicos como lógica, ciclos, matemática e texto, disponibiliza uma vasta coleção de blocos de controlo de hardware para sensores, motores, servos, NeoPixel, OLED, buzzers, MQTT, Home Assistant e mais."
          />
          <FeatureCard
            title="Suporte para robôs baseados em OTTO"
            description="Blocos dedicados para três variantes dos robôs originais baseados em OTTO do FabLab Nishi-Harima: bípede, com rodas e Ninja. Andar, dançar e expressões gestuais podem ser controladas apenas com blocos. (É um fork independente, sem ligação ao projeto OTTO oficial.)"
          />
          <FeatureCard
            title="Suporte a 5 idiomas"
            description="Suporta japonês, inglês, espanhol, português e chinês tradicional. Todas as etiquetas de blocos e elementos da interface estão traduzidos."
          />
        </div>
      </section>

      {/* Funcionalidades únicas */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          Funcionalidades que não encontrará noutros editores de blocos
        </h2>
        <p className="text-[#8B949E] mb-4">
          O DigiCode inclui muitas funcionalidades que não estão presentes nos editores de blocos existentes (como OttoBlockly, mBlock e ArduBlock).
        </p>
        <div className="flex items-center gap-4 mb-8 text-sm text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#238636]" />
            <span className="text-[#3FB950] font-medium">Grátis</span> = disponível para todos os utilizadores
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DA3633]" />
            <span className="text-[#F85149] font-medium">PRO</span> = planos Pro / Enterprise (podem existir períodos de acesso gratuito)
          </span>
        </div>

        <div className="space-y-8">
          <UniqueFeature
            title="Atribuição de pinos personalizável"
            description="Configure livremente os números dos pinos GPIO predefinidos quando coloca blocos, para corresponderem ao seu desenho de hardware. Guarde-os como predefinições e alterne por projeto ou placa. Enquanto os editores existentes obrigam o hardware a seguir os números de pinos do editor, o DigiCode permite-lhe priorizar o desenho do hardware."
            tag="Flexibilidade de desenho"
            pricing="pro"
          />
          <UniqueFeature
            title="Largura de impulso de servo por pino"
            description="Configure a largura de impulso (min/max) do servo individualmente por pino. Além de predefinições para servos de 180°, 270° e 360°, pode especificar qualquer valor em microssegundos diretamente. Mesmo robôs que misturam servos de diferentes fabricantes podem ser afinados de forma ótima por unidade."
            tag="Compatibilidade de hardware"
            pricing="pro"
          />
          <UniqueFeature
            title="Ajuste de trim dos servos"
            description="Afine com precisão o trim (offset) dos servos para robôs OTTO através de um deslizador gráfico. Os ajustes são guardados na NVS (memória não volátil) do ESP32 e persistem entre ligar e desligar. Também pode executar testes individuais de servos (varrimento, posição inicial, teste de caminhada) a partir do navegador."
            tag="Ajuste e calibração"
          />
          <UniqueFeature
            title="Ferramenta de afinação PID"
            description="Uma ferramenta gráfica para ajustar parâmetros PID (Kp, Ki, Kd) para seguimento de linha, controlo de parede, controlo de velocidade e controlo de ângulo — através de deslizadores ou introdução direta. Guarde e carregue predefinições, e envie valores a um ESP32 em tempo real por série. Acelera muito o trabalho de afinação em competições de robótica."
            tag="Para competições"
          />
          <UniqueFeature
            title="Blocos favoritos"
            description="Entre mais de 35 categorias de blocos, selecione apenas os que mais usa e registe-os como favoritos. Resolve o problema habitual de haver demasiadas categorias para encontrar o bloco que precisa."
            tag="Facilidade de uso"
          />
          <UniqueFeature
            title="Seletor de modo de robô"
            description="Com um único clique, alterne entre 9 modos — OTTO Bípede, OTTO com Rodas, OTTO Ninja, Micromouse, Seguidor de Linha, Home Assistant, Dispositivo Genérico, etc. — para mostrar apenas os blocos relevantes a esse robô ou caso de uso. Evita que os principiantes fiquem sobrecarregados por centenas de blocos."
            tag="Facilidade de uso"
          />
          <UniqueFeature
            title="Plotter série"
            description="Trace dados série do ESP32 em tempo real. Deteta automaticamente vários canais e suporta valores com etiquetas (por exemplo, sensor1:123,sensor2:456). Inclui ajuste de intervalo do eixo Y, pausa e descarregamento de dados. Útil para verificar sensores e observar o comportamento do PID."
            tag="Depuração"
          />
          <UniqueFeature
            title="Visualização do código gerado em tempo real"
            description="Visualize em tempo real o código Arduino C++ gerado pelos seus blocos. O código atualiza-se sempre que adiciona ou altera um bloco, para aprender o que cada bloco produz e avançar para programação em texto."
            tag="Apoio à aprendizagem"
          />
          <UniqueFeature
            title="Deteção automática de conflitos com pinos ADC2"
            description="No ESP32, os pinos ADC2 não podem ser usados como entradas analógicas enquanto o WiFi está ativo. O DigiCode deteta automaticamente a utilização de ADC2 no momento da geração do código e avisa-o — evita uma armadilha comum antes que ocorra."
            tag="Específico do ESP32"
          />
          <UniqueFeature
            title="Gravação OTA em lote (vários dispositivos)"
            description="Grave vários dispositivos ESP32 simultaneamente por WiFi OTA. Perfeito para atualizar 10 ou 20 robôs em simultâneo em salas de aula ou workshops. O progresso de cada dispositivo é exibido em tempo real."
            tag="Para salas de aula"
          />
          <UniqueFeature
            title="Blocos MQTT / Home Assistant"
            description="Inclui 21 blocos de comunicação MQTT e 43 blocos de Home Assistant Auto Discovery. Defina entidades — sensores, interruptores, luzes, ventoinhas, estores — apenas com blocos, e são registadas automaticamente no Home Assistant. Ideal para projetos IoT que transformam um ESP32 num dispositivo smart-home."
            tag="IoT"
          />
          <UniqueFeature
            title="Projetos de exemplo"
            description="Projetos de exemplo integrados organizados por categorias: Básicos, Sensores, Motores, OTTO, Aplicações, Competições e IoT. Carregue com um clique e comece a experimentar imediatamente."
            tag="Apoio à aprendizagem"
          />
          <UniqueFeature
            title="Tutoriais"
            description="11 tutoriais integrados, incluindo piscar de LED, sensores, servos, caminhada do OTTO, evasão de obstáculos, seguimento de linha e micromouse. Selecionar um carrega um projeto de exemplo para que possa acompanhar enquanto lê a explicação."
            tag="Apoio à aprendizagem"
          />
        </div>
      </section>

      {/* Placas compatíveis */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Placas compatíveis</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BoardCategory
            title="ESP32 genérico"
            boards={['ESP32 (padrão)', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6']}
          />
          <BoardCategory
            title="Série M5Stack"
            boards={['M5Stack Basic/Gray/Fire', 'M5StickC Plus', 'ATOM Lite', 'ATOM Matrix', 'M5Stamp Pico', 'M5Stamp C3/C3U']}
          />
          <BoardCategory
            title="Série Seeed XIAO"
            boards={['XIAO ESP32C3', 'XIAO ESP32S3', 'XIAO ESP32C6', 'XIAO RP2040']}
          />
          <BoardCategory
            title="Raspberry Pi / RP2040"
            boards={['Raspberry Pi Pico', 'Raspberry Pi Pico W', 'Adafruit KB2040', 'Arduino Nano RP2040 Connect']}
          />
          <BoardCategory
            title="Arduino"
            boards={['Arduino Uno', 'Arduino Nano', 'Arduino Mega 2560']}
          />
          <BoardCategory
            title="ESP8266"
            boards={['ESP8266 Generic', 'NodeMCU 1.0', 'WEMOS D1 Mini']}
          />
        </div>
      </section>

      {/* Sobre a utilização */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Sobre a utilização</h2>
        <div className="space-y-6 text-[#C9D1D9]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#30363D]">
                  <th className="text-left py-3 pr-4 text-[#8B949E] font-medium">Funcionalidade</th>
                  <th className="text-center py-3 px-4 text-[#8B949E] font-medium">Convidado<br/><span className="text-xs font-normal">(sem registo)</span></th>
                  <th className="text-center py-3 px-4 text-[#8B949E] font-medium">Grátis<br/><span className="text-xs font-normal">(registado)</span></th>
                  <th className="text-center py-3 px-4 text-[#F85149] font-medium">Pro</th>
                </tr>
              </thead>
              <tbody className="text-[#C9D1D9]">
                <PlanRow feature="Programação por blocos (mais de 500 blocos)" guest pro free />
                <PlanRow feature="Compilação na nuvem" guest pro free />
                <PlanRow feature="Gravação USB / BLE / WiFi" guest pro free />
                <PlanRow feature="Trim de servos / Afinação PID" guest pro free />
                <PlanRow feature="Plotter série" guest pro free />
                <PlanRow feature="Blocos favoritos / Modos de robô" guest pro free />
                <PlanRow feature="Projetos de exemplo / Tutoriais" guest pro free />
                <PlanRow feature="Integração MQTT / Home Assistant" guest pro free />
                <PlanRow feature="Guardar projetos" guest={false} pro free note="Convidado: apenas guardar localmente" />
                <PlanRow feature="Extensões (Atribuição de pinos / Largura de impulso de servo)" guest={false} free={false} pro />
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[#8B949E]">
            As funcionalidades PRO podem ser abertas gratuitamente a todos os utilizadores durante períodos promocionais. Durante esses períodos, qualquer pessoa pode utilizá-las.
          </p>

          <p>
            Os navegadores suportados são <strong className="text-[#E6EDF3]">Chrome / Edge</strong> (porque são necessárias as APIs Web Bluetooth e Web Serial).
          </p>
          <p className="text-[#8B949E]">
            Agradecemos os seus comentários e sugestões.
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
            DigiCode Finder (aplicação de deteção de dispositivos para WiFi OTA)
          </a>
        </p>
      </footer>
    </AboutShell>
  );
}
