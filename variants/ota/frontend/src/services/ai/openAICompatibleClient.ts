import type { AIClient, AiConfig, GenerateInput, GenerateOutput } from './index';
import { buildSystemPrompt, fetchCatalog, filterCatalog, getAllowedTypes } from './systemPrompt';
import { validateBlocklyXml } from './xmlValidator';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import { AiGenerationError, ApiAuthError, RateLimitError, ApiServerError, NetworkError } from './errors';

const ENDPOINTS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  gemini:  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};

const DEFAULT_MODELS: Record<string, string> = {
  openai:  'gpt-4o',
  gemini:  'gemini-2.0-flash',
  custom:  'gpt-4o',
};

export class OpenAICompatibleClient implements AIClient {
  private config: AiConfig;
  constructor(config: AiConfig) { this.config = config; }

  private getEndpoint(): string {
    if (this.config.provider === 'custom' && this.config.customEndpoint) {
      return `${this.config.customEndpoint.replace(/\/+$/, '')}/chat/completions`;
    }
    return ENDPOINTS[this.config.provider] ?? ENDPOINTS.openai;
  }

  private async callOnce(systemPrompt: string, userPrompt: string): Promise<string> {
    const model = this.config.model ?? DEFAULT_MODELS[this.config.provider] ?? 'gpt-4o';

    let response: Response;
    try {
      response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt },
          ],
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

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? '';
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
      // attempt 3: retry prefix を prepend（系統プロンプト追加）
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
