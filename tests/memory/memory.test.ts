import { describe, it, expect } from 'vitest';
import { Memory } from '../../src/memory/memory.js';
import { Message } from '../../src/agent/types.js';

describe('Memory', () => {
  it('should start with empty messages', () => {
    const memory = new Memory('You are a coding assistant.');
    const ctx = memory.buildContext();
    expect(ctx).toHaveLength(1);
    expect(ctx[0].role).toBe('system');
  });

  it('should add messages and return them in context', () => {
    const memory = new Memory('You are a coding assistant.');
    memory.addMessage({ role: 'user', content: 'Hello' });
    memory.addMessage({ role: 'assistant', content: 'Hi there' });
    const ctx = memory.buildContext();
    expect(ctx).toHaveLength(3);
    expect(ctx[1].role).toBe('user');
    expect(ctx[2].role).toBe('assistant');
  });

  it('should trim context to last N messages when exceeding limit', () => {
    const memory = new Memory('System prompt', { maxMessages: 4 });
    for (let i = 0; i < 10; i++) {
      memory.addMessage({ role: 'user', content: `msg ${i}` });
    }
    const ctx = memory.buildContext();
    expect(ctx.length).toBeLessThanOrEqual(5);
    expect(ctx[0].role).toBe('system');
    expect(ctx[1].content).toBe('msg 6');
  });
});