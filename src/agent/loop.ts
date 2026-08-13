import { AgentConfig, AgentState, Action, Message, ToolResult } from './types.js';
import { LLMProvider } from '../llm/provider.js';
import { ToolRegistry } from '../tools/registry.js';
import { Guardrail } from '../guardrail/guardrail.js';
import { FeedbackLoop } from '../feedback/feedback-loop.js';
import { Memory } from '../memory/memory.js';

export interface RunResult {
  state: AgentState;
  steps: number;
  message: string;
}

export interface StepEvent {
  step: number;
  action: string;
  duration: number;
  toolResult?: string;
  feedback?: string;
}

export type StepCallback = (event: StepEvent) => void;

const SYSTEM_PROMPT = `You are a coding agent. You help developers by writing code, executing commands, and answering questions.

You MUST respond with a valid JSON object:

If you need to perform an action (read/write files, run commands, tests, lint, search):
{ "action": { "type": "<tool_name>", "params": { ... }, "id": "<unique_id>" } }

If you are done or just answering a question (no action needed), put your complete response in the message field:
{ "action": null, "message": "<your complete answer here>" }

Available tools: TOOL_LIST

When you receive feedback from a previous action, use it to correct your approach.`;

export class AgentLoop {
  private config: AgentConfig;
  private llm: LLMProvider;
  private tools: ToolRegistry;
  private guardrail: Guardrail;
  private feedback: FeedbackLoop;
  private memory: Memory;
  private state: AgentState = 'idle';
  private stepCount = 0;
  private retryCount = 0;
  private onStep: StepCallback | null;

  constructor(config: AgentConfig, llm: LLMProvider, tools: ToolRegistry, guardrail: Guardrail, feedback: FeedbackLoop, memory: Memory, onStep?: StepCallback) {
    this.config = config;
    this.llm = llm;
    this.tools = tools;
    this.guardrail = guardrail;
    this.feedback = feedback;
    this.memory = memory;
    this.onStep = onStep ?? null;
  }

  async run(task: string, signal?: AbortSignal): Promise<RunResult> {
    this.state = 'running';
    this.stepCount = 0;
    this.retryCount = 0;
    this.memory.addMessage({ role: 'user', content: task });

    while (this.state === 'running' && this.stepCount < this.config.maxSteps) {
      if (signal?.aborted) {
        this.state = 'failed';
        return { state: 'failed', steps: this.stepCount, message: '任务已取消' };
      }
      this.stepCount++;
      const startTime = Date.now();
      const context = this.memory.buildContext();
      const systemPrompt = SYSTEM_PROMPT.replace('TOOL_LIST', this.tools.getToolDescriptions());
      context[0] = { role: 'system', content: systemPrompt };

      let response;
      try {
        response = await this.llm.chat(context, { model: this.config.model });
      } catch (e) {
        this.state = 'failed';
        return { state: 'failed', steps: this.stepCount, message: `LLM error: ${e}` };
      }

      this.memory.addMessage({ role: 'assistant', content: response.content });
      const parsed = this.parseResponse(response.content);
      if (parsed === null) {
        this.state = 'completed';
        if (response.content && response.content.length > 0 && response.content !== 'Task completed.' && response.content !== 'Finished.') {
          return { state: 'completed', steps: this.stepCount, message: response.content };
        }
        return { state: 'completed', steps: this.stepCount, message: 'Task completed.' };
      }
      if (typeof parsed === 'string') {
        this.state = 'completed';
        return { state: 'completed', steps: this.stepCount, message: parsed };
      }

      const action: Action = parsed;
      const guardResult = this.guardrail.check(action);
      if (!guardResult.allowed) {
        this.state = guardResult.needApproval ? 'need_approval' : 'failed';
        return { state: this.state, steps: this.stepCount, message: guardResult.reason };
      }

      let toolResult: ToolResult;
      try {
        toolResult = await this.tools.execute(action);
      } catch (e) {
        toolResult = { success: false, stdout: '', stderr: String(e), exitCode: 1 };
      }

      const feedbackResult = this.feedback.process(toolResult);
      const feedbackText = this.feedback.generateFeedback(feedbackResult);
      this.memory.addMessage({ role: 'tool', content: `Tool: ${action.type}\nResult: ${toolResult.stdout || toolResult.stderr}\n${feedbackText}`, toolCallId: action.id });

      if (this.onStep) {
        this.onStep({
          step: this.stepCount,
          action: `${action.type}(${Object.values(action.params).join(', ')})`,
          duration: Date.now() - startTime,
          feedback: feedbackText,
        });
      }

      if (!feedbackResult.passed && this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        this.memory.addMessage({ role: 'user', content: `The previous action failed. Please fix the issue and try again.\n${feedbackText}` });
      }
    }

    if (this.stepCount >= this.config.maxSteps) {
      this.state = 'failed';
      return { state: 'failed', steps: this.stepCount, message: 'Max steps reached.' };
    }
    return { state: this.state, steps: this.stepCount, message: 'Finished.' };
  }

  private parseResponse(content: string): Action | string | null {
    try {
      const parsed = JSON.parse(content);
      if (parsed.action === null || parsed.action === undefined) return parsed.message ?? 'Task completed.';
      return parsed.action as Action;
    } catch {
      const match = content.match(/\{[\s\S]*"action"[\s\S]*\}/);
      if (match) {
        try { const parsed = JSON.parse(match[0]); return parsed.action as Action; } catch { return null; }
      }
      return null;
    }
  }
}