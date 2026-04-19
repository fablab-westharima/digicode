import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HELPER_DOWNLOAD_URL, launchHelper } from '@/services/helperService';

interface WifiPrerequisitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BONJOUR_DOWNLOAD_URL = 'https://support.apple.com/kb/DL999?locale=ja_JP';

export function WifiPrerequisitesDialog({ open, onOpenChange }: WifiPrerequisitesDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-yellow-600" />
            {t('wifiPrerequisites.title', { defaultValue: '必要ソフトの準備' })}
          </DialogTitle>
          <DialogDescription>
            {t('wifiPrerequisites.description', { defaultValue: 'WiFi OTAでプログラムを書き込むには、以下のソフトウェアが必要です。' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* DigiCode Finder */}
          <div className="p-4 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#161B22]">
                <Monitor className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#E6EDF3]">DigiCode Finder</p>
                <p className="text-xs text-[#8B949E] mt-1">
                  {t('wifiPrerequisites.finderDesc', { defaultValue: 'ネットワーク上のDigiCodeデバイスを自動検出するデスクトップアプリ。WiFi OTA書き込み時にデバイスのIPアドレスを取得するために使用します。' })}
                </p>
                <p className="text-xs text-[#8B949E] mt-1">
                  {t('wifiPrerequisites.supportedOs', { defaultValue: '対応OS: Windows / macOS / Linux' })}
                </p>
                <div className="flex gap-2 mt-3">
                  <a
                    href={HELPER_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="bg-[#238636] hover:bg-[#2ea043] text-white">
                      <Download className="w-3 h-3 mr-1" />
                      {t('wifiPrerequisites.download', { defaultValue: 'ダウンロード' })}
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={launchHelper}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {t('wifiPrerequisites.launch', { defaultValue: '起動' })}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Bonjour */}
          <div className="p-4 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#161B22]">
                <Monitor className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#E6EDF3]">Bonjour Print Services</p>
                  <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">{t('wifiPrerequisites.windowsOnly', { defaultValue: 'Windowsのみ' })}</span>
                </div>
                <p className="text-xs text-[#8B949E] mt-1">
                  {t('wifiPrerequisites.bonjourDesc', { defaultValue: 'DigiCode Finderがデバイスを検出するために必要なmDNSサービス。macOS/Linuxでは標準搭載のため不要です。' })}
                </p>
                <p className="text-xs text-amber-400 mt-1">
                  {t('wifiPrerequisites.restartRequired', { defaultValue: '⚠ インストール後、PCの再起動が必要です。' })}
                </p>
                <div className="mt-3">
                  <a
                    href={BONJOUR_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="bg-[#1f6feb] hover:bg-[#388bfd] text-white">
                      <Download className="w-3 h-3 mr-1" />
                      {t('wifiPrerequisites.downloadApple', { defaultValue: 'ダウンロード（Apple公式）' })}
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
