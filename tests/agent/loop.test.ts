import { describe, it, expect } from 'vitest';
import { AgentLoop } from '../../src/agent/loop.js';
import { MockLLMProvider } from '../../src/llm/mock-provider.js';
import { ToolRegistry } from '../../src/tools/registry.js';
import { Guardrail } from '../../src/guardrail/guardrail.js';
import { FeedbackLoop } from '../../src/feedback/feedback-loop.js';
import { Memory } from '../../src/memory/memory.js';
import { AgentConfig } from '../../src/agent/types.js';
import { ReadFileTool } from '../../src/tools/read-file.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function createTestEnv() {
  const dir = join(tmpdir(), `harness-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'test.txt'), 'hello world');
  const config: AgentConfig = { maxSteps: 10, maxRetries: 3, projectRoot: dir, model: 'test-model' };
  const mockLLM = new MockLLMProvider();
  const registry = new ToolRegistry();
  registry.register(new ReadFileTool(dir));
  const guardrail = new Guardrail(dir);
  const feedback = new FeedbackLoop();
  const memory = new Memory('You are a coding agent.');
  return { dir, config, mockLLM, registry, guardrail, feedback, memory };
}

describe('AgentLoop', () => {
  it('should execute steps and stop when LLM returns stop signal', async () => {
    const { config, mockLLM, registry, guardrail, feedback, memory } = createTestEnv();
    const loop = new AgentLoop(config, mockLLM, registry, guardrail, feedback, memory);
    mockLLM.queueResponse({ content: JSON.stringify({ action: { type: 'read_file', params: { path: 'test.txt' }, id: '1' } }) });
    mockLLM.queueResponse({ content: JSON.stringify({ action: null, message: 'Task complete.' }) });
    const result = await loop.run('Read the test file');
    expect(result.state).toBe('completed');
    expect(result.steps).toBeGreaterThan(0);
  });

  it('should stop when max steps reached', async () => {
    const { config, mockLLM, registry, guardrail, feedback, memory } = createTestEnv();
    const smallConfig = { ...config, maxSteps: 2 };
    const loop = new AgentLoop(smallConfig, mockLLM, registry, guardrail, feedback, memory);
    for (let i = 0; i < 5; i++) { mockLLM.queueResponse({ content: JSON.stringify({ action: { type: 'read_file', params: { path: 'test.txt' }, id: `${i}` } }) }); }
    const result = await loop.run('Read file');
    expect(result.state).toBe('failed');
    expect(result.steps).toBe(2);
  });

  it('should halt on dangerous action', async () => {
    const { config, mockLLM, registry, guardrail, feedback, memory } = createTestEnv();
    const loop = new AgentLoop(config, mockLLM, registry, guardrail, feedback, memory);
    mockLLM.queueResponse({ content: JSON.stringify({ action: { type: 'shell', params: { command: 'rm -rf /' }, id: '1' } }) });
    const result = await loop.run('Delete everything');
    expect(result.state).toBe('need_approval');
    expect(result.steps).toBe(0);
  });
});