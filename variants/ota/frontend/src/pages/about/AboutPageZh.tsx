import { AboutShell, FeatureCard, UniqueFeature, PlanRow, BoardCategory } from './components';

export default function AboutPageZh() {
  return (
    <AboutShell backLabel="返回編輯器" labels={{ freeLabel: '免費', proLabel: 'PRO' }}>
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">DigiCode</h1>
        <p className="text-xl text-[#8B949E] mb-2">
          完全在瀏覽器中執行的微控制器積木程式設計編輯器
        </p>
        <p className="text-sm text-[#8B949E]">
          無需 Arduino IDE / 透過 USB、BLE、WiFi 燒錄 / 支援 30 種以上開發板
        </p>
      </section>

      {/* 開發緣由 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">開發緣由</h2>
        <div className="space-y-4 text-[#C9D1D9] leading-relaxed">
          <p>
            DigiCode 誕生於西播磨 FabLab,在設計教育用機器人與 IoT 裝置的硬體(電路板、外殼設計)過程中孕育而生。
          </p>
          <p>
            使用既有的積木程式設計工具(如 OttoBlockly)時,支援的開發板與腳位配置皆由編輯器端決定,因此有
            {' '}<strong className="text-[#E6EDF3]">必須讓硬體設計配合軟體限制</strong>
            的約束。即使自行研發微控制器板或擴展板,編輯器若不支援就無法使用。
          </p>
          <p>
            <strong className="text-[#E6EDF3]">既然如此,就連編輯器也自行開發吧。</strong>
            {' '}這就是本專案的起點。
          </p>
          <p>
            此外,既有工具多半需要先安裝 Arduino IDE,或僅支援 USB 燒錄,在教學現場與工作坊中常感不便,因此目標是打造一個完全在瀏覽器中執行、並支援無線燒錄的環境。
          </p>
          <p className="text-sm text-[#8B949E]">
            軟體開發與 AI(Claude)協作進行。
          </p>
        </div>
      </section>

      {/* 基本功能 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">基本功能</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="完全在瀏覽器中完成"
            description="無須安裝任何軟體(如 Arduino IDE)。組合積木、編譯、燒錄全部在瀏覽器中完成。編譯在雲端伺服器上進行,因此不挑電腦規格。"
          />
          <FeatureCard
            title="三種燒錄方式"
            description="除了 USB 有線燒錄外,還支援透過 BLE(Bluetooth Low Energy)與 WiFi(OTA)的無線燒錄。方便更新已封裝的機器人,或在教室中同時燒錄多台裝置。"
          />
          <FeatureCard
            title="支援 30 種以上開發板"
            description="支援 ESP32 系列(標準/S3/C3/C6)、M5Stack 系列(Basic、StickC Plus、ATOM、Stamp 等)、Seeed XIAO 系列(C3/S3/C6/RP2040)、Raspberry Pi Pico/Pico W、Arduino(Uno/Nano/Mega)與 ESP8266。"
          />
          <FeatureCard
            title="超過 500 個積木"
            description="除了邏輯、迴圈、數學、文字等基本積木外,還提供豐富的硬體控制積木,包括感測器、馬達、伺服馬達、NeoPixel、OLED、蜂鳴器、MQTT、Home Assistant 等。"
          />
          <FeatureCard
            title="支援 OTTO 系列機器人"
            description="為西播磨 FabLab 以 OTTO 為基礎打造的自製機器人,提供雙足、輪型、Ninja 三種變體的專用積木。走路、跳舞、動作表現皆可僅用積木完成。(本專案為獨立分支,與 OTTO 官方無關。)"
          />
          <FeatureCard
            title="支援 5 種語言"
            description="支援日文、英文、西班牙文、葡萄牙文、繁體中文。所有積木標籤與介面元素均已完整翻譯。"
          />
        </div>
      </section>

      {/* 班級管理功能(Enterprise 專屬) */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          班級管理功能(Enterprise 專屬)
        </h2>
        <p className="text-[#8B949E] mb-6 leading-relaxed">
          專為教育機構、工作坊、企業內部訓練設計的班級管理功能。講師(管理者)可建立班級、代為建立學生帳號、發送課題、批改答案,
          整個流程一站式完成。參考 TinkerCAD Classroom 的概念,並針對微控制器與機器人教育場景特別強化相關功能。
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="班級建立與管理"
            description="可選擇兩種班級類型:工作坊(1 個月)或課堂(4 個月)。每位管理者最多可同時開設 3 個班級 × 40 名學生(上限 120 人)。期限到期自動刪除,到期前 7 天起顯示警告橫幅。"
          />
          <FeatureCard
            title="學生帳號批次建立"
            description="管理者貼上名單即可自動產生登入 ID 與初始密碼。可下載 CSV 或 HTML 格式的整份名冊,方便發放。學生日後可自行修改密碼。"
          />
          <FeatureCard
            title="課題派發(Blockly + PDF)"
            description="管理者在編輯器中建立課題範本(Blockly XML),可附帶 PDF 補充資料,一鍵派發給全班。期限可自訂。學生僅能編輯自己的答案檔案,無法建立或匯入新檔(防止抄襲)。"
          />
          <FeatureCard
            title="提交 / 批改 / 退回流程"
            description="學生可隨時儲存,完成後按「提交」交給管理者。管理者在儀表板上查看全班進度,透過唯讀 Blockly 檢視器檢閱答案,評分(0-100 分 + 評語)或退回要求重新提交。學生從專屬的「批改結果」選單查看成績。"
          />
          <FeatureCard
            title="班級複製與記錄匯出"
            description="可一鍵複製現有班級的課題範本(含 PDF 附件)到新班級,非常適合在不同屆別之間重複使用教材。結束的班級可打包下載為 ZIP 檔(包含課題、答案、成績 CSV、學生名冊)。"
          />
          <FeatureCard
            title="生命週期管理"
            description="到期班級每天 JST 00:00 自動刪除,從 7 天前開始顯示警告橫幅。取消訂閱時有 1 個月的寬限期才會刪除資料。學生的編譯用量從管理者的 Enterprise 方案額度(無限)扣除,因此班級規模不影響額度。"
          />
        </div>
      </section>

      {/* 其他積木編輯器所沒有的功能 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          其他積木編輯器所沒有的功能
        </h2>
        <p className="text-[#8B949E] mb-4">
          DigiCode 搭載許多既有積木編輯器(如 OttoBlockly、mBlock、ArduBlock 等)所沒有的功能。
        </p>
        <div className="flex items-center gap-4 mb-8 text-sm text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#238636]" />
            <span className="text-[#3FB950] font-medium">免費</span> = 所有使用者皆可使用
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DA3633]" />
            <span className="text-[#F85149] font-medium">PRO</span> = Pro / Enterprise 方案(可能有免費開放期間)
          </span>
        </div>

        <div className="space-y-8">
          <UniqueFeature
            title="可自訂腳位配置"
            description="放置積木時的預設 GPIO 腳位編號可依硬體設計自由設定,並可儲存為預設組合,依專案或電路板切換。既有積木編輯器通常是「由編輯器決定腳位,硬體必須配合」,DigiCode 則讓你能以硬體設計為優先。"
            tag="設計彈性"
            pricing="pro"
          />
          <UniqueFeature
            title="每腳位的伺服脈寬設定"
            description="可依每個腳位個別設定伺服馬達的脈寬(min/max)。除了 180°、270°、360° 伺服的預設外,也能直接指定任意微秒值。即使是混用不同廠牌伺服的機器人,也能依單機做最佳設定。"
            tag="硬體相容性"
            pricing="pro"
          />
          <UniqueFeature
            title="伺服微調(Trim)"
            description="可用 GUI 滑桿微調 OTTO 機器人用伺服的 Trim(偏移值)。調整值會儲存在 ESP32 的 NVS(非揮發記憶體),即使電源關閉也能保留。也可從瀏覽器執行單一伺服測試(掃描、回原點、行走測試)。"
            tag="調整與校準"
          />
          <UniqueFeature
            title="PID 調整工具"
            description="可調整循線、牆面控制、速度控制、角度控制的 PID 參數(Kp、Ki、Kd)的 GUI 工具,支援滑桿與直接輸入。可儲存、載入預設值,並透過序列埠即時傳送到連接中的 ESP32。大幅縮短機器人競賽的調整工時。"
            tag="競賽用途"
          />
          <UniqueFeature
            title="我的最愛積木"
            description="從 35 個以上的積木分類中,挑選最常使用的積木收藏為「我的最愛」。解決因分類過多而難以找到目標積木的問題。"
            tag="易用性"
          />
          <UniqueFeature
            title="機器人模式選擇器"
            description="一鍵切換 9 種模式——OTTO 雙足、OTTO 輪型、OTTO Ninja、微型鼠、循線、Home Assistant、通用裝置等——只顯示該機器人/用途所需的積木。避免初學者被大量積木淹沒。"
            tag="易用性"
          />
          <UniqueFeature
            title="序列繪圖器"
            description="即時繪製 ESP32 傳來的序列資料。支援多通道自動偵測與帶標籤的數值(例如 sensor1:123,sensor2:456)。附 Y 軸範圍設定、暫停、資料下載功能。適合感測器驗證與觀察 PID 行為。"
            tag="偵錯"
          />
          <UniqueFeature
            title="即時檢視產生的程式碼"
            description="可即時檢視從積木產生的 Arduino C++ 程式碼。每次新增或修改積木時程式碼都會更新,能一邊學習「這個積木會產生什麼樣的程式碼」,一邊邁向文字程式設計。"
            tag="學習支援"
          />
          <UniqueFeature
            title="自動偵測 ADC2 腳位衝突"
            description="ESP32 在 WiFi 使用中時,ADC2 腳位無法作為類比輸入。DigiCode 會在產生程式碼時自動偵測 ADC2 腳位的使用並顯示警告,事先防範容易踩到的陷阱。"
            tag="ESP32 專屬"
          />
          <UniqueFeature
            title="多台同時 OTA 燒錄(批次更新)"
            description="透過 WiFi OTA 同時燒錄多台 ESP32 裝置。適用於教室或工作坊中一次更新 10 台、20 台機器人的場景。每台的進度皆即時顯示。"
            tag="教學現場"
          />
          <UniqueFeature
            title="MQTT / Home Assistant 整合積木"
            description="內建 21 個 MQTT 通訊積木與 43 個 Home Assistant Auto Discovery 積木。僅用積木即可定義感測器、開關、燈具、風扇、窗簾等實體,並自動註冊到 Home Assistant。適合將 ESP32 打造為智慧家庭裝置的 IoT 專案。"
            tag="IoT"
          />
          <UniqueFeature
            title="範例專案"
            description="內建按分類整理的範例專案:基礎、感測器、馬達、OTTO、應用、競賽、IoT 等。一鍵載入即可立即試用。"
            tag="學習支援"
          />
          <UniqueFeature
            title="教學引導"
            description="內建 LED 閃爍、感測器、伺服、OTTO 行走、避障、循線、微型鼠等 11 個教學引導。選取後即載入範例專案,可一邊閱讀說明一邊立即試用。"
            tag="學習支援"
          />
          <UniqueFeature
            title="本機編譯伺服器(Docker)"
            description="在自己的電腦上執行公開的 Docker 映像(ghcr.io/fablab-westharima/digicode-compile-server)即可於本機編譯。離線也可使用,不會消耗雲端編譯額度(無限次)。適合對外連線受限的校園、公司環境,或編譯頻率高的開發者。"
            tag="離線對應"
          />
        </div>
      </section>

      {/* 支援的開發板 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">支援的開發板</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BoardCategory
            title="通用 ESP32"
            boards={['ESP32', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6']}
          />
          <BoardCategory
            title="M5Stack 系列"
            boards={['M5Stack Basic/Gray/Fire', 'M5StickC Plus', 'ATOM Lite', 'ATOM Matrix', 'M5Stamp Pico', 'M5Stamp C3/C3U', 'M5StampS3A']}
          />
          <BoardCategory
            title="Seeed XIAO 系列"
            boards={['XIAO ESP32C3', 'XIAO ESP32S3', 'XIAO ESP32C6']}
          />
          <BoardCategory
            title="Raspberry Pi / RP2040"
            boards={['Raspberry Pi Pico', 'Raspberry Pi Pico W', 'XIAO RP2040', 'Arduino Nano RP2040 Connect']}
          />
        </div>
      </section>

      {/* 方案 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">方案</h2>
        <div className="space-y-6 text-[#C9D1D9]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#30363D]">
                  <th className="text-left py-3 pr-4 text-[#8B949E] font-medium">功能</th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    訪客<br/><span className="text-xs font-normal">$0(未註冊)</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    免費<br/><span className="text-xs font-normal">$0</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Lite<br/><span className="text-xs font-normal">$5/月</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Pro<br/><span className="text-xs font-normal">$10/月</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#F85149] font-medium">
                    Enterprise<br/><span className="text-xs font-normal">$20/月</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[#C9D1D9]">
                <PlanRow
                  feature="雲端編譯額度(每月)"
                  guest="50 次"
                  free="50 次"
                  lite="250 次"
                  pro="500 次"
                  enterprise="無限"
                />
                <PlanRow feature="積木程式設計(超過 500 個積木)" guest free lite pro enterprise />
                <PlanRow feature="USB / BLE / WiFi 燒錄" guest free lite pro enterprise />
                <PlanRow feature="伺服 Trim / PID 調整" guest free lite pro enterprise />
                <PlanRow feature="序列繪圖器" guest free lite pro enterprise />
                <PlanRow feature="我的最愛積木 / 機器人模式" guest free lite pro enterprise />
                <PlanRow feature="範例專案 / 教學引導" guest free lite pro enterprise />
                <PlanRow feature="MQTT / Home Assistant 整合" guest free lite pro enterprise />
                <PlanRow
                  feature="專案儲存(本機 JSON 檔案)"
                  guest free lite pro enterprise
                  note="所有使用者皆為本機儲存。換電腦時複製檔案即可。"
                />
                <PlanRow feature="本機編譯伺服器(Docker)" guest free lite pro enterprise />
                <PlanRow feature="擴充功能(腳位配置 / 伺服脈寬設定)" pro enterprise />
                <PlanRow feature="班級管理功能(教育機構・工作坊用)" enterprise />
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[#8B949E]">
            PRO / Enterprise 功能在推廣期間可能暫時開放給所有使用者免費使用。
          </p>

          <p className="text-sm text-[#8B949E]">
            方案變更與取消皆透過 Stripe 自助式結帳完成,發票與收據可於客戶入口下載。登入後從「方案・付款」進入。
          </p>

          <p>
            支援的瀏覽器為 <strong className="text-[#E6EDF3]">Chrome / Edge</strong>(因需使用 Web Bluetooth API 與 Web Serial API)。
          </p>
          <p className="text-[#8B949E]">
            若有任何意見或建議,歡迎隨時告訴我們。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-[#8B949E] pt-8 border-t border-[#30363D]">
        <p>DigiCode - 西播磨 FabLab</p>
        <p className="mt-1">
          <a
            href="https://github.com/fablab-westharima/DigiCode-Finder/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58A6FF] hover:underline"
          >
            DigiCode Finder(WiFi OTA 用裝置偵測應用程式)
          </a>
        </p>
        <p className="mt-4 text-xs text-[#484F58]">
          非日文語言的翻譯由 AI 輔助產生。若發現錯誤,歡迎告知我們。
        </p>
      </footer>
    </AboutShell>
  );
}
