/**
 * Copy-to-clipboard コードブロック (shared component)
 *
 * 起源: 2026-05-01 LocalServerSetupDialog.tsx 内 helper として実装、
 * 第101回 (2026-05-11) AiPromptDialog 追加に伴い両 dialog から再利用するため
 * common/ に抽出。
 *
 * UX: コードブロック表示 + 右上に絶対配置 Copy button、click で
 * navigator.clipboard.writeText → 2 秒間 Check icon swap → Copy に復帰。
 *
 * i18n: localServerSetup.copy / localServerSetup.copied (既存 namespace 共有)。
 * AI prompt 用途でも同じ button label で OK (「コピー」/「コピー済」は context-free)。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface CommandBlockProps {
  /** Code text を表示・コピー対象として渡す。複数行 OK (whitespace-pre-wrap で改行保持)。 */
  command: string;
}

export function CommandBlock({ command }: CommandBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative bg-muted border border-border rounded-md">
      <pre className="p-3 pr-20 overflow-x-auto text-xs text-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
        {command}
      </pre>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 mr-1" />
            {t('localServerSetup.copied', { defaultValue: 'コピー済' })}
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 mr-1" />
            {t('localServerSetup.copy', { defaultValue: 'コピー' })}
          </>
        )}
      </Button>
    </div>
  );
}
