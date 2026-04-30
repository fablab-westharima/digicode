import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodePreviewProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodePreview({ code, language = 'cpp', className }: CodePreviewProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

      {/*
        コード表示 — シンタックスハイライト (react-syntax-highlighter Prism + oneDark theme)
        + 強化 scrollbar 可視化 (rules/digicode/08-ui-theme.md § Scrollable areas、
        ダイアログ context は wider scrollbar を使用、sidebar context の AIAssistantPanel /
        Sidebar の thin variant とは別 design)。
      */}
      <div
        className="flex-1 overflow-auto bg-[#0D1117] min-h-0 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-[#161B22] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#4A5160] [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-[#161B22] [&::-webkit-scrollbar-thumb:hover]:bg-[#6E7681]"
        style={{ scrollbarWidth: 'auto', scrollbarColor: '#4A5160 #161B22' }}
      >
        {code ? (
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
              background: 'transparent',
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            wrapLongLines={true}
            codeTagProps={{ style: { fontFamily: 'inherit', background: 'transparent' } }}
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          <pre className="text-sm text-[#E6EDF3] font-mono whitespace-pre-wrap p-4">
            {t('editor.codePreview.placeholder')}
          </pre>
        )}
      </div>
    </div>
  );
}
