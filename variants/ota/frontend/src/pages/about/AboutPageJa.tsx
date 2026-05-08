import { AboutShell, FeatureCard, UniqueFeature, PlanRow, BoardCategory } from './components';

export default function AboutPageJa() {
  return (
    <AboutShell backLabel="エディタに戻る" labels={{ freeLabel: '無料', proLabel: 'PRO' }}>
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">DigiCode</h1>
        <p className="text-xl text-[#8B949E] mb-2">
          ブラウザだけで完結するマイコン向けブロックプログラミングエディタ
        </p>
        <p className="text-sm text-[#8B949E]">
          Arduino IDE不要 / USB・BLE・WiFiで書き込み / ESP32 系 16 boards に対応
        </p>
      </section>

      {/* 開発の経緯 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">開発の経緯</h2>
        <div className="space-y-4 text-[#C9D1D9] leading-relaxed">
          <p>
            DigiCodeは、ファブラボ西播磨で教育用ロボットやIoTデバイスのハード設計（基板設計・筐体設計）をする中で生まれました。
          </p>
          <p>
            既存のブロックプログラミングツールを使っていると、対応ボードやピン配置がエディタ側の仕様で決まっているため、
            <strong className="text-[#E6EDF3]">ハード設計をソフトの都合に合わせなければならない</strong>
            という制約がありました。
            自分でオリジナルのマイコンボードやブレイクアウトボードを設計しても、エディタが対応していなければ使えません。
          </p>
          <p>
            <strong className="text-[#E6EDF3]">ならばエディタ側も自分で作ってしまおう。</strong>
            これが開発のきっかけです。
          </p>
          <p>
            加えて、既存ツールではArduino IDEのインストールが前提だったり、
            書き込みがUSBケーブルのみだったりと、教育現場やワークショップで不便な場面が多かったため、
            ブラウザだけで完結し、ワイヤレス書き込みにも対応する環境を目指しました。
          </p>
          <p className="text-sm text-[#8B949E]">
            ソフトウェア開発はAI（Claude）との協業で進めています。
          </p>
        </div>
      </section>

      {/* 基本機能 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">基本機能</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="ブラウザだけで完結"
            description="Arduino IDEなどのソフトのインストールは不要。ブロックを組む、コンパイル、書き込みまですべてブラウザ上で行えます。クラウドコンパイルサーバでビルドするため、PCのスペックも問いません。"
          />
          <FeatureCard
            title="3つの書き込み方式"
            description="USB有線書き込みに加え、BLE（Bluetooth Low Energy）とWiFi経由の無線書き込み（OTA）にも対応。ケーシング済みロボットの更新や、教室での複数台同時書き込みに便利です。"
          />
          <FeatureCard
            title="ESP32 系 16 boards に対応"
            description="ESP32 シリーズ（無印 / S3 / C3 / C6）、M5Stack シリーズ（Basic, StickC Plus, ATOM, Stamp 等）、Seeed XIAO シリーズ（C3 / S3 / C6）に対応。FS 講座教材（M5Stack 系）+ Fab Academy 推奨 (XIAO ESP32 系) を最優先。"
          />
          <FeatureCard
            title="500以上のブロック"
            description="ロジック、ループ、数学、テキストなどの基本ブロックに加え、センサー、モーター、サーボ、NeoPixel、OLED、ブザー、MQTT、Home Assistantなど、ハードウェア制御のブロックを豊富に揃えています。"
          />
          <FeatureCard
            title="オリジナルロボット対応"
            description="ファブラボ西播磨オリジナルのロボット向けに、Humanoid（2足歩行）・Wheel・Transformの3バリアントの専用ブロックを用意。歩行、ダンス、ジェスチャー表現までブロックだけで制御できます。"
          />
          <FeatureCard
            title="5言語対応"
            description="日本語・英語・スペイン語・ポルトガル語・繁体字中国語に対応。ブロックのラベルやUIすべてが翻訳されています。"
          />
        </div>
      </section>

      {/* クラス機能（Enterprise 専用） */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          クラス機能（Enterprise 専用）
        </h2>
        <p className="text-[#8B949E] mb-6 leading-relaxed">
          教育機関・ワークショップ・社内研修向けのクラス管理機能。講師（管理者）がクラスを作成し、
          生徒アカウントを代理発行、課題を配布、提出された答案を採点するまでを一貫して行えます。
          TinkerCAD Classroom を参考にしつつ、マイコン・ロボットのハードウェア教育に特化した機能を揃えました。
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title="クラス作成・管理"
            description="WS（1ヶ月）/ 教室（4ヶ月）の 2 種別から選択。1 管理者あたり最大 3 クラス × 40 人、合計 120 人まで。期限切れで自動削除、期限前には警告バナーで通知します。"
          />
          <FeatureCard
            title="生徒アカウント一括作成"
            description="管理者が名前リストを貼り付けるだけで、ログイン ID と初期パスワードを自動生成。CSV / HTML 形式でまとめてダウンロードでき、配布に便利です。生徒は自分でパスワードを変更できます。"
          />
          <FeatureCard
            title="課題配布（Blockly + PDF）"
            description="管理者がエディタで作成した課題テンプレート（Blockly XML）と PDF の補足資料を、クラス全員に一斉配布。期限を年/月/日で指定できます。生徒は自分専用の答案ファイルのみ編集可能（カンニング防止）。"
          />
          <FeatureCard
            title="答案・採点・差戻しワークフロー"
            description="生徒は答案を何度でも保存でき、完成したら「提出」で管理者に送信。管理者は進捗ダッシュボードで一覧確認、読み取り専用 Blockly ビューアで答案を閲覧、スコア（0-100）+ コメントで採点、または差戻しで再提出を要求できます。生徒は専用の「採点結果」メニューで結果を確認。"
          />
          <FeatureCard
            title="クラス複製・記録エクスポート"
            description="既存クラスの課題テンプレート（PDF 添付含む）を新クラスにワンクリック複製。新しいコホート向けに教材を使い回せます。完了したクラスは ZIP でまとめてダウンロード（課題・答案・成績 CSV・生徒一覧を含む記録アーカイブ）。"
          />
          <FeatureCard
            title="ライフサイクル管理"
            description="期限切れクラスは毎日 JST 0 時に自動削除、期限 7 日前からヘッダーに警告バナー表示。解約時は 1 ヶ月の猶予期間付きで削除。生徒のコンパイルは管理者の Enterprise プラン枠（無制限）から消費するため、生徒数を気にせず授業できます。"
          />
        </div>
      </section>

      {/* 他のブロックエディタにない機能 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">
          他のブロックエディタにはない機能
        </h2>
        <p className="text-[#8B949E] mb-4">
          DigiCodeは、既存のブロックエディタ（mBlock, ArduBlockなど）にはない機能を多数搭載しています。
        </p>
        <div className="flex items-center gap-4 mb-8 text-sm text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#238636]" />
            <span className="text-[#3FB950] font-medium">無料</span> = 全ユーザー利用可能
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DA3633]" />
            <span className="text-[#F85149] font-medium">PRO</span> = Pro / Enterprise プラン（無料開放期間あり）
          </span>
        </div>

        <div className="space-y-8">
          <UniqueFeature
            title="ピンアサインのカスタマイズ"
            description="ブロック配置時のデフォルトGPIOピン番号を、ハードの設計に合わせて自由に設定できます。プリセットとして保存し、プロジェクトや基板ごとに切り替え可能。既存のブロックエディタでは「エディタが決めたピン番号にハードを合わせる」のが当たり前ですが、DigiCodeではハード側の設計を優先できます。"
            tag="設計自由度"
            pricing="pro"
          />
          <UniqueFeature
            title="サーボパルス幅の個別設定"
            description="サーボモーターのパルス幅（min/max）をピンごとに個別設定できます。180度・270度・360度サーボのプリセットに加え、任意のマイクロ秒値を直接指定可能。異なるメーカーのサーボを混在させるロボットでも、1台ごとに最適な設定ができます。"
            tag="ハード対応力"
            pricing="pro"
          />
          <UniqueFeature
            title="サーボトリム調整"
            description="ロボット用サーボのトリム（オフセット）をGUIのスライダーで微調整。調整値はESP32のNVS（不揮発メモリ）に保存され、電源を切っても保持されます。個別サーボのテスト（スイープ、ホームポジション、歩行テスト）もブラウザから実行できます。"
            tag="調整・チューニング"
          />
          <UniqueFeature
            title="PIDチューニングツール"
            description="ライントレース、壁制御、速度制御、角度制御のPIDパラメータ（Kp, Ki, Kd）をスライダーと直接入力で調整できるGUIツール。プリセットとして保存・読み込みでき、シリアル接続中のESP32にリアルタイム送信可能。ロボット競技の調整作業を大幅に効率化します。"
            tag="競技向け"
          />
          <UniqueFeature
            title="お気に入りブロック"
            description="35以上あるブロックカテゴリから、よく使うものだけを選んで「お気に入り」として登録可能。カテゴリが多すぎて目的のブロックが見つからない問題を解消します。"
            tag="使いやすさ"
          />
          <UniqueFeature
            title="ロボットモードセレクター"
            description="Humanoid（2足歩行）、Wheel、Transform（Ninja）、マイクロマウス、ライントレース、Home Assistant、汎用デバイスなど、モードを切り替えるだけで、そのロボット/用途に必要なブロックだけが表示されます。初心者が大量のブロックに圧倒されるのを防ぎます。"
            tag="使いやすさ"
          />
          <UniqueFeature
            title="シリアルプロッター"
            description="ESP32からのシリアルデータをリアルタイムでグラフ表示。複数チャンネル自動検出、ラベル付き値（sensor1:123,sensor2:456）に対応。Y軸レンジ設定、一時停止、データダウンロード機能付き。センサーの動作確認やPIDの挙動観察に便利です。"
            tag="デバッグ"
          />
          <UniqueFeature
            title="生成コードのリアルタイム確認"
            description="ブロックから生成されるArduino C++コードをリアルタイムで確認できます。ブロックを追加・変更するたびにコードが更新されるので、「このブロックがどんなコードになるのか」を学びながらテキストプログラミングへステップアップできます。"
            tag="学習支援"
          />
          <UniqueFeature
            title="ADC2ピン競合の自動検出"
            description="ESP32ではWiFi使用中にADC2ピンがアナログ入力として使えないという制約がありますが、DigiCodeはコード生成時にADC2ピンの使用を自動検出し、警告を表示します。ハマりやすい落とし穴を未然に防ぎます。"
            tag="ESP32特化"
          />
          <UniqueFeature
            title="複数台同時OTA書き込み（バッチ更新）"
            description="WiFi OTAで複数のESP32デバイスに同時にプログラムを書き込めます。教室やワークショップで10台、20台のロボットを一斉にアップデートする場面に対応。デバイスごとの進捗がリアルタイムで表示されます。"
            tag="教育現場向け"
          />
          <UniqueFeature
            title="MQTT / Home Assistant連携ブロック"
            description="MQTT通信ブロック（21個）とHome Assistant Auto Discoveryブロック（43個）を搭載。センサー、スイッチ、ライト、ファン、カバーなどのエンティティをブロックだけで定義でき、Home Assistantに自動登録されます。ESP32をスマートホームデバイスに変えるIoTプロジェクトに。"
            tag="IoT"
          />
          <UniqueFeature
            title="サンプルプロジェクト"
            description="基本、センサー、モーター、ロボット、応用、競技、IoTの各カテゴリに分類されたサンプルプロジェクトを内蔵。ワンクリックで読み込んですぐに試せます。"
            tag="学習支援"
          />
          <UniqueFeature
            title="チュートリアル"
            description="LED点滅、センサー、サーボ、Humanoid歩行、障害物回避、ライントレース、マイクロマウスなど11種類のチュートリアルを内蔵。選択するとサンプルプロジェクトが読み込まれ、説明を見ながらすぐに試せます。"
            tag="学習支援"
          />
          <UniqueFeature
            title="ローカルコンパイルサーバー（Docker）"
            description="公開 Docker イメージ（DockerHub の `digicollc/digicode-compile-server` または ghcr.io の `fablab-westharima/digicode-compile-api`、両 registry に同 digest mirror publish）を手元で起動すれば、コンパイルを自分の PC で行えます。Docker Desktop GUI でイメージ名を検索 → Pull → Run の 3 クリックで完結（ターミナル操作不要）、または DigiCode の「コンパイル設定 → ローカルサーバー → セットアップ」ダイアログから手順を確認できます。クラウドと同じイメージを使用するためコンパイル結果は完全に一致（lib drift なし）。オフラインでも動作し、クラウドのコンパイル枠を消費しません（無制限）。学校・社内ネットワークで外部接続が制限される環境や、コンパイル頻度が高い開発者に最適。"
            tag="オフライン対応"
          />
        </div>
      </section>

      {/* 対応ボード一覧 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">対応ボード</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BoardCategory
            title="汎用 ESP32"
            boards={['ESP32（無印）', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6']}
          />
          <BoardCategory
            title="M5Stack シリーズ"
            boards={['M5Stack Basic/Gray/Fire', 'M5StickC Plus', 'ATOM Lite', 'ATOM Matrix', 'M5Stamp Pico', 'M5Stamp C3/C3U', 'M5StampS3A']}
          />
          <BoardCategory
            title="Seeed XIAO シリーズ"
            boards={['XIAO ESP32C3', 'XIAO ESP32S3', 'XIAO ESP32C6']}
          />
        </div>
      </section>

      {/* ご利用について */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-[#30363D]">ご利用プラン</h2>
        <div className="space-y-6 text-[#C9D1D9]">
          {/* プラン表 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#30363D]">
                  <th className="text-left py-3 pr-4 text-[#8B949E] font-medium">機能</th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    ゲスト<br/><span className="text-xs font-normal">$0（未登録）</span>
                  </th>
                  <th className="text-center py-3 px-3 text-[#8B949E] font-medium">
                    Free<br/><span className="text-xs font-normal">$0</span>
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
                  feature="クラウドコンパイル枠（月）"
                  guest="50 回"
                  free="50 回"
                  lite="250 回"
                  pro="500 回"
                  enterprise="無制限"
                />
                <PlanRow feature="ブロックプログラミング（500以上のブロック）" guest free lite pro enterprise />
                <PlanRow feature="USB / BLE / WiFi 書き込み" guest free lite pro enterprise />
                <PlanRow feature="サーボトリム・PIDチューニング" guest free lite pro enterprise />
                <PlanRow feature="シリアルプロッター" guest free lite pro enterprise />
                <PlanRow feature="お気に入りブロック・ロボットモード" guest free lite pro enterprise />
                <PlanRow feature="サンプルプロジェクト・チュートリアル" guest free lite pro enterprise />
                <PlanRow feature="MQTT / Home Assistant連携" guest free lite pro enterprise />
                <PlanRow
                  feature="プロジェクト保存（ローカル JSON ファイル）"
                  guest free lite pro enterprise
                  note="全ユーザー共通でローカル保存。PC 移行時はファイルコピーで OK"
                />
                <PlanRow feature="ローカルコンパイルサーバー（Docker）" guest free lite pro enterprise />
                <PlanRow feature="拡張機能（ピンアサイン・サーボパルス幅設定）" pro enterprise />
                <PlanRow feature="クラス機能（教育機関・WS 向け）" enterprise />
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[#8B949E]">
            PRO / Enterprise 機能は無料開放期間を設けることがあります。開放中は対象機能を全ユーザーがお使いいただけます。
          </p>

          <p className="text-sm text-[#8B949E]">
            プラン変更・解約は Stripe のセルフサービス決済で完結します。請求書・領収書のダウンロードにも対応。ログイン後「プラン・お支払い」からアクセス。
          </p>

          <p>
            対応ブラウザは <strong className="text-[#E6EDF3]">Chrome / Edge</strong> です（Web Bluetooth API、Web Serial APIを使用するため）。
          </p>
          <p className="text-[#8B949E]">
            ご意見・ご要望がありましたら、お気軽にお寄せください。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-[#8B949E] pt-8 border-t border-[#30363D]">
        <p>DigiCode - ファブラボ西播磨</p>
        <p className="mt-1">
          <a
            href="https://github.com/fablab-westharima/DigiCode-Finder/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58A6FF] hover:underline"
          >
            DigiCode Finder（WiFi OTA用デバイス検出アプリ）
          </a>
        </p>
      </footer>
    </AboutShell>
  );
}
