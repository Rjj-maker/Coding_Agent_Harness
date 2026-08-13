import { describe, it, expect } from 'vitest';
import { MockLLMProvider } from '../../src/llm/mock-provider.js';

describe('MockLLMProvider', () => {
  it('should return queued responses in order', async () => {
    const mock = new MockLLMProvider();
    mock.queueResponse({ content: 'first response' });
    mock.queueResponse({ content: 'second response' });

    const r1 = await mock.chat([{ role: 'user', content: 'hello' }]);
    expect(r1.content).toBe('first response');

    const r2 = await mock.chat([{ role: 'user', content: 'world' }]);
    expect(r2.content).toBe('second response');
  });

  it('should record all messages sent to it', async () => {
    const mock = new MockLLMProvider();
    mock.queueResponse({ content: 'ok' });
    await mock.chat([{ role: 'user', content: 'test message' }]);

    const history = mock.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0][0].content).toBe('test message');
  });

  it('should throw when no responses queued', async () => {
    const mock = new MockLLMProvider();
    await expect(mock.chat([{ role: 'user', content: 'hi' }]))
      .rejects.toThrow('No responses queued');
  });
});