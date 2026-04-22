import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAiStore } from '@/stores/aiStore';
import { useRobotModeStore } from '@/stores/robotModeStore';
import { useBoardStore } from '@/stores/boardStore';
import { createAIClient, ApiAuthError, RateLimitError, NetworkError } from '@/services/ai/index';
import type { AiConfig, Message } from '@/services/ai/index';
import type { AiLanguage } from '@/data/aiSystemPrompts';

interface AIAssistantPanelProps {
  onAppendBlocks?: (xml: string) => void;   // S4 で使用
  workspaceXml?: string;                     // S4 で使用
  shouldShowFull: boolean;
  onUpgradePlan?: () => void;
  isAvailable?: boolean;
}

const I18N_TO_AI_LANG: Record<string, AiLanguage> = {
  ja: 'ja',
  en: 'en',
  'zh-TW': 'zh-TW',
  es: 'es',
  'pt-PT': 'pt-PT',
};

function resolveAiLanguage(lng: string): AiLanguage {
  return I18N_TO_AI_LANG[lng] ?? 'en';
}

export function AIAssistantPanel({
  onAppendBlocks: _onAppendBlocks,
  workspaceXml: _workspaceXml,
  shouldShowFull,
  onUpgradePlan,
  isAvailable,
}: AIAssistantPanelProps) {
  const { t, i18n } = useTranslation();
  const {
    provider, apiKey, customEndpoint, model,
    currentMode, conversationBlockGen, conversationHelpBot,
    appendMessage, setCurrentMode, setLastTokenUsage,
  } = useAiStore();
  const { mode: robotMode } = useRobotModeStore();
  const getSelectedBoard = useBoardStore((s) => s.getSelectedBoard);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = currentMode === 'blockGen' ? conversationBlockGen : conversationHelpBot;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.length]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSending) return;
    if (!apiKey.trim()) {
      setErrorMsg(t('ai.noApiKey'));
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };
    appendMessage(currentMode, userMsg);
    setInput('');
    setIsSending(true);
    setErrorMsg('');

    const config: AiConfig = { provider, apiKey, customEndpoint, model };
    const client = createAIClient(config);
    const board = getSelectedBoard();
    const language = resolveAiLanguage(i18n.language);

    try {
      const result = await client.chat({
        messages: [...conversation, userMsg],
        mode: currentMode,
        language,
        robotMode,
        board,
      });

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
        tokensUsed: result.tokensUsed,
      };
      appendMessage(currentMode, assistantMsg);
      setLastTokenUsage(result.tokensUsed);
    } catch (err) {
      let msg = t('ai.errorGeneration');
      if (err instanceof ApiAuthError)  msg = t('ai.errorInvalidKey');
      else if (err instanceof RateLimitError) msg = t('ai.errorRateLimit');
      else if (err instanceof NetworkError)   msg = t('ai.errorNetwork');
      setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  // 折畳時: アイコンのみ
  if (!shouldShowFull) {
    return (
      <div className="flex justify-center py-2">
        <Bot
          className={`w-4 h-4 ${isAvailable === false ? 'text-[#5C6370] opacity-50' : 'text-[#8B949E]'}`}
          title={isAvailable === false ? t('ai.requiresLitePlus') : t('ai.label')}
        />
      </div>
    );
  }

  // アップグレード CTA
  if (isAvailable === false) {
    return (
      <div className="px-2 py-2">
        <div className="px-2 py-1 text-xs font-semibold text-[#8B949E] uppercase tracking-wide flex items-center gap-1 mb-1">
          <Sparkles className="w-3 h-3" />
          {t('ai.label')}
          <span className="ml-auto text-[10px] text-orange-400">LITE+</span>
        </div>
        <div className="px-2 py-2 text-xs text-[#8B949E]">
          <p className="mb-1">{t('ai.requiresLitePlus')}</p>
          <button
            onClick={onUpgradePlan}
            className="text-blue-400 hover:text-blue-300 underline text-xs"
          >
            {t('ai.upgradePlan')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* タブバー */}
      <div className="flex shrink-0 border-b border-[#2E333D]">
        {(['blockGen', 'helpBot'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setCurrentMode(tab); setErrorMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              currentMode === tab
                ? 'text-blue-400 border-b-2 border-blue-400 bg-[#161B22]'
                : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D]'
            }`}
          >
            {tab === 'blockGen' ? t('ai.tabBlockGen') : t('ai.tabHelp')}
          </button>
        ))}
      </div>

      {/* 会話履歴 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-2">
        {conversation.length === 0 && (
          <p className="text-xs text-[#5C6370] text-center mt-4 px-2">
            {currentMode === 'blockGen'
              ? t('ai.placeholder')
              : t('ai.helpBotPlaceholder')}
          </p>
        )}
        {conversation.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {isSending && (
          <div className="flex items-center gap-1 text-xs text-[#8B949E]">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('ai.sending')}
          </div>
        )}
      </div>

      {/* 入力エリア */}
      <div className="shrink-0 border-t border-[#2E333D] px-2 pt-2 pb-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            currentMode === 'blockGen'
              ? t('ai.placeholder')
              : t('ai.helpBotPlaceholder')
          }
          rows={2}
          disabled={isSending}
          className="w-full px-2 py-1.5 text-xs bg-[#0D1117] border border-[#2E333D] rounded text-[#E6EDF3] placeholder-[#8B949E] resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? (
            <><Loader2 className="w-3 h-3 animate-spin" />{t('ai.sending')}</>
          ) : (
            <><Sparkles className="w-3 h-3" />{t('ai.sendButton')}</>
          )}
        </button>
        {errorMsg && (
          <div className="mt-1 flex items-start gap-1 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-2 py-1.5 rounded bg-blue-900/40 text-xs text-[#E6EDF3] whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  // assistant（ReactMarkdown でレンダリング）
  return (
    <div className="flex items-start gap-1.5">
      <Bot className="w-3.5 h-3.5 text-[#8B949E] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-xs text-[#E6EDF3] break-words [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 [&_code]:bg-[#0D1117] [&_code]:px-1 [&_code]:rounded [&_strong]:font-semibold">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        {msg.tokensUsed != null && (
          <span className="text-[10px] text-[#5C6370] mt-0.5 block">
            {msg.tokensUsed.toLocaleString()} tokens
          </span>
        )}
      </div>
    </div>
  );
}
