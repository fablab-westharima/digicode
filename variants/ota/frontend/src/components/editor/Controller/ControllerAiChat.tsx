/**
 * ControllerAiChat — Phase 4 第 2 層 AI チャット UI カスタマイズ panel
 * (50.md §8、Lite+ 課金差別化)。
 *
 * Controller dialog 内 details section に embed される。Layer 1
 * (`inferWifiUiSchema`) で生成された WifiControllerSchema を context として
 * AI に渡し、自然文指示から `CustomizationDiff` JSON を受け取って
 * `applyCustomizationDiff` で merge → 親の onApplyDiff 経由で schema 更新を
 * 通知する。1-step undo は親が前 schema cache を保持する設計 (`onUndo`
 * 渡しで toggle)。
 *
 * MVP (commit #2) スコープ:
 *   - chat history + textarea + send button
 *   - apiKey 未設定時 + Lite+ 未契約時の lock CTA
 *   - 1-step undo (前 schema 保存は親の責務)
 *   - bundle render reflection は commit #3 (bundle patches) で実装、
 *     本 commit 時点では schema state 更新のみ (preview note で user 周知)
 *
 * Out of scope (Phase 4.x polish 候補):
 *   - 自動 retry (3 回、jsonValidator error を context に追加して再送)
 *     — MVP は手動 re-prompt で十分、conversationContext 汚染回避
 *   - in-page preview iframe (50.md §11 I4)
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Loader2, Sparkles, AlertTriangle, ArrowUp, RotateCcw, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAiStore } from '@/stores/aiStore';
import {
  createAIClient,
  ApiAuthError,
  RateLimitError,
  NetworkError,
  type AiConfig,
  type Message,
} from '@/services/ai/index';
import { AI_LANGUAGES, type AiLanguage } from '@/data/aiSystemPrompts';
import { validateCustomizationDiff } from '@/services/ai/jsonValidator';
import type { CustomizationDiff } from './controllerCustomizer';
import type { WifiControllerSchema } from './types';

function resolveAiLanguage(lng: string): AiLanguage {
  return (AI_LANGUAGES as readonly string[]).includes(lng) ? (lng as AiLanguage) : 'en';
}

/** Build a one-line summary of a diff for display in the chat history. */
function summarizeDiff(diff: CustomizationDiff): string {
  const parts: string[] = [];
  if (diff.schemaLevel) {
    if (diff.schemaLevel.layout) parts.push(`layout=${diff.schemaLevel.layout}`);
    if (diff.schemaLevel.colorScheme) {
      const cs = diff.schemaLevel.colorScheme;
      const csParts = ['bg', 'fg', 'accent']
        .filter((k) => cs[k as 'bg' | 'fg' | 'accent'])
        .map((k) => `${k}=${cs[k as 'bg' | 'fg' | 'accent']}`)
        .join(',');
      if (csParts) parts.push(`schema.colorScheme(${csParts})`);
    }
    if (diff.schemaLevel.customCss) parts.push(`schema.customCss(${diff.schemaLevel.customCss.length} chars)`);
  }
  if (diff.widgets && diff.widgets.length > 0) {
    parts.push(
      ...diff.widgets.map((w) => {
        const fieldParts: string[] = [];
        if (w.displayMode) fieldParts.push(`displayMode=${w.displayMode}`);
        if (w.colorScheme) fieldParts.push('colorScheme');
        if (w.customCss) fieldParts.push(`customCss(${w.customCss.length} chars)`);
        return `widgets[${w.id}](${fieldParts.join(',') || '∅'})`;
      }),
    );
  }
  return parts.length === 0 ? '∅ (no-op)' : parts.join(', ');
}

export interface ControllerAiChatProps {
  /** Current schema (Layer 1 + previously applied Layer 2 customizations). */
  schema: WifiControllerSchema;
  /** Apply the validated diff. Parent owns schema state + persistence. */
  onApplyDiff: (diff: CustomizationDiff) => void;
  /** 1-step undo: restore previous schema. When undefined the button is hidden. */
  onUndo?: () => void;
  /** Lite+ 非 student gating (50.md §11 D2/D8). */
  isAvailable: boolean;
  /** Click handler for the upgrade-plan CTA shown when isAvailable=false. */
  onUpgradePlan?: () => void;
}

