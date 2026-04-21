import { describe, it, expect } from 'vitest';
import { createAIClient } from '../index';
import { OpenAICompatibleClient } from '../openAICompatibleClient';
import { AnthropicClient } from '../anthropicClient';

describe('createAIClient factory', () => {
  it('returns OpenAICompatibleClient for openai provider', () => {
    const client = createAIClient({ provider: 'openai', apiKey: 'test-key' });
    expect(client).toBeInstanceOf(OpenAICompatibleClient);
  });

  it('returns AnthropicClient for anthropic provider', () => {
    const client = createAIClient({ provider: 'anthropic', apiKey: 'test-key' });
    expect(client).toBeInstanceOf(AnthropicClient);
  });

  it('returns OpenAICompatibleClient for gemini provider', () => {
    const client = createAIClient({ provider: 'gemini', apiKey: 'test-key' });
    expect(client).toBeInstanceOf(OpenAICompatibleClient);
  });

  it('returns OpenAICompatibleClient for custom provider', () => {
    const client = createAIClient({ provider: 'custom', apiKey: 'test-key', customEndpoint: 'http://localhost:11434' });
    expect(client).toBeInstanceOf(OpenAICompatibleClient);
  });
});
