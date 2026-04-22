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
import { dryRunBlocklyXml } from './blocklyDryRun';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import { AiGenerationError, ApiAuthError, RateLimitError, ApiServerError, NetworkError } from './errors';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-5';

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
    const systemPrompt = input.mode === 'helpBot'
      ? buildHelpBotSystemPrompt({ language: input.language, mode: input.robotMode, board: input.board })
      : buildBlockGenConversationPrompt({ language: input.language, mode: input.robotMode, board: input.board });

    const messages: ApiMessage[] = trimmed.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    return this.rawCall(systemPrompt, messages, 2000);
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
    const { retryErrorPrefix } = AI_SYSTEM_PROMPTS[input.language].blockGen;
    let lastRaw = '';
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const finalUserContent = attempt > 1 && lastError
        ? `${retryErrorPrefix} ${lastError}\n\n${input.generateRequest}`
        : input.generateRequest;

      const messages: ApiMessage[] = [
        ...historyMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: finalUserContent },
      ];

      const { content } = await this.rawCall(systemPrompt, messages);
      lastRaw = content;

      const result = validateBlocklyXml(lastRaw, allowedTypes);
      if (!result.valid || !result.sanitizedXml) {
        lastError = result.errors[0] ?? 'XML 形式ではありませんでした';
        continue;
      }
      // 静的検証 OK → Blockly ランタイムで dry-run（接続構造の検証）
      const dryRun = dryRunBlocklyXml(result.sanitizedXml);
      if (!dryRun.valid) {
        lastError = `Blockly connection error: ${dryRun.error}. Value blocks (hasOutput=true) must not have <next>. Statement blocks (isStatement=true) must not be placed in <value> slots.`;
        continue;
      }
      return { xml: result.sanitizedXml, rawResponse: lastRaw, attempts: attempt };
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