export function ControllerAiChat({
  schema,
  onApplyDiff,
  onUndo,
  isAvailable,
  onUpgradePlan,
}: ControllerAiChatProps) {
  const { t, i18n } = useTranslation();
  const {
    provider, apiKey, customEndpoint, model,
    conversationControllerCustomize, appendMessage, clearConversation,
  } = useAiStore();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationControllerCustomize.length]);

  // Lock UI for Free / student / guest users (50.md §8.2)
  if (!isAvailable) {
    return (
      <div className="px-4 py-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="font-medium text-foreground">
            {t('controllerAiChat.lockedTitle', { defaultValue: 'Lite+ プラン限定機能' })}
          </span>
          <span className="ml-1 text-[10px] text-orange-400">LITE+</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('controllerAiChat.lockedDescription', {
            defaultValue:
              'AI で UI をカスタマイズするには Lite+ プランへのアップグレードが必要です。',
          })}
        </p>
        {onUpgradePlan && (
          <button
            onClick={onUpgradePlan}
            className="text-blue-400 hover:text-blue-300 underline text-xs"
          >
            {t('controllerAiChat.upgradeCta', { defaultValue: 'プランをアップグレード' })}
          </button>
        )}
      </div>
    );
  }

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSending) return;
    if (!apiKey.trim()) {
      setErrorMsg(t('controllerAiChat.errorNoApiKey', {
        defaultValue: 'API キーが未設定です。アカウント設定から登録してください。',
      }));
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };
    appendMessage('controllerCustomize', userMsg);
    setInput('');
    setIsSending(true);
    setErrorMsg('');

    const config: AiConfig = { provider, apiKey, customEndpoint, model };
    const client = createAIClient(config);
    const language = resolveAiLanguage(i18n.language);

    try {
      const result = await client.chat({
        messages: [...conversationControllerCustomize, userMsg],
        mode: 'controllerCustomize',
        language,
        controllerSchema: schema,
      });

      const validation = validateCustomizationDiff(result.content);
      if (!validation.ok || !validation.diff) {
        // Surface validator error as a meta msg + UI error so user can adjust prompt.
        const errorMeta: Message = {
          id: crypto.randomUUID(),
          role: 'system-meta',
          content: t('controllerAiChat.errorParse', {
            defaultValue: 'AI 応答が無効な JSON 形式です: {{error}}',
            error: validation.error ?? 'unknown',
          }),
          timestamp: Date.now(),
          tokensUsed: result.tokensUsed,
        };
        appendMessage('controllerCustomize', errorMeta);
        setErrorMsg(validation.error ?? 'unknown validation error');
        return;
      }

      // Apply diff via parent callback (parent owns schema state)
      onApplyDiff(validation.diff);

      const summary = summarizeDiff(validation.diff);
      const successMeta: Message = {
        id: crypto.randomUUID(),
        role: 'system-meta',
        content: t('controllerAiChat.lastApplied', {
          defaultValue: '✓ 適用: {{summary}}',
          summary,
        }),
        timestamp: Date.now(),
        tokensUsed: result.tokensUsed,
      };
      appendMessage('controllerCustomize', successMeta);
    } catch (err) {
      let msg = t('controllerAiChat.errorGeneric', {
        defaultValue: 'AI への問い合わせでエラーが発生しました。',
      });
      if (err instanceof ApiAuthError) {
        msg = t('controllerAiChat.errorInvalidKey', { defaultValue: 'API キーが無効です。' });
      } else if (err instanceof RateLimitError) {
        msg = t('controllerAiChat.errorRateLimit', { defaultValue: 'API レート制限を超過しました。' });
      } else if (err instanceof NetworkError) {
        msg = t('controllerAiChat.errorNetwork', { defaultValue: 'ネットワークエラーが発生しました。' });
      }
      setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    if (conversationControllerCustomize.length === 0) return;
    if (window.confirm(t('controllerAiChat.confirmClear', { defaultValue: 'チャット履歴をクリアしますか?' }))) {
      clearConversation('controllerCustomize');
      setErrorMsg('');
    }
  };

  return (
    <div className="px-4 py-3 space-y-2">
      {/* Status row: tokens summary + undo */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-3 h-3" />
        <span>
          {t('controllerAiChat.title', { defaultValue: 'AI で UI をカスタマイズ' })}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {onUndo && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-muted text-xs"
              title={t('controllerAiChat.undo', { defaultValue: '元に戻す' })}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('controllerAiChat.undo', { defaultValue: '元に戻す' })}</span>
            </button>
          )}
          {conversationControllerCustomize.length > 0 && (
            <button
              onClick={handleClear}
              className="px-2 py-1 rounded border border-border hover:bg-destructive/10 hover:text-destructive text-xs"
              title={t('controllerAiChat.clear', { defaultValue: 'クリア' })}
            >
              {t('controllerAiChat.clear', { defaultValue: 'クリア' })}
            </button>
          )}
        </span>
      </div>

      {/* Chat history */}
      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto space-y-2 px-1 py-2 bg-muted/30 rounded border border-border"
      >
        {conversationControllerCustomize.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-2 space-y-1">
            <p>
              {t('controllerAiChat.placeholder', {
                defaultValue: '例: slider を青に、温度を gauge 表示に',
              })}
            </p>
            <p className="text-[10px] opacity-75">
              {t('controllerAiChat.examples.label', { defaultValue: '例:' })}{' '}
              {t('controllerAiChat.examples.color', { defaultValue: '全体を青系の色に' })} /{' '}
              {t('controllerAiChat.examples.layout', { defaultValue: '2 列レイアウトに' })}
            </p>
          </div>
        ) : (
          conversationControllerCustomize.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        {isSending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t('controllerAiChat.applying', { defaultValue: '適用中…' })}</span>
          </div>
        )}
      </div>

      {/* Input + send button */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t('controllerAiChat.placeholder', {
            defaultValue: '例: slider を青に、温度を gauge 表示に',
          })}
          rows={2}
          disabled={isSending}
          className="flex-1 px-2 py-1.5 text-xs bg-background border border-border rounded text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          title={t('controllerAiChat.send', { defaultValue: '送信' })}
          aria-label={t('controllerAiChat.send', { defaultValue: '送信' })}
          className={`shrink-0 flex items-center justify-center px-3 rounded transition-colors ${
            isSending || !input.trim()
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-400'
          }`}
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-1 text-xs text-destructive">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Note about how to see the customization in real life */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {t('controllerAiChat.previewNote', {
          defaultValue:
            '実機での反映は ESP32 reload 後 (Phase 2) または HTML 再ダウンロード後 (Phase 3) です。',
        })}
      </p>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end px-2">
        <div className="max-w-[85%] px-2 py-1.5 rounded bg-blue-900/40 text-xs text-foreground whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === 'system-meta') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 mx-2 rounded bg-muted text-[10px] text-muted-foreground">
        <Sparkles className="w-3 h-3 shrink-0" />
        <span>{msg.content}</span>
        {msg.tokensUsed != null && (
          <span className="ml-auto opacity-60">{msg.tokensUsed.toLocaleString()} tokens</span>
        )}
      </div>
    );
  }

  // assistant (rare in this mode — most outputs become system-meta after diff apply,
  // but we keep this branch in case the AI returns prose despite prohibitions)
  return (
    <div className="flex items-start gap-1.5 px-2">
      <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-xs text-foreground break-words [&_p]:mb-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        {msg.tokensUsed != null && (
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {msg.tokensUsed.toLocaleString()} tokens
          </span>
        )}
      </div>
    </div>
  );
}
