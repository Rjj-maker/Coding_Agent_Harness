import { LLMProvider, LLMResponse, LLMOptions, Message } from '../agent/types.js';

export class MockLLMProvider implements LLMProvider {
  private responseQueue: LLMResponse[] = [];
  private messageHistory: Message[][] = [];

  queueResponse(response: LLMResponse): void {
    this.responseQueue.push(response);
  }

  async chat(messages: Message[], _options?: LLMOptions): Promise<LLMResponse> {
    this.messageHistory.push([...messages]);
    const response = this.responseQueue.shift();
    if (!response) {
      throw new Error('No responses queued in MockLLMProvider');
    }
    return response;
  }

  getHistory(): Message[][] {
    return this.messageHistory;
  }

  reset(): void {
    this.responseQueue = [];
    this.messageHistory = [];
  }
}