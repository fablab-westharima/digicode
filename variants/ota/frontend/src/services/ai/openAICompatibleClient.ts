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

const ENDPOINTS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  gemini:  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};

const DEFAULT_MODELS: Record<string, string> = {
  openai:  'gpt-4o-mini',
  gemini:  'gemini-2.0-flash-lite',
  custom:  'gpt-4o-mini',
};

type ApiMessage = { role: string; content: string };

export class OpenAICompatibleClient implements AIClient {
  private config: AiConfig;
  constructor(config: AiConfig) { this.config = config; }

  private getEndpoint(): string {
    if (this.config.provider === 'custom' && this.config.customEndpoint) {
      return `${this.config.customEndpoint.replace(/\/+$/, '')}/chat/completions`;
    }
    return ENDPOINTS[this.config.provider] ?? ENDPOINTS.openai;
  }

  private async rawCall(
    messages: ApiMessage[],
    maxTokens = 4000,
  ): Promise<{ content: string; tokensUsed: number }> {
    const model = (this.config.model?.trim()) || DEFAULT_MODELS[this.config.provider] || 'gpt-4o-mini';

    let response: Response;
    try {
      response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: maxTokens }),
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
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
    };
    const content = data.choices[0]?.message?.content ?? '';
    const tokensUsed = data.usage?.total_tokens
      ?? ((data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0));
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

    const messages: ApiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...trimmed.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    return this.rawCall(messages, 2000);
  }

  async generateFromConversation(input: GenerateFromConversationInput): Promise<GenerateOutput> {
    return generateWithRetry(input, async (systemPrompt, historyMessages, finalUserContent) => {
      const messages: ApiMessage[] = [
        { role: 'system', content: systemPrompt },
        ...historyMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: finalUserContent },
      ];
      return this.rawCall(messages);
    });
  }
}
