import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAiStore } from '@/stores/aiStore';
import type { AiProvider } from '@/services/ai/index';

const MODEL_DOC_LINKS: Partial<Record<AiProvider, string>> = {
  openai:    'https://platform.openai.com/docs/models',
  anthropic: 'https://docs.anthropic.com/en/docs/about-claude/models',
  gemini:    'https://ai.google.dev/gemini-api/docs/models',
};

const MODEL_PLACEHOLDERS: Record<AiProvider, string> = {
  openai:    'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
  gemini:    'gemini-2.0-flash-lite',
  custom:    '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIProviderSettingsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { provider, apiKey, customEndpoint, model, setProvider, setApiKey, setCustomEndpoint, setModel } = useAiStore();

  const [localProvider, setLocalProvider] = useState<AiProvider>(provider);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localEndpoint, setLocalEndpoint] = useState(customEndpoint ?? '');
  const [localModel, setLocalModel] = useState(model ?? '');
  const [saved, setSaved] = useState(false);

  // ダイアログ開示時に store の最新値で local state を同期
  useEffect(() => {
    if (open) {
      setLocalProvider(provider);
      setLocalApiKey(apiKey);
      setLocalEndpoint(customEndpoint ?? '');
      setLocalModel(model ?? '');
      setSaved(false);
    }
  }, [open, provider, apiKey, customEndpoint, model]);

  const handleSave = () => {
    setProvider(localProvider);
    setApiKey(localApiKey);
    setCustomEndpoint(localEndpoint);
    setModel(localModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeleteApiKey = () => {
    setLocalApiKey('');
    // 現在のプロバイダー・モデル設定はそのまま保存し、API キーのみ削除
    setProvider(localProvider);
    setApiKey('');
    setCustomEndpoint(localEndpoint);
    setModel(localModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const providers: { value: AiProvider; label: string }[] = [
    { value: 'openai',    label: t('ai.provider.openai') },
    { value: 'anthropic', label: t('ai.provider.anthropic') },
    { value: 'gemini',    label: t('ai.provider.gemini') },
    { value: 'custom',    label: t('ai.provider.custom') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('ai.label')}</DialogTitle>
          <DialogDescription className="flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-yellow-500" />
            {t('ai.apiKeyDisclaimer')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* プロバイダー選択 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('ai.provider.label')}
            </label>
            <select
              value={localProvider}
              onChange={(e) => { setLocalProvider(e.target.value as AiProvider); setLocalModel(''); }}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {providers.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* API キー */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('ai.apiKey')}
            </label>
            <input
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {localApiKey && (
              <button
                type="button"
                onClick={handleDeleteApiKey}
                className="mt-1 text-xs text-destructive hover:text-destructive/80 underline"
              >
                {t('ai.deleteApiKey')}
              </button>
            )}
          </div>

          {/* カスタムエンドポイント（custom 選択時のみ） */}
          {localProvider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('ai.customEndpoint')}
              </label>
              <input
                type="url"
                value={localEndpoint}
                onChange={(e) => setLocalEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* モデル名 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('ai.model')}
            </label>
            <input
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              placeholder={MODEL_PLACEHOLDERS[localProvider]}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {MODEL_DOC_LINKS[localProvider] && (
              <a
                href={MODEL_DOC_LINKS[localProvider]}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-3 h-3" />
                {t('ai.modelDocsLink')}
              </a>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                {t('ai.saved')}
              </>
            ) : (
              t('ai.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
