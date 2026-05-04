import type { AIClient, AiConfig, ChatInput, ChatOutput, GenerateFromConversationInput, GenerateOutput } from './index';
import {
  buildHelpBotSystemPrompt,
  buildBlockGenConversationPrompt,
  buildControllerCustomizePrompt,
  fetchCatalog,
  filterCatalog,
} from './systemPrompt';
import { trimConversationForContext } from './conversationContext';
import { ApiAuthError, RateLimitError, ApiServerError, NetworkError } from './errors';
import { generateWithRetry } from './retryHelper';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-haiku-4-5';

type ApiMessage = { role: 'user' | 'assistant'; content: string };

export class AnthropicClient implements AIClient {
  private config: AiConfig;
  constructor(config: AiConfig) { this.config = config; }

  private async rawCall(
    systemPrompt: string,
    messages: ApiMessage[],
    maxTokens = 4000,
  ): Promise<{ content: string; tokensUsed: number }> {
    const model = (this.config.model?.trim()) || DEFAULT_MODEL;

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
          // ブラウザ直叩き用必須ヘッダー（なければ CORS で即失敗）
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages,
          temperature: 0.2,
          max_tokens: maxTokens,
        }),
      });
    } catch (e) {
      throw new NetworkError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new ApiAuthError(`Authentication failed (${response.status}): ${body}`);
      }
      if (response.status === 429) {
        throw new RateLimitError(`Rate limit exceeded: ${body}`);
      }
      throw new ApiServerError(`API error ${response.status}: ${body}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const textBlock = data.content.find(c => c.type === 'text');
    const content = textBlock?.text ?? '';
    const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
    return { content, tokensUsed };
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    const trimmed = trimConversationForContext(input.messages);

    // controllerCustomize は catalog 不要 (schema 自体を context に持つ、Phase 4 §7)。
    // helpBot / blockGen は catalog overview を渡し、AI が DigiCode 固有ブロック type 名を把握できるようにする。
    let systemPrompt: string;
    if (input.mode === 'controllerCustomize') {
      if (!input.controllerSchema) {
        throw new Error('controllerCustomize mode requires controllerSchema in ChatInput');
      }
      systemPrompt = buildControllerCustomizePrompt({
        language: input.language,
        schema: input.controllerSchema,
      });
    } else if (input.mode === 'helpBot') {
      const catalog = await fetchCatalog();
      const filteredBlocks = filterCatalog(catalog);
      systemPrompt = buildHelpBotSystemPrompt({
        language: input.language,
        mode: input.robotMode,
        board: input.board,
        filteredBlocks,
      });
    } else {
      const catalog = await fetchCatalog();
      const filteredBlocks = filterCatalog(catalog);
      systemPrompt = buildBlockGenConversationPrompt({
        language: input.language,
        mode: input.robotMode,
        board: input.board,
        filteredBlocks,
      });
    }

    const messages: ApiMessage[] = trimmed.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    return this.rawCall(systemPrompt, messages, 2000);
  }

  async generateFromConversation(input: GenerateFromConversationInput): Promise<GenerateOutput> {
    return generateWithRetry(input, async (systemPrompt, historyMessages, finalUserContent) => {
      const messages: ApiMessage[] = [
        ...historyMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: finalUserContent },
      ];
      return this.rawCall(systemPrompt, messages);
    });
  }
}
