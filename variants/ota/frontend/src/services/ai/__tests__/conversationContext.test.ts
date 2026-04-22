import { describe, it, expect } from 'vitest';
import { trimConversationForContext, MAX_CONVERSATION_TURNS } from '../conversationContext';
import type { Message } from '../index';

function makeMessage(role: Message['role'], id: string): Message {
  return { id, role, content: `content-${id}`, timestamp: Date.now() };
}

describe('trimConversationForContext', () => {
  it('filters out system-meta messages', () => {
    const messages: Message[] = [
      makeMessage('user', 'u1'),
      makeMessage('system-meta', 'sm1'),
      makeMessage('assistant', 'a1'),
    ];
    const result = trimConversationForContext(messages);
    expect(result).toHaveLength(2);
    expect(result.every(m => m.role !== 'system-meta')).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(trimConversationForContext([])).toEqual([]);
  });

  it('returns all user/assistant messages when under limit', () => {
    const messages: Message[] = [
      makeMessage('user', 'u1'),
      makeMessage('assistant', 'a1'),
      makeMessage('user', 'u2'),
      makeMessage('assistant', 'a2'),
    ];
    const result = trimConversationForContext(messages);
    expect(result).toHaveLength(4);
  });

  it(`keeps last ${MAX_CONVERSATION_TURNS * 2} messages when over limit`, () => {
    const messages: Message[] = [];
    for (let i = 0; i < 12; i++) {
      messages.push(makeMessage('user', `u${i}`));
      messages.push(makeMessage('assistant', `a${i}`));
    }
    const result = trimConversationForContext(messages);
    expect(result).toHaveLength(MAX_CONVERSATION_TURNS * 2);
    expect(result[0].id).toBe('u2');
    expect(result[result.length - 1].id).toBe('a11');
  });

  it('does not count system-meta when trimming', () => {
    const messages: Message[] = [
      makeMessage('user', 'u1'),
      makeMessage('assistant', 'a1'),
      makeMessage('system-meta', 'sm1'),
      makeMessage('user', 'u2'),
      makeMessage('assistant', 'a2'),
    ];
    const result = trimConversationForContext(messages);
    expect(result).toHaveLength(4);
    expect(result.find(m => m.id === 'sm1')).toBeUndefined();
  });

  it('returns empty array when all messages are system-meta', () => {
    const messages: Message[] = [
      makeMessage('system-meta', 'sm1'),
      makeMessage('system-meta', 'sm2'),
    ];
    expect(trimConversationForContext(messages)).toEqual([]);
  });
});
