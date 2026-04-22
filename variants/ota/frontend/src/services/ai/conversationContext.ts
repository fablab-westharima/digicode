import type { Message } from './index';

export const MAX_CONVERSATION_TURNS = 10;

// user/assistant のみ抽出し、末尾 20 件（= 10 往復）に丸める
// system-meta は UI 表示専用、AI コンテキストには含めない（判断 13 Q-E）
export function trimConversationForContext(messages: Message[]): Message[] {
  const chatOnly = messages.filter(m => m.role === 'user' || m.role === 'assistant');
  return chatOnly.slice(-MAX_CONVERSATION_TURNS * 2);
}
