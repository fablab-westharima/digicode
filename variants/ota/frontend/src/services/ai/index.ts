import type { RobotMode } from '@/stores/robotModeStore';
import type { BoardDefinition } from '@/stores/boardStore';
import type { AiLanguage } from '@/data/aiSystemPrompts';
import { OpenAICompatibleClient } from './openAICompatibleClient';
import { AnthropicClient } from './anthropicClient';

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'custom';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  customEndpoint?: string;
  model?: string;
}

export interface GenerateInput {
  prompt: string;
  mode: RobotMode;
  board: BoardDefinition;
  existingXml?: string;
  language: AiLanguage;
}

export interface GenerateOutput {
  xml: string;         // 検証済み Blockly XML
  rawResponse: string; // デバッグ用生応答
  attempts: number;    // retry 回数（1-3）
}

export interface AIClient {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

export function createAIClient(config: AiConfig): AIClient {
  if (config.provider === 'anthropic') {
    return new AnthropicClient(config);
  }
  return new OpenAICompatibleClient(config);
}

// エラークラスの再エクスポート（UI 層での catch に使用）
export {
  AiGenerationError,
  ApiAuthError,
  RateLimitError,
  ApiServerError,
  NetworkError,
} from './errors';
