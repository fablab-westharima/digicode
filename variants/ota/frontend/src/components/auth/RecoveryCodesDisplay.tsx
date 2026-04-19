import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, Printer, Copy, Check } from 'lucide-react';

interface RecoveryCodesDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codes: string[];
}

export function RecoveryCodesDisplay({ open, onOpenChange, codes }: RecoveryCodesDisplayProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const codesText = codes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('DigiCode Recovery Codes', 105, 20, { align: 'center' });

    // Description
    doc.setFontSize(11);
    doc.text('Use these codes to recover your account if you lose your passkey.', 20, 35);
    doc.text('Each code can only be used once. Store them in a safe place.', 20, 45);

    // Recovery Codes
    doc.setFontSize(14);
    doc.text('Recovery Codes:', 20, 60);

    doc.setFont('courier');
    doc.setFontSize(12);
    codes.forEach((code, index) => {
      const y = 70 + index * 10;
      doc.text(`${index + 1}.  ${code}`, 25, y);
    });

    // Footer
    doc.setFont('helvetica');
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 20, 180);

    // Save PDF
    doc.save('digicode-recovery-codes.pdf');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DigiCode Recovery Codes</title>
          <style>
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              padding: 40px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .description {
              font-size: 14px;
              margin-bottom: 30px;
              color: #666;
            }
            .codes {
              font-family: 'Courier New', monospace;
              font-size: 16px;
              line-height: 2;
            }
            .codes li {
              margin: 8px 0;
            }
            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #999;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>DigiCode Recovery Codes</h1>
          <div class="description">
            <p>Use these codes to recover your account if you lose your passkey.</p>
            <p>Each code can only be used once. Store them in a safe place.</p>
          </div>
          <div class="codes">
            <ol>
              ${codes.map((code) => `<li>${code}</li>`).join('')}
            </ol>
          </div>
          <div class="footer">
            Generated: ${new Date().toLocaleDateString('en-US')}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('auth.recoveryCodesDisplay.title', { defaultValue: 'リカバリーコードを保存してください' })}</DialogTitle>
          <DialogDescription>
            {t('auth.recoveryCodesDisplay.description1', { defaultValue: 'パスキーを紛失した場合、これらのコードを使用してアカウントを復旧できます。' })}
            <br />
            {t('auth.recoveryCodesDisplay.description2', { defaultValue: '各コードは1回のみ使用可能です。安全な場所に保管してください。' })}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
            {t('auth.recoveryCodesDisplay.warning', { defaultValue: '⚠️ 重要: このコードは二度と表示されません。必ず保存してください。' })}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((code, index) => (
              <div key={index} className="flex items-center">
                <span className="text-gray-500 dark:text-gray-400 mr-2">{index + 1}.</span>
                <span className="font-semibold dark:text-gray-100">{code}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t('auth.recoveryCodesDisplay.downloadPdf', { defaultValue: 'PDFダウンロード' })}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {t('auth.recoveryCodesDisplay.print', { defaultValue: '印刷' })}
            </Button>
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('auth.recoveryCodesDisplay.copied', { defaultValue: 'コピー済み' })}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t('auth.recoveryCodesDisplay.copy', { defaultValue: 'コピー' })}
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full mt-2"
          >
            {t('auth.recoveryCodesDisplay.saved', { defaultValue: '保存しました' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
