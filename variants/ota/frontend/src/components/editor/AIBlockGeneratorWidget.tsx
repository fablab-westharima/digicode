import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Loader2, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAiStore } from '@/stores/aiStore';
import { useRobotModeStore } from '@/stores/robotModeStore';
import { useBoardStore } from '@/stores/boardStore';
import { createAIClient, AiGenerationError, ApiAuthError, RateLimitError, NetworkError } from '@/services/ai/index';
import type { AiConfig } from '@/services/ai/index';
import type { AiLanguage } from '@/data/aiSystemPrompts';

interface AIBlockGeneratorWidgetProps {
  onAppendBlocks?: (xml: string) => void;
  workspaceXml?: string;
  shouldShowFull: boolean;
  onGoToSettings?: () => void;
}

type WidgetState = 'idle' | 'generating' | 'success' | 'error';

const I18N_TO_AI_LANG: Record<string, AiLanguage> = {
  ja: 'ja',
  en: 'en',
  'zh-TW': 'zh-TW',
  es: 'es',
  'pt-PT': 'pt-PT',
};

function resolveAiLanguage(i18nLang: string): AiLanguage {
  return I18N_TO_AI_LANG[i18nLang] ?? 'en';
}

export function AIBlockGeneratorWidget({
  onAppendBlocks,
  workspaceXml,
  shouldShowFull,
  onGoToSettings,
}: AIBlockGeneratorWidgetProps) {
  const { t, i18n } = useTranslation();
  const { provider, apiKey, customEndpoint, model } = useAiStore();
  const { mode } = useRobotModeStore();
  const getSelectedBoard = useBoardStore((s) => s.getSelectedBoard);

  const [prompt, setPrompt] = useState('');
  const [widgetState, setWidgetState] = useState<WidgetState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasApiKey = apiKey.trim().length > 0;

  const handleGenerate = async () => {
    if (!prompt.trim() || widgetState === 'generating') return;

    setWidgetState('generating');
    setErrorMsg('');

    const config: AiConfig = { provider, apiKey, customEndpoint, model };
    const client = createAIClient(config);
    const board = getSelectedBoard();
    const language = resolveAiLanguage(i18n.language);

    try {
      const result = await client.generate({
        prompt: prompt.trim(),
        mode,
        board,
        existingXml: workspaceXml,
        language,
      });
      onAppendBlocks?.(result.xml);
      setWidgetState('success');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setWidgetState('idle');
        setPrompt('');
      }, 3000);
    } catch (err) {
      let msg = t('ai.errorGeneration');
      if (err instanceof ApiAuthError) {
        msg = t('ai.errorInvalidKey');
      } else if (err instanceof RateLimitError) {
        msg = t('ai.errorRateLimit');
      } else if (err instanceof NetworkError) {
        msg = t('ai.errorNetwork');
      } else if (err instanceof AiGenerationError) {
        msg = t('ai.errorGeneration');
      }
      setErrorMsg(msg);
      setWidgetState('error');
    }
  };

  // 折畳時: アイコンのみ
  if (!shouldShowFull) {
    return (
      <div className="flex justify-center py-2">
        <Bot className="w-4 h-4 text-[#8B949E]" title={t('ai.label')} />
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      {/* セクションラベル */}
      <div className="px-2 py-1 text-xs font-semibold text-[#8B949E] uppercase tracking-wide flex items-center gap-1 mb-1">
        <Sparkles className="w-3 h-3" />
        {t('ai.label')}
      </div>

      {/* API キー未設定 */}
      {!hasApiKey ? (
        <div className="px-2 py-2 text-xs text-[#8B949E]">
          <p className="mb-1">{t('ai.noApiKey')}</p>
          <button
            onClick={onGoToSettings}
            className="text-blue-400 hover:text-blue-300 underline text-xs"
          >
            {t('ai.settingsLink')}
          </button>
        </div>
      ) : (
        <>
          {/* プロンプト入力 */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleGenerate();
              }
            }}
            placeholder={t('ai.placeholder')}
            rows={3}
            disabled={widgetState === 'generating'}
            className="w-full px-2 py-2 text-xs bg-[#0D1117] border border-[#2E333D] rounded text-[#E6EDF3] placeholder-[#8B949E] resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />

          {/* 生成ボタン */}
          <button
            onClick={handleGenerate}
            disabled={widgetState === 'generating' || !prompt.trim()}
            className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {widgetState === 'generating' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('ai.generating')}
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                {t('ai.generateButton')}
              </>
            )}
          </button>

          {/* 成功メッセージ */}
          {widgetState === 'success' && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              {t('ai.successAppended')}
            </div>
          )}

          {/* エラーメッセージ */}
          {widgetState === 'error' && (
            <div className="mt-1.5 flex items-start gap-1 text-xs text-red-400">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
