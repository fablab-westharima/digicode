/**
 * USBドライバーダイアログ
 *
 * ESP32開発ボード用のUSBシリアルドライバーのダウンロードリンクを提供
 */

import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Usb } from 'lucide-react';

interface UsbDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsbDriverDialog({ open, onOpenChange }: UsbDriverDialogProps) {
  const { t } = useTranslation();

  const drivers = [
    {
      name: 'CP210x (Silicon Labs)',
      chips: 'CP2102, CP2104など',
      description: '多くのESP32開発ボードで使用されているUSB-UARTブリッジチップ',
      windows: 'https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers?tab=downloads',
      mac: 'https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers?tab=downloads',
      linux: 'https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers?tab=downloads',
    },
    {
      name: 'CH340 (WCH)',
      chips: 'CH340G, CH340C, CH340Eなど',
      description: '安価なESP32開発ボードでよく使用されるUSB-UARTブリッジチップ',
      windows: 'https://www.wch-ic.com/downloads/CH341SER_EXE.html',
      mac: 'https://www.wch-ic.com/downloads/CH341SER_MAC_ZIP.html',
      linux: 'カーネルに含まれています（通常インストール不要）',
    },
    {
      name: 'FTDI',
      chips: 'FT232R, FT231Xなど',
      description: '高品質なESP32開発ボードで使用されるUSB-UARTブリッジチップ',
      windows: 'https://ftdichip.com/drivers/vcp-drivers/',
      mac: 'https://ftdichip.com/drivers/vcp-drivers/',
      linux: 'https://ftdichip.com/drivers/vcp-drivers/',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Usb className="w-5 h-5 text-blue-600" />
            {t('usbDriver.title', { defaultValue: 'USBドライバー' })}
          </DialogTitle>
          <DialogDescription>
            {t('usbDriver.description', {
              defaultValue:
                'デバイスが認識されない場合、USBシリアルドライバーをインストールしてください。お使いのESP32ボードに搭載されているチップに対応したドライバーをダウンロードしてください。',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {drivers.map((driver, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{driver.name}</CardTitle>
                <CardDescription className="text-sm">
                  <span className="font-medium">対応チップ:</span> {driver.chips}
                  <br />
                  {driver.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {/* Windows */}
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full justify-start"
                  >
                    <a
                      href={driver.windows}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Windows
                    </a>
                  </Button>

                  {/* Mac */}
                  {driver.mac.startsWith('http') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start"
                    >
                      <a
                        href={driver.mac}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Mac
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full justify-start text-xs"
                    >
                      Mac: {driver.mac}
                    </Button>
                  )}

                  {/* Linux */}
                  {driver.linux.startsWith('http') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start"
                    >
                      <a
                        href={driver.linux}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Linux
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full justify-start text-xs"
                    >
                      Linux: {driver.linux}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 補足情報 */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>ヒント:</strong> お使いのボードに搭載されているチップがわからない場合は、
                ボードの裏面や商品ページをご確認ください。多くの場合、USB端子付近に印字されています。
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', { defaultValue: '閉じる' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
