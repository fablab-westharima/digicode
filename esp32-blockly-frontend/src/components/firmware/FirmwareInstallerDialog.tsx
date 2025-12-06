import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Usb } from 'lucide-react';

interface FirmwareInstallerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FirmwareInstallerDialog({ open, onOpenChange }: FirmwareInstallerDialogProps) {
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
    if (!open) return;
    import('esp-web-tools').then(() => {
      setEspToolsReady(true);
    });
  }, [open]);

  // ボタン生成
  useEffect(() => {
    if (!espToolsReady || !containerElement || !open) return;

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

    // 非サポートメッセージ
    const unsupportedSpan = document.createElement('span');
    unsupportedSpan.setAttribute('slot', 'unsupported');
    unsupportedSpan.innerHTML = `
      <div class="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg text-center">
        <p class="text-[#f85149] text-sm">
          お使いのブラウザはサポートされていません。<br/>
          Chrome または Edge をお使いください。
        </p>
      </div>
    `;
    installButton.appendChild(unsupportedSpan);

    // 許可されていないメッセージ
    const notAllowedSpan = document.createElement('span');
    notAllowedSpan.setAttribute('slot', 'not-allowed');
    notAllowedSpan.innerHTML = `
      <div class="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg text-center">
        <p class="text-[#f85149] text-sm">
          HTTPSまたはlocalhostでのみ動作します。
        </p>
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
  }, [espToolsReady, containerElement, firmwareType, open]);

  // Web Serial APIのサポートチェック
  const isSupported = 'serial' in navigator;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#161B22] border-[#2E333D]">
        <DialogHeader>
          <DialogTitle className="text-[#58D5D5]">
            {t('firmware.installerTitle')}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('firmware.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* USBドライバー */}
          <div className="border-t border-[#2E333D] pt-4 space-y-2">
            <h3 className="font-semibold text-sm text-[#E6EDF3]">{t('firmware.usbDriver')}</h3>
            <p className="text-sm text-[#8B949E]">
              {t('firmware.usbDriverDesc')}
            </p>
            <div className="flex gap-2 flex-wrap">
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

          {/* 閉じるボタン */}
          <div className="flex justify-end gap-2 border-t border-[#2E333D] pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              {t('common.close', { defaultValue: '閉じる' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
