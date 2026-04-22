import type { AIClient, AiConfig, GenerateInput, GenerateOutput } from './index';
import { buildSystemPrompt, fetchCatalog, filterCatalog, getAllowedTypes } from './systemPrompt';
import { validateBlocklyXml } from './xmlValidator';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import { AiGenerationError, ApiAuthError, RateLimitError, ApiServerError, NetworkError } from './errors';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-5';

export class AnthropicClient implements AIClient {
  private config: AiConfig;
  constructor(config: AiConfig) { this.config = config; }

  private async callOnce(systemPrompt: string, userPrompt: string): Promise<string> {
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
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.2,
          max_tokens: 4000,
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

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    const textBlock = data.content.find(c => c.type === 'text');
    return textBlock?.text ?? '';
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const catalog = await fetchCatalog();
    const filteredBlocks = filterCatalog(catalog, input.mode, input.board);
    const allowedTypes = getAllowedTypes(filteredBlocks);

    const systemPrompt = buildSystemPrompt({
      language: input.language,
      mode: input.mode,
      board: input.board,
      existingXml: input.existingXml,
      filteredBlocks,
    });

    const retryPrefix = AI_SYSTEM_PROMPTS[input.language].retryPrefix;
    let lastRaw = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      const userPrompt = attempt < 3
        ? input.prompt
        : `${retryPrefix}\n\n${input.prompt}`;

      lastRaw = await this.callOnce(systemPrompt, userPrompt);
      const result = validateBlocklyXml(lastRaw, allowedTypes);

      if (result.valid && result.sanitizedXml) {
        return { xml: result.sanitizedXml, rawResponse: lastRaw, attempts: attempt };
      }
    }

    throw new AiGenerationError('Failed to generate valid XML after 3 attempts', 3, lastRaw);
  }
}
