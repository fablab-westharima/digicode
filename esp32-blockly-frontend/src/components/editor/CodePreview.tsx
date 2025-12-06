import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Play } from 'lucide-react';
import { useSerialStore } from '@/stores/serialStore';
import { useWifiStore } from '@/stores/wifiStore';
import { useBluetoothStore } from '@/stores/bluetoothStore';
import { useTranslation } from 'react-i18next';

interface CodePreviewProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodePreview({ code, language = 'cpp', className }: CodePreviewProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const { status: serialStatus, executeCode: serialExecute } = useSerialStore();
  const { status: wifiStatus, executeCode: wifiExecute } = useWifiStore();
  const { status: bluetoothStatus, executeCode: bluetoothExecute } = useBluetoothStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExecute = async () => {
    if (!code || isExecuting) return;

    setIsExecuting(true);
    try {
      // いずれかの接続が有効な場合、そのコネクションで実行
      if (serialStatus === 'connected') {
        await serialExecute(code);
      } else if (wifiStatus === 'connected') {
        await wifiExecute(code);
      } else if (bluetoothStatus === 'connected') {
        await bluetoothExecute(code);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  // 接続状態を確認
  const isConnected = serialStatus === 'connected' || wifiStatus === 'connected' || bluetoothStatus === 'connected';
  const canExecute = isConnected && code && !isExecuting && language === 'python';

  return (
    <div className={`flex flex-col h-full bg-[#161B22] border border-[#2E333D] rounded-lg overflow-hidden min-h-0 ${className || ''}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0D1117] border-b border-[#2E333D] shrink-0">
        <span className="text-sm text-[#8B949E]">
          {t('editor.codePreview.title', { language: language.toUpperCase() })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExecute}
            disabled={!canExecute}
            className="text-green-500 hover:text-green-400 disabled:text-[#8B949E]"
            title={
              !isConnected ? t('editor.codePreview.connectEsp32') :
              language !== 'python' ? t('editor.codePreview.micropythonOnly') :
              !code ? t('editor.codePreview.noCode') :
              t('editor.codePreview.executeOnEsp32')
            }
          >
            <Play className="w-4 h-4 mr-1" />
            {isExecuting ? t('editor.codePreview.executing') : t('editor.codePreview.execute')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-[#8B949E] hover:text-[#E6EDF3]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                {t('editor.codePreview.copied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                {t('editor.codePreview.copy')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* コード表示 */}
      <div className="flex-1 overflow-auto p-4 bg-[#0D1117] min-h-0">
        <pre className="text-sm text-[#E6EDF3] font-mono whitespace-pre-wrap">
          {code || t('editor.codePreview.placeholder')}
        </pre>
      </div>
    </div>
  );
}
