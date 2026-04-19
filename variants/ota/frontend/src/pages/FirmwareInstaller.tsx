import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Usb, ArrowLeft } from 'lucide-react';
import { LocaleSelector } from '@/components/common/LocaleSelector';

export function FirmwareInstaller() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [firmwareType, setFirmwareType] = useState<'arduino' | 'micropython'>('arduino');
  const [espToolsReady, setEspToolsReady] = useState(false);

  // callback ref - DOM要素がマウントされたら呼ばれる
  const containerRef = (node: HTMLDivElement | null) => {
    if (node) {
      setContainerElement(node);
    }
  };

  // esp-web-toolsを事前ロード
  useEffect(() => {
    import('esp-web-tools').then(() => {
      setEspToolsReady(true);
    });
  }, []);

  // ボタン生成
  useEffect(() => {
    if (!espToolsReady || !containerElement) return;

    const container = containerElement;

    // カスタム要素を動的に作成
    const installButton = document.createElement('esp-web-install-button');
    const manifestPath = firmwareType === 'arduino'
      ? '/firmware/manifest-arduino.json'
      : '/firmware/manifest-micropython.json';
    installButton.setAttribute('manifest', manifestPath);

    // アクティベートボタン
    const activateButton = document.createElement('button');
    activateButton.setAttribute('slot', 'activate');
    activateButton.className = 'bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-colors';
    activateButton.textContent = 'INSTALL';
    installButton.appendChild(activateButton);

    const unsupportedMsg = t('firmwareInstaller.browserUnsupported', { defaultValue: 'お使いのブラウザはサポートされていません。<br/>Chrome または Edge をお使いください。' });
    const unsupportedSpan = document.createElement('span');
    unsupportedSpan.setAttribute('slot', 'unsupported');
    unsupportedSpan.innerHTML = `
      <div class="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
        <p class="text-red-700 text-sm">${unsupportedMsg}</p>
      </div>
    `;
    installButton.appendChild(unsupportedSpan);

    const notAllowedMsg = t('firmwareInstaller.notAllowedHttps', { defaultValue: 'HTTPSまたはlocalhostでのみ動作します。' });
    const notAllowedSpan = document.createElement('span');
    notAllowedSpan.setAttribute('slot', 'not-allowed');
    notAllowedSpan.innerHTML = `
      <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
        <p class="text-yellow-700 text-sm">${notAllowedMsg}</p>
      </div>
    `;
    installButton.appendChild(notAllowedSpan);

    // イベントリスナー
    installButton.addEventListener('state-changed', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('ESP Web Tools state:', detail);
    });

    container.innerHTML = '';
    container.appendChild(installButton);
  }, [espToolsReady, containerElement, firmwareType, t]);

  const handleGoToEditor = () => {
    navigate('/editor');
  };

  // Web Serial APIのサポートチェック
  const isSupported = 'serial' in navigator;

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* ヘッダー */}
      <header className="bg-[#161B22] backdrop-blur-sm border-b border-[#2E333D] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-[#E6EDF3] hover:bg-[#2E333D]">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-[#E6EDF3]">{t('firmware.title')}</h1>
          </div>
          <LocaleSelector />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="w-full bg-[#161B22] border-[#2E333D]">
          <CardHeader>
            <CardTitle className="text-2xl text-[#58D5D5]">
              {t('firmware.installerTitle')}
            </CardTitle>
            <CardDescription className="text-[#8B949E]">
              {t('firmware.description')}
            </CardDescription>
          </CardHeader>

        <CardContent className="space-y-6">
          {/* USB接続の説明 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 1</span>
              {t('firmware.step1Title')}
            </h3>
            <div className="p-4 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#2E333D]">
                  <Usb className="w-5 h-5 text-[#79C0FF]" />
                </div>
                <p className="text-sm text-[#8B949E]">
                  {t('firmware.step1Desc')}
                </p>
              </div>
            </div>
          </div>

          {/* ファームウェア選択 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 2</span>
              {t('firmware.step2Title')}
            </h3>
            <div className="space-y-2">
              {/* Arduino C++ */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  firmwareType === 'arduino'
                    ? 'border-[#58A6F9] bg-[#0D1117]'
                    : 'border-[#2E333D] bg-[#0D1117] hover:border-[#3E434D]'
                }`}
              >
                <input
                  type="radio"
                  name="firmware"
                  value="arduino"
                  checked={firmwareType === 'arduino'}
                  onChange={(e) => setFirmwareType(e.target.value as 'arduino')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">🏆</span>
                    <p className="font-semibold text-[#E6EDF3]">{t('firmware.arduinoTitle')}</p>
                  </div>
                  <p className="text-xs text-[#8B949E] mt-1">{t('firmware.arduinoDesc')}</p>
                </div>
              </label>

              {/* MicroPython */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  firmwareType === 'micropython'
                    ? 'border-[#58A6F9] bg-[#0D1117]'
                    : 'border-[#2E333D] bg-[#0D1117] hover:border-[#3E434D]'
                }`}
              >
                <input
                  type="radio"
                  name="firmware"
                  value="micropython"
                  checked={firmwareType === 'micropython'}
                  onChange={(e) => setFirmwareType(e.target.value as 'micropython')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">📚</span>
                    <p className="font-semibold text-[#E6EDF3]">{t('firmware.micropythonTitle')}</p>
                  </div>
                  <p className="text-xs text-[#8B949E] mt-1">{t('firmware.micropythonDesc')}</p>
                </div>
              </label>
            </div>
          </div>

          {/* ファームウェア書き込み */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 3</span>
              {t('firmware.step3Title')}
            </h3>

            {/* ブラウザ非対応メッセージ */}
            {!isSupported && (
              <div className="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg">
                <p className="text-[#f85149] text-sm">
                  {t('firmware.webSerialNotSupported')}
                  <br />
                  {t('firmware.useChromeOrEdge')}
                </p>
              </div>
            )}

            {/* esp-web-toolsのインストールボタン */}
            {isSupported && (
              <div className="flex flex-col items-center gap-4 p-4 bg-[#0D1117] rounded-lg border-2 border-dashed border-[#2E333D]" ref={containerRef}>
                <div className="text-[#8B949E]">{t('common.loading')}</div>
              </div>
            )}

            <p className="text-xs text-[#8B949E] text-center">
              {t('firmware.step3Desc')}
            </p>
          </div>

          {/* 成功後のナビゲーション */}
          <div className="pt-4 border-t border-[#2E333D]">
            <p className="text-sm text-[#8B949E] mb-4">
              {t('firmware.afterInstall')}
            </p>
            <Button
              onClick={handleGoToEditor}
              variant="outline"
              className="w-full border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              {t('firmware.goToEditor')}
            </Button>
          </div>

          {/* USBドライバー */}
          <div className="border-t border-[#2E333D] pt-4 space-y-2">
            <h3 className="font-semibold text-sm text-[#E6EDF3]">{t('firmware.usbDriver')}</h3>
            <p className="text-sm text-[#8B949E]">
              {t('firmware.usbDriverDesc')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
                <a
                  href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Windows
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
                <a
                  href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mac
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
                <a
                  href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Linux
                </a>
              </Button>
            </div>
            <p className="text-xs text-[#8B949E] mt-2">
              {t('firmware.usbDriverNote')}
            </p>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
