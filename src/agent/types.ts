export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export type AgentState = 'idle' | 'running' | 'need_approval' | 'completed' | 'failed';

export interface AgentConfig {
  maxSteps: number;
  maxRetries: number;
  projectRoot: string;
  model: string;
}

export interface Action {
  type: string;
  params: Record<string, string>;
  id: string;
}

export interface ToolResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type GuardResult =
  | { allowed: true }
  | { allowed: false; reason: string; needApproval: boolean };

export interface FailureDetail {
  line: number | null;
  message: string;
  file: string | null;
}

export type FailureCategory =
  | 'syntax_error'
  | 'type_error'
  | 'assertion'
  | 'lint'
  | 'timeout'
  | 'unknown';

export interface FeedbackResult {
  passed: boolean;
  exitCode: number;
  summary: string;
  failures: FailureDetail[];
  category: FailureCategory;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage?: TokenUsage;
}

export interface LLMProvider {
  chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
}