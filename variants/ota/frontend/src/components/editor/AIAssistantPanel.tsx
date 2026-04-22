import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Loader2, Sparkles, AlertTriangle, Trash2, Download, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAiStore } from '@/stores/aiStore';
import { useRobotModeStore } from '@/stores/robotModeStore';
import { useBoardStore } from '@/stores/boardStore';
import { createAIClient, ApiAuthError, RateLimitError, NetworkError } from '@/services/ai/index';
import type { AiConfig, Message } from '@/services/ai/index';
import type { AiLanguage } from '@/data/aiSystemPrompts';
import { exportConversationToMarkdown } from '@/services/ai/conversationExporter';
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning';

interface AIAssistantPanelProps {
  onAppendBlocks?: (xml: string) => void;
  workspaceXml?: string;
  onClearWorkspace?: () => void;
  shouldShowFull: boolean;
  onUpgradePlan?: () => void;
  isAvailable?: boolean;          // blockGen: Lite+ 非 student
  isHelpBotAvailable?: boolean;   // helpBot: 全認証済みユーザー（判断 10）
  isUpgradeCandidate?: boolean;   // blockGen アップグレード CTA 表示対象（Free 非 student）
  onExpand?: () => void;
  showExpandButton?: boolean;
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
  onAppendBlocks,
  workspaceXml,
  onClearWorkspace,
  shouldShowFull,
  onUpgradePlan,
  isAvailable = false,
  isHelpBotAvailable = false,
  isUpgradeCandidate = false,
  onExpand,
  showExpandButton = true,
}: AIAssistantPanelProps) {
  const { t, i18n } = useTranslation();
  const {
    provider, apiKey, customEndpoint, model,
    currentMode, conversationBlockGen, conversationHelpBot,
    appendMessage, setCurrentMode, setLastTokenUsage,
    isGenerating, setGenerating,
  } = useAiStore();
  const { mode: robotMode } = useRobotModeStore();
  const getSelectedBoard = useBoardStore((s) => s.getSelectedBoard);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = currentMode === 'blockGen' ? conversationBlockGen : conversationHelpBot;
  const hasConversation = conversationBlockGen.length > 0 || conversationHelpBot.length > 0;

  useBeforeUnloadWarning(hasConversation);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.length]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSending || isGenerating) return;
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
      if (err instanceof ApiAuthError)       msg = t('ai.errorInvalidKey');
      else if (err instanceof RateLimitError) msg = t('ai.errorRateLimit');
      else if (err instanceof NetworkError)   msg = t('ai.errorNetwork');
      setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerate = async () => {
    if (isSending || isGenerating) return;
    if (!apiKey.trim()) {
      setErrorMsg(t('ai.noApiKey'));
      return;
    }

    setGenerating(true);
    setErrorMsg('');

    const config: AiConfig = { provider, apiKey, customEndpoint, model };
    const client = createAIClient(config);
    const board = getSelectedBoard();
    const language = resolveAiLanguage(i18n.language);
    const generateRequest = input.trim() || 'Generate.';

    try {
      const result = await client.generateFromConversation({
        messages: conversationBlockGen,
        generateRequest,
        language,
        robotMode,
        board,
        existingXml: workspaceXml,
      });

      onAppendBlocks?.(result.xml);

      const count = (result.xml.match(/<block /g) || []).length;
      const metaMsg: Message = {
        id: crypto.randomUUID(),
        role: 'system-meta',
        content: t('ai.systemMetaAdded', { count }) + ` (${robotMode} / ${board.name})`,
        timestamp: Date.now(),
        generatedXml: result.xml,
      };
      appendMessage('blockGen', metaMsg);
      setInput('');
    } catch (err) {
      let msg = t('ai.errorGeneration');
      if (err instanceof ApiAuthError)       msg = t('ai.errorInvalidKey');
      else if (err instanceof RateLimitError) msg = t('ai.errorRateLimit');
      else if (err instanceof NetworkError)   msg = t('ai.errorNetwork');
      setErrorMsg(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (conversation.length === 0) return;
    const markdown = exportConversationToMarkdown(conversation, {
      mode: currentMode,
      provider,
      model: model ?? undefined,
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
    a.href = url;
    a.download = `digicode-ai-${currentMode}-${ts}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 折畳時: アイコンのみ
  if (!shouldShowFull) {
    return (
      <div className="flex justify-center py-2">
        <Bot
          className={`w-4 h-4 ${!isAvailable && !isHelpBotAvailable ? 'text-[#5C6370] opacity-50' : 'text-[#8B949E]'}`}
          title={!isAvailable && !isHelpBotAvailable ? t('ai.requiresLitePlus') : t('ai.label')}
        />
      </div>
    );
  }

  // ゲスト（isHelpBotAvailable=false）: アップグレード CTA（Sidebar が isAuthenticated でガードするため通常未到達）
  if (!isHelpBotAvailable) {
    return (
      <div className="px-2 py-2">
        <div className="px-2 py-1 text-xs font-semibold text-[#8B949E] uppercase tracking-wide flex items-center gap-1 mb-1">
          <Sparkles className="w-3 h-3" />
          {t('ai.label')}
          <span className="ml-auto text-[10px] text-orange-400">LITE+</span>
        </div>
        <div className="px-2 py-2 text-xs text-[#8B949E]">
          <p className="mb-1">{t('ai.requiresLitePlus')}</p>
          <button onClick={onUpgradePlan} className="text-blue-400 hover:text-blue-300 underline text-xs">
            {t('ai.upgradePlan')}
          </button>
        </div>
      </div>
    );
  }

  // 認証済みユーザー（helpBot 利用可、blockGen は isAvailable に依存）
  const isBusy = isSending || isGenerating;

  return (
    <div className="flex flex-col h-full">
      {/* タブバー + 補助ボタン */}
      <div className="flex shrink-0 items-stretch border-b border-[#2E333D]">
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
        {conversation.length > 0 && (
          <button
            onClick={handleExport}
            title={t('ai.exportChat')}
            className="px-2 text-[#5C6370] hover:text-[#8B949E] hover:bg-[#2E333D] transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>
        )}
        {showExpandButton && onExpand && (
          <button
            onClick={onExpand}
            title={t('ai.expandPanel')}
            className="px-2 text-[#5C6370] hover:text-[#8B949E] hover:bg-[#2E333D] transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 会話履歴 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3E4451] [&::-webkit-scrollbar-thumb:hover]:bg-[#5C6370]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3E4451 transparent' }}>
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
        {isBusy && (
          <div className="flex items-center gap-1 text-xs text-[#8B949E]">
            <Loader2 className="w-3 h-3 animate-spin" />
            {isGenerating ? t('ai.generating') : t('ai.sending')}
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
              if (e.shiftKey && currentMode === 'blockGen' && isAvailable) {
                handleGenerate();
              } else {
                handleSend();
              }
            }
          }}
          placeholder={
            currentMode === 'blockGen'
              ? t('ai.placeholder')
              : t('ai.helpBotPlaceholder')
          }
          rows={2}
          disabled={isBusy}
          className="w-full px-2 py-1.5 text-xs bg-[#0D1117] border border-[#2E333D] rounded text-[#E6EDF3] placeholder-[#8B949E] resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />

        {currentMode === 'blockGen' ? (
          <>
            <div className="mt-1 flex gap-1">
              <button
                onClick={handleSend}
                disabled={isBusy || !input.trim()}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded border border-[#2E333D] text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSending && <Loader2 className="w-3 h-3 animate-spin" />}
                {t('ai.sendButton')}
              </button>
              {/* ブロック生成ボタン: blockGen 解放済みユーザーのみ表示 */}
              {isAvailable && (
                <button
                  onClick={handleGenerate}
                  disabled={isBusy}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />}
                  {isGenerating ? t('ai.generating') : t('ai.generateButton')}
                </button>
              )}
            </div>
            {isAvailable && (
              <button
                onClick={onClearWorkspace}
                disabled={isBusy}
                className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-[#5C6370] hover:text-red-400 hover:bg-[#2E333D] rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                {t('ai.clearWorkspace')}
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleSend}
            disabled={isBusy || !input.trim()}
            className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending
              ? <><Loader2 className="w-3 h-3 animate-spin" />{t('ai.sending')}</>
              : <><Sparkles className="w-3 h-3" />{t('ai.sendButton')}</>}
          </button>
        )}

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

  if (msg.role === 'system-meta') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#2E333D]/50 text-[10px] text-[#8B949E]">
        <Sparkles className="w-3 h-3 shrink-0" />
        <span>{msg.content}</span>
      </div>
    );
  }

  // assistant
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
