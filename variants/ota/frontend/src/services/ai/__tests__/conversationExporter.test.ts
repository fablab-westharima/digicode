import { describe, it, expect } from 'vitest';
import { exportConversationToMarkdown } from '../conversationExporter';
import type { Message } from '../index';

const baseTime = new Date('2026-04-22T06:30:00.000Z').getTime();

function makeMsg(role: Message['role'], content: string, extra: Partial<Message> = {}): Message {
  return { id: 'test', role, content, timestamp: baseTime, ...extra };
}

describe('exportConversationToMarkdown', () => {
  it('includes header with mode and provider', () => {
    const result = exportConversationToMarkdown([], { mode: 'blockGen', provider: 'openai', model: 'gpt-4o' });
    expect(result).toContain('# AI アシスタント会話記録');
    expect(result).toContain('**モード**: ブロック生成');
    expect(result).toContain('**プロバイダー**: openai (gpt-4o)');
  });

  it('formats user and assistant messages with matching turn numbers', () => {
    const messages: Message[] = [
      makeMsg('user', '最初の質問'),
      makeMsg('assistant', '最初の返答', { tokensUsed: 100 }),
      makeMsg('user', '次の質問'),
      makeMsg('assistant', '次の返答', { tokensUsed: 200 }),
    ];
    const result = exportConversationToMarkdown(messages, { mode: 'helpBot', provider: 'anthropic' });
    expect(result).toContain('## [1] User');
    expect(result).toContain('最初の質問');
    expect(result).toContain('## [1] Assistant');
    expect(result).toContain('100 tokens');
    expect(result).toContain('## [2] User');
    expect(result).toContain('## [2] Assistant');
    expect(result).toContain('200 tokens');
  });

  it('formats system-meta with generatedXml in xml code block', () => {
    const xml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
    const messages: Message[] = [
      makeMsg('system-meta', '12 ブロックを追加しました', { generatedXml: xml }),
    ];
    const result = exportConversationToMarkdown(messages, { mode: 'blockGen', provider: 'gemini' });
    expect(result).toContain('## ブロック生成結果');
    expect(result).toContain('12 ブロックを追加しました');
    expect(result).toContain('```xml');
    expect(result).toContain(xml);
    expect(result).toContain('```');
  });

  it('omits xml code block when system-meta has no generatedXml', () => {
    const messages: Message[] = [
      makeMsg('system-meta', 'メタメッセージのみ'),
    ];
    const result = exportConversationToMarkdown(messages, { mode: 'blockGen', provider: 'openai' });
    expect(result).toContain('メタメッセージのみ');
    expect(result).not.toContain('```xml');
  });

  it('uses provider name without parentheses when model is not provided', () => {
    const result = exportConversationToMarkdown([], { mode: 'helpBot', provider: 'custom' });
    expect(result).toContain('**プロバイダー**: custom');
    expect(result).not.toContain('custom (');
  });
});
