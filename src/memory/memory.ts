import { Message } from '../agent/types.js';

export interface MemoryOptions {
  maxMessages?: number;
}

export class Memory {
  private messages: Message[] = [];
  private systemPrompt: string;
  private maxMessages: number;

  constructor(systemPrompt: string, options: MemoryOptions = {}) {
    this.systemPrompt = systemPrompt;
    this.maxMessages = options.maxMessages ?? 50;
  }

  addMessage(msg: Message): void {
    this.messages.push(msg);
  }

  buildContext(): Message[] {
    const systemMsg: Message = { role: 'system', content: this.systemPrompt };
    let recent = this.messages;
    if (recent.length > this.maxMessages) {
      recent = recent.slice(-this.maxMessages);
    }
    return [systemMsg, ...recent];
  }

  getAllMessages(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }
}