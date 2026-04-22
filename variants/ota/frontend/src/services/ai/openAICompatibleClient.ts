import type { AIClient, AiConfig, GenerateInput, GenerateOutput, ChatInput, ChatOutput, GenerateFromConversationInput } from './index';
import {
  buildSystemPrompt,
  buildHelpBotSystemPrompt,
  buildBlockGenConversationPrompt,
  fetchCatalog,
  filterCatalog,
  getAllowedTypes,
} from './systemPrompt';
import { trimConversationForContext } from './conversationContext';
import { validateBlocklyXml } from './xmlValidator';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import { AiGenerationError, ApiAuthError, RateLimitError, ApiServerError, NetworkError } from './errors';

const ENDPOINTS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  gemini:  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};

const DEFAULT_MODELS: Record<string, string> = {
  openai:  'gpt-4o',
  gemini:  'gemini-2.0-flash-lite',
  custom:  'gpt-4o',
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
    const model = (this.config.model?.trim()) || DEFAULT_MODELS[this.config.provider] || 'gpt-4o';

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
    const systemPrompt = input.mode === 'helpBot'
      ? buildHelpBotSystemPrompt({ language: input.language, mode: input.robotMode, board: input.board })
      : buildBlockGenConversationPrompt({ language: input.language, mode: input.robotMode, board: input.board });

    const messages: ApiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...trimmed.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    return this.rawCall(messages, 2000);
  }

  async generateFromConversation(input: GenerateFromConversationInput): Promise<GenerateOutput> {
    const catalog = await fetchCatalog();
    const filteredBlocks = filterCatalog(catalog);
    const allowedTypes = getAllowedTypes(filteredBlocks);

    const systemPrompt = buildSystemPrompt({
      language: input.language,
      mode: input.robotMode,
      board: input.board,
      existingXml: input.existingXml,
      filteredBlocks,
    });

    const historyMessages = trimConversationForContext(input.messages);
    const retryPrefix = AI_SYSTEM_PROMPTS[input.language].blockGen.retryPrefix;
    let lastRaw = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      const finalUserContent = attempt < 3
        ? input.generateRequest
        : `${retryPrefix}\n\n${input.generateRequest}`;

      const messages: ApiMessage[] = [
        { role: 'system', content: systemPrompt },
        ...historyMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: finalUserContent },
      ];

      const { content } = await this.rawCall(messages);
      lastRaw = content;

      const result = validateBlocklyXml(lastRaw, allowedTypes);
      if (result.valid && result.sanitizedXml) {
        return { xml: result.sanitizedXml, rawResponse: lastRaw, attempts: attempt };
      }
    }

    throw new AiGenerationError('Failed to generate valid XML after 3 attempts', 3, lastRaw);
  }

  // generate() は互換維持のための薄いラッパー（S3 で AIAssistantPanel 移行時に削除、判断 16）
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    return this.generateFromConversation({
      messages: [],
      generateRequest: input.prompt,
      language: input.language,
      robotMode: input.mode,
      board: input.board,
      existingXml: input.existingXml,
    });
  }
}
