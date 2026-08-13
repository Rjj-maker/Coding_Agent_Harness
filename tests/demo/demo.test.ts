import { describe, it, expect } from 'vitest';
import { Guardrail } from '../../src/guardrail/guardrail.js';
import { FeedbackLoop } from '../../src/feedback/feedback-loop.js';
import { MockLLMProvider } from '../../src/llm/mock-provider.js';
import { AgentLoop } from '../../src/agent/loop.js';
import { ToolRegistry } from '../../src/tools/registry.js';
import { Memory } from '../../src/memory/memory.js';
import { AgentConfig } from '../../src/agent/types.js';
import { ReadFileTool } from '../../src/tools/read-file.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function createTestDir() {
  const dir = join(tmpdir(), `harness-demo-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'test.txt'), 'hello world');
  return dir;
}

describe('Mechanism Demo', () => {
  describe('Demo 1: Guardrail intercepts dangerous action', () => {
    it('should block rm -rf', () => {
      const guardrail = new Guardrail('/project');
      const result = guardrail.check({ type: 'shell', params: { command: 'rm -rf / --no-preserve-root' }, id: '1' });
      expect(result.allowed).toBe(false);
      if (!result.allowed) { expect(result.needApproval).toBe(true); expect(result.reason).toBeTruthy(); }
    });
    it('should block DROP TABLE', () => {
      const result = new Guardrail('/project').check({ type: 'shell', params: { command: 'mysql -e "DROP TABLE users"' }, id: '1' });
      expect(result.allowed).toBe(false);
    });
    it('should allow safe commands', () => {
      const result = new Guardrail('/project').check({ type: 'shell', params: { command: 'npm test' }, id: '1' });
      expect(result.allowed).toBe(true);
    });
  });

  describe('Demo 2: Feedback loop drives self-correction', () => {
    it('should detect failure and inject feedback into next context', async () => {
      const dir = createTestDir();
      const config: AgentConfig = { maxSteps: 5, maxRetries: 3, projectRoot: dir, model: 'test' };
      const mockLLM = new MockLLMProvider();
      const registry = new ToolRegistry();
      registry.register(new ReadFileTool(dir));
      const loop = new AgentLoop(config, mockLLM, registry, new Guardrail(dir), new FeedbackLoop(), new Memory('You are a coding agent.'));
      mockLLM.queueResponse({ content: JSON.stringify({ action: { type: 'read_file', params: { path: 'nonexistent.txt' }, id: '1' } }) });
      mockLLM.queueResponse({ content: JSON.stringify({ action: { type: 'read_file', params: { path: 'test.txt' }, id: '2' } }) });
      mockLLM.queueResponse({ content: JSON.stringify({ action: null, message: 'Done.' }) });
      const result = await loop.run('Read files');
      expect(result.state).toBe('completed');
      const history = mockLLM.getHistory();
      const secondCallMessages = history[1];
      const hasFeedback = secondCallMessages.some((m) => m.role === 'user' && m.content.includes('failed'));
      expect(hasFeedback).toBe(true);
    });
  });

  describe('Demo 3: Feedback loop correctly classifies all error types', () => {
    const feedback = new FeedbackLoop();
    it('syntax_error', () => { expect(feedback.process({ success: false, stdout: '', stderr: 'SyntaxError: Unexpected token }', exitCode: 1 }).category).toBe('syntax_error'); });
    it('type_error', () => { expect(feedback.process({ success: false, stdout: '', stderr: "error TS2322: Type 'string' is not assignable", exitCode: 2 }).category).toBe('type_error'); });
    it('assertion', () => { expect(feedback.process({ success: false, stdout: '', stderr: 'AssertionError: expected 1 to equal 2', exitCode: 1 }).category).toBe('assertion'); });
    it('lint', () => { expect(feedback.process({ success: false, stdout: '5 problems (3 errors, 2 warnings)', stderr: '', exitCode: 1 }).category).toBe('lint'); });
    it('timeout', () => { expect(feedback.process({ success: false, stdout: '', stderr: 'ETIMEDOUT: operation timed out', exitCode: 124 }).category).toBe('timeout'); });
  });
});