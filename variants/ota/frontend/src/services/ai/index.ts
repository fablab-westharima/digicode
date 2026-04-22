import type { RobotMode } from '@/stores/robotModeStore';
import type { BoardDefinition } from '@/stores/boardStore';
import type { AiLanguage } from '@/data/aiSystemPrompts';
import { OpenAICompatibleClient } from './openAICompatibleClient';
import { AnthropicClient } from './anthropicClient';

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'custom';
export type AiMode = 'blockGen' | 'helpBot';

// 会話履歴の 1 メッセージ（aiStore に persist しない、メモリのみ、判断 4）
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system-meta';
  content: string;
  timestamp: number;
  tokensUsed?: number;    // assistant のみ
  generatedXml?: string;  // system-meta のみ（.md 書き出し用、UI 非表示、判断 13）
}

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

export interface ChatInput {
  messages: Message[];        // 全会話履歴（system-meta 含む）、client 内部で trim
  mode: AiMode;               // 'blockGen' | 'helpBot'、システムプロンプト選択に使用
  language: AiLanguage;
  robotMode?: RobotMode;      // context 情報として AI に渡す
  board?: BoardDefinition;    // context 情報として AI に渡す
}

export interface ChatOutput {
  content: string;
  tokensUsed: number;
}

export interface GenerateFromConversationInput {
  messages: Message[];        // 会話履歴（system-meta 含む）、client 内部で trim
  generateRequest: string;    // 生成トリガーメッセージ（例: "上記の仕様で生成してください"）
  language: AiLanguage;
  robotMode: RobotMode;
  board: BoardDefinition;
  existingXml?: string;
}

export interface AIClient {
  generate(input: GenerateInput): Promise<GenerateOutput>;
  chat(input: ChatInput): Promise<ChatOutput>;
  generateFromConversation(input: GenerateFromConversationInput): Promise<GenerateOutput>;
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
