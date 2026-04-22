import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiStore } from '@/stores/aiStore';
import type { AiProvider } from '@/services/ai/index';

export function AIProviderSettings() {
  const { t } = useTranslation();
  const { provider, apiKey, customEndpoint, model, setProvider, setApiKey, setCustomEndpoint, setModel } = useAiStore();

  const [localProvider, setLocalProvider] = useState<AiProvider>(provider);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localEndpoint, setLocalEndpoint] = useState(customEndpoint ?? '');
  const [localModel, setLocalModel] = useState(model ?? '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setProvider(localProvider);
    setApiKey(localApiKey);
    setCustomEndpoint(localEndpoint);
    setModel(localModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const providers: { value: AiProvider; label: string }[] = [
    { value: 'openai', label: t('ai.provider.openai') },
    { value: 'anthropic', label: t('ai.provider.anthropic') },
    { value: 'gemini', label: t('ai.provider.gemini') },
    { value: 'custom', label: t('ai.provider.custom') },
  ];

  return (
    <div className="mt-8 border border-border rounded-lg p-6 bg-card">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t('ai.label')}
      </h2>

      {/* プロバイダー選択 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('ai.provider.label')}
        </label>
        <select
          value={localProvider}
          onChange={(e) => setLocalProvider(e.target.value as AiProvider)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {providers.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* API キー */}
      <div className="mb-2">
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
      </div>

      {/* ディスクレイマー */}
      <div className="flex items-start gap-2 mb-4 text-xs text-muted-foreground">
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-yellow-500" />
        <span>{t('ai.apiKeyDisclaimer')}</span>
      </div>

      {/* カスタムエンドポイント（custom 選択時のみ） */}
      {localProvider === 'custom' && (
        <div className="mb-4">
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
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('ai.model')}
        </label>
        <input
          type="text"
          value={localModel}
          onChange={(e) => setLocalModel(e.target.value)}
          placeholder="gpt-4o-mini"
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* 保存ボタン */}
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
    </div>
  );
}
