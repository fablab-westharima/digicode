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
          Sem necessidade do Arduino IDE / Gravação por USB, BLE e WiFi / 16 placas ESP32 compatíveis
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
            Ao utilizar ferramentas de programação por blocos existentes, as placas suportadas e a atribuição de pinos são definidas pela própria ferramenta, obrigando a
            {' '}<strong className="text-[#E6EDF3]">adaptar o desenho de hardware às restrições do software</strong>.
            Mesmo que desenhe a sua própria placa de microcontrolador ou uma placa breakout personalizada, não as poderá usar se o editor não as suportar.
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
            description="Sem necessidade de instalar qualquer software (como o Arduino IDE). Montar blocos, compilar e gravar — tudo isto acontece no navegador. A compilação corre num servidor na nuvem, portanto as especificações do seu PC não importam."
          />
          <FeatureCard
            title="Três métodos de gravação"
            description="Além da gravação por cabo USB, suporta gravação sem fios por BLE (Bluetooth Low Energy) e WiFi (OTA). Útil para atualizar robôs já encapsulados ou gravar vários dispositivos em simultâneo numa sala de aula."
          />
          <FeatureCard
            title="16 placas ESP32"
            description="Compatível com a família ESP32 (padrão / S3 / C3 / C6), a série M5Stack (Basic, StickC Plus, ATOM, Stamp, etc.) e a série Seeed XIAO (C3 / S3 / C6). M5Stack e XIAO ESP32 têm prioridade para os materiais do curso FS e os projetos da Fab Academy."
          />
          <FeatureCard
            title="Mais de 500 blocos"
            description="Além dos blocos básicos como lógica, ciclos, matemática e texto, disponibiliza uma vasta coleção de blocos de controlo de hardware para sensores, motores, servos, NeoPixel, OLED, buzzers, MQTT, Home Assistant e mais."
          />
          <FeatureCard
            title="Suporte a robôs originais"
            description="Blocos dedicados para três variantes dos robôs próprios do FabLab Nishi-Harima: Humanoid (bípede), Wheel (com rodas) e Transform (Ninja). A marcha, a dança e os gestos podem ser controlados apenas com blocos."
          />
          <FeatureCard
            title="Suporte a 5 idiomas"
            description="Suporta japonês, inglês, espanhol, português e chinês tradicional. Todas as etiquetas de blocos e elementos da interface estão traduzidos."
          />
        </div>
      </section>

      {/* Funcionalidades de turma (apenas Enterprise) */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          Funcionalidades de turma (apenas Enterprise)
        </h2>
        <p className="text-[#8B949E] mb-6 leading-relaxed">
          Gestão de turmas para instituições de ensino, workshops e formação empresarial. O docente (administrador) cria a turma,
          gera contas de alunos, distribui tarefas e avalia os trabalhos entregues — tudo num único local.
          Inspirado no TinkerCAD Classroom, com funcionalidades concebidas especificamente para o ensino de microcontroladores e robótica.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="Criação e gestão de turmas"
            description="Escolha entre dois tipos: Workshop (1 mês) ou Aula (4 meses). Até 3 turmas × 40 alunos por administrador (máximo 120 alunos). As turmas expiradas são eliminadas automaticamente e mostram um aviso 7 dias antes."
          />
          <FeatureCard
            title="Criação em massa de contas de alunos"
            description="O administrador cola uma lista de nomes e o sistema gera automaticamente IDs de início de sessão e palavras-passe iniciais. Descarregue a lista completa em CSV ou HTML para distribuição fácil. Os alunos podem alterar a sua palavra-passe posteriormente."
          />
          <FeatureCard
            title="Distribuição de tarefas (Blockly + PDF)"
            description="Os administradores criam modelos de tarefas (Blockly XML) no editor e distribuem-nos à turma toda, juntamente com material de apoio em PDF opcional. As datas limite são configuráveis. Os alunos só podem editar o seu próprio ficheiro de resposta — não podem criar nem importar ficheiros (prevenção de cópia)."
          />
          <FeatureCard
            title="Fluxo de entrega / avaliação / devolução"
            description="Os alunos podem gravar quantas vezes quiserem e submeter quando estiverem prontos. Os administradores visualizam o progresso num dashboard, abrem as respostas num visualizador Blockly só de leitura, avaliam (pontuação 0-100 + comentário) ou devolvem para reenvio. Os alunos consultam os resultados num menu dedicado 'Avaliações'."
          />
          <FeatureCard
            title="Duplicação e exportação de registos"
            description="Duplique as tarefas de uma turma existente (incluindo PDFs anexados) para uma nova turma com um clique — perfeito para reutilizar material didático entre turmas. As turmas concluídas podem ser descarregadas como arquivo ZIP (tarefas, respostas, CSV de notas, lista de alunos)."
          />
          <FeatureCard
            title="Gestão do ciclo de vida"
            description="As turmas expiradas são eliminadas automaticamente todos os dias às 00:00 JST, com avisos a partir de 7 dias antes. Ao cancelar a subscrição, é concedido um mês de carência antes da eliminação. A utilização de compilação dos alunos é descontada da quota Enterprise do administrador (ilimitada), pelo que o tamanho da turma não importa."
          />
        </div>
      </section>

      {/* Funcionalidades únicas */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          Funcionalidades que não encontrará noutros editores de blocos
        </h2>
        <p className="text-[#8B949E] mb-4">
          O DigiCode inclui muitas funcionalidades que não estão presentes nos editores de blocos existentes (como mBlock e ArduBlock).
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
            description="Configure a largura de impulso (min/max) do servo individualmente por pino. Além de predefinições para servos de 180°, 270° e 360°, pode especificar qualquer valor em microssegundos diretamente. Mesmo robôs que misturam servos de diferentes fabricantes podem ser afinados de forma ótima por cada servo."
            tag="Compatibilidade de hardware"
            pricing="pro"
          />
          <UniqueFeature
            title="Ajuste de trim dos servos"
            description="Afine com precisão o trim (offset) dos servos para robôs através de um deslizador gráfico. Os ajustes são guardados na NVS (memória não volátil) do ESP32 e persistem entre ligar e desligar. Também pode executar testes individuais de servos (varrimento, posição inicial, teste de caminhada) a partir do navegador."
            tag="Ajuste e calibração"
          />
          <UniqueFeature
            title="Ferramenta de afinação PID"
            description="Uma ferramenta gráfica para ajustar parâmetros PID (Kp, Ki, Kd) para seguimento de linha, controlo de parede, controlo de velocidade e controlo de ângulo — através de deslizadores ou introdução direta. Guarde e carregue predefinições, e envie valores para um ESP32 em tempo real através da porta série. Acelera muito o trabalho de afinação em competições de robótica."
            tag="Para competições"
          />
          <UniqueFeature
            title="Blocos favoritos"
            description="Entre mais de 35 categorias de blocos, selecione apenas os que mais usa e registe-os como favoritos. Resolve o problema habitual de haver demasiadas categorias para encontrar o bloco que precisa."
            tag="Facilidade de uso"
          />
          <UniqueFeature
            title="Seletor de modo de robô"
            description="Com um único clique, alterne entre modos — Humanoid (Bípede), Wheel, Transform (Ninja), Micromouse, Seguidor de Linha, Home Assistant, Dispositivo Genérico, etc. — para mostrar apenas os blocos relevantes para esse robô ou caso de uso. Evita que os principiantes fiquem sobrecarregados por centenas de blocos."
            tag="Facilidade de uso"
          />
          <UniqueFeature
            title="Plotter série"
            description="Trace dados da porta série do ESP32 em tempo real. Deteta automaticamente vários canais e suporta valores com etiquetas (por exemplo, sensor1:123,sensor2:456). Inclui ajuste de intervalo do eixo Y, pausa e descarregamento de dados. Útil para verificar sensores e observar o comportamento do PID."
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
            description="Grave vários dispositivos ESP32 em simultâneo por WiFi OTA. Perfeito para atualizar 10 ou 20 robôs de uma só vez em salas de aula ou workshops. O progresso de cada dispositivo é exibido em tempo real."
            tag="Para salas de aula"
          />
          <UniqueFeature
            title="Blocos MQTT / Home Assistant"
            description="Inclui 21 blocos de comunicação MQTT e 43 blocos de Home Assistant Auto Discovery. Defina entidades — sensores, interruptores, luzes, ventoinhas, estores — apenas com blocos, e são registadas automaticamente no Home Assistant. Ideal para projetos IoT que transformam um ESP32 num dispositivo de casa inteligente."
            tag="IoT"
          />
          <UniqueFeature
            title="Projetos de exemplo"
            description="Projetos de exemplo integrados organizados por categorias: Básicos, Sensores, Motores, Robots, Aplicações, Competições e IoT. Carregue com um clique e comece a experimentar imediatamente."
            tag="Apoio à aprendizagem"
          />
          <UniqueFeature
            title="Tutoriais"
            description="11 tutoriais integrados, incluindo piscar de LED, sensores, servos, caminhada do Humanoid, evasão de obstáculos, seguimento de linha e micromouse. Selecionar um carrega um projeto de exemplo para que possa acompanhar enquanto lê a explicação."
            tag="Apoio à aprendizagem"
          />
          <UniqueFeature
            title="Servidor de compilação local (Docker)"
            description="Executa a imagem Docker pública (Docker Hub `digicollc/digicode-compile-server` ou ghcr.io `fablab-westharima/digicode-compile-api`, replicadas com o mesmo digest em ambos os registos) no teu próprio computador para compilar localmente. Três cliques no Docker Desktop — pesquisar o nome da imagem → Pull → Run — e tens o servidor a funcionar (sem necessidade de terminal), ou abre a caixa de diálogo do DigiCode «Definições de compilação → Servidor local → Configurar» para veres os mesmos passos. Utiliza a mesma imagem que a nuvem, pelo que os resultados de compilação coincidem exatamente (sem lib drift). Funciona sem ligação à Internet e não consome a tua quota de compilação na nuvem (ilimitada). Ideal para salas de aula com acesso à Internet restrito ou programadores que compilam frequentemente."
            tag="Funciona offline"
          />
        </div>
      </section>

      {/* Placas compatíveis */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Placas compatíveis</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BoardCategory
            title="ESP32 genérico"
            boards={['ESP32', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6']}
          />
          <BoardCategory
            title="Série M5Stack"
            boards={['M5Stack Basic/Gray/Fire', 'M5StickC Plus', 'ATOM Lite', 'ATOM Matrix', 'M5Stamp Pico', 'M5Stamp C3/C3U', 'M5StampS3A']}
          />
          <BoardCategory
            title="Série Seeed XIAO"
            boards={['XIAO ESP32C3', 'XIAO ESP32S3', 'XIAO ESP32C6']}
          />
        </div>
      </section>

      {/* Planos */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">Planos</h2>
        <div className="space-y-6 text-[#C9D1D9]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#30363D]">
                  <th className="text-left py-3 pr-4 text-[#8B949E] font-medium">Funcionalidade</th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Convidado<br/><span className="text-xs font-normal">$0 (sem registo)</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Grátis<br/><span className="text-xs font-normal">$0</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Lite<br/><span className="text-xs font-normal">$5/mês</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Pro<br/><span className="text-xs font-normal">$10/mês</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Enterprise<br/><span className="text-xs font-normal">$20/mês</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#C9D1D9]">
                <PlanRow
                  feature="Quota de compilação na nuvem (por mês)"
                  guest="50"
                  free="50"
                  lite="250"
                  pro="500"
                  enterprise="Ilimitada"
                />
                <PlanRow feature="Programação por blocos (mais de 500 blocos)" guest free lite pro enterprise />
                <PlanRow feature="Gravação USB / BLE / WiFi" guest free lite pro enterprise />
                <PlanRow feature="Trim de servos / Afinação PID" guest free lite pro enterprise />
                <PlanRow feature="Plotter série" guest free lite pro enterprise />
                <PlanRow feature="Blocos favoritos / Modos de robô" guest free lite pro enterprise />
                <PlanRow feature="Projetos de exemplo / Tutoriais" guest free lite pro enterprise />
                <PlanRow feature="Integração MQTT / Home Assistant" guest free lite pro enterprise />
                <PlanRow
                  feature="Guardar projetos (ficheiro JSON local)"
                  guest free lite pro enterprise
                  note="Todos os utilizadores guardam localmente. Para migrar para outro PC basta copiar o ficheiro."
                />
                <PlanRow feature="Servidor de compilação local (Docker)" guest free lite pro enterprise />
                <PlanRow feature="Extensões (Atribuição de pinos / Largura de impulso de servo)" pro enterprise />
                <PlanRow feature="Funcionalidades de turma (para escolas e workshops)" enterprise />
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[#8B949E]">
            As funcionalidades PRO / Enterprise podem ser disponibilizadas gratuitamente a todos os utilizadores durante períodos promocionais.
          </p>

          <p className="text-sm text-[#8B949E]">
            As alterações de plano e o cancelamento são geridos em autosserviço via Stripe. As faturas e recibos podem ser descarregados a partir do portal do cliente. Aceda em "Plano e Faturação" após iniciar sessão.
          </p>

          <p>
            Os navegadores suportados são <strong className="text-[#E6EDF3]">Chrome / Edge</strong> (porque são necessárias as APIs Web Bluetooth e Web Serial).
          </p>
          <p className="text-[#8B949E]">
            Agradecemos os seus comentários e sugestões.
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-[#E6EDF3]">Licença</h2>
        <p className="text-sm text-[#8B949E]">
          O DigiCode é software de código aberto distribuído sob a <strong className="text-[#E6EDF3]">GNU Affero General Public License version 3 (AGPL-3.0)</strong>. Copyright © 2024-2026 DigiCo LLC.
        </p>
        <p className="text-sm text-[#8B949E]">
          O código-fonte está disponível no <a href="https://github.com/fablab-westharima/digicode" target="_blank" rel="noopener noreferrer" className="text-[#58A6FF] hover:underline">GitHub</a>. Consulte o <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-[#58A6FF] hover:underline">texto oficial da GNU AGPL v3</a> para mais detalhes.
        </p>
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
        <p className="mt-4 text-xs text-[#484F58]">
          As traduções para idiomas diferentes do japonês são assistidas por IA. Agradecemos que nos reportem imprecisões.
        </p>
      </footer>
    </AboutShell>
  );
}
