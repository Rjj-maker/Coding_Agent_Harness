# SPEC: Coding Agent Harness

> 项目类型：A · Coding Agent Harness
> 作者：饶嘉俊 (241880617)
> 日期：2026-08-13

---

## 1. 问题陈述

### 要解决的问题

LLM 本身只是一个"决定下一步做什么"的决策引擎，要将它变成一台稳定可靠的 Coding Agent，需要一套工程化的 harness 层：组织上下文、调用 LLM、解析动作、分发执行、安全治理、反馈闭环。现有的 agent 框架（LangChain、AutoGen 等）提供了高层抽象，但将核心循环、治理和反馈封装在黑盒中，无法独立验证每个机制的确定性行为。

### 目标用户

需要在软件开发中借助 AI 提升效率的开发者。他们希望 agent 能够：
- 理解自然语言任务描述并执行编码操作
- 在反馈信号（测试/lint）驱动下自动修正错误
- 在安全边界内运行，危险操作需要人工确认

### 为什么值得做

本项目将"Agent = LLM + Harness"这一命题落地为可验证的工程实现。核心机制（反馈闭环、治理护栏）必须用代码而非提示词实现，移除 LLM 后仍可用 mock 单测验证——这正是当前 agentic SE 方法论中最薄弱也最有价值的部分。

---

## 2. 用户故事

### US1: 单次任务执行
> 作为开发者，我可以输入一行自然语言描述的任务，agent 自动完成编码操作并报告结果。

**验收标准**：`harness run "在 src/utils.ts 中创建 add 函数"` 后，文件被创建，agent 输出完成报告。

### US2: 交互式 REPL
> 作为开发者，我可以进入交互式会话，连续给 agent 下达多个指令，agent 保持上下文记忆。

**验收标准**：进入 REPL 后连续输入两条相关指令，agent 能正确引用前一条指令的上下文。

### US3: 反馈驱动的自我修正
> 作为开发者，当我让 agent 编写代码后运行测试失败时，agent 能自动分析失败原因、修正代码、重新测试，直到通过或达到最大重试次数。

**验收标准**：注入一次测试失败，agent 收到反馈后修改代码，第二轮测试通过。

### US4: 危险动作拦截
> 作为开发者，当 agent 试图执行危险命令（如 `rm -rf`）时，系统应拦截并请求我确认，确认后才执行。

**验收标准**：agent 尝试执行 `rm -rf /` 时被拦截，终端提示人工确认；确认后执行（或拒绝后不执行）。

### US5: 安全凭据管理
> 作为开发者，我能安全地录入我的 API key，系统不将其以明文形式存储或泄露到日志/Git 中。

**验收标准**：`harness config set-key` 隐藏回显录入 key，`harness config status` 只显示已配置/未配置，不显示明文。key 不在源码、日志、Git 中出现。

### US6: 工具能力扩展
> 作为开发者，agent 能执行读文件、写文件、运行 shell 命令、运行测试、lint 检查和代码搜索等操作。

**验收标准**：每种工具在 mock LLM 驱动下均能正确分发执行并返回结果。

---

## 3. 功能规约

### 3.1 CLI 入口

| 项目 | 描述 |
|------|------|
| **输入** | `harness` 或 `harness run "<task>"` |
| **行为** | `harness` 进入交互式 REPL；`harness run <task>` 执行单次任务 |
| **输出** | agent 执行过程和结果输出到终端 |
| **边界条件** | 无 API key 时引导用户配置；非法命令提示帮助 |
| **错误处理** | 网络错误重试 3 次；LLM 返回不可解析的动作时提示错误并跳过 |

### 3.2 Agent 主循环

| 项目 | 描述 |
|------|------|
| **输入** | 用户任务描述 (string) |
| **行为** | 组织上下文 → 调用 LLM → 解析动作 → 分发执行 → 回灌结果 → 停机判断；循环至 max_steps 或 LLM 返回完成信号 |
| **输出** | 最终执行结果和步骤摘要 |
| **边界条件** | max_steps 默认 30，超限自动停机；发生错误时标记状态为 failed |
| **错误处理** | LLM 调用失败重试 3 次；工具执行失败将错误信息回灌给 LLM |

### 3.3 LLM 抽象层

| 项目 | 描述 |
|------|------|
| **输入** | messages: Message[], options: { model, temperature, maxTokens } |
| **行为** | 调用 OpenAI-compatible API，返回 LLM 响应 |
| **输出** | LLMResponse { content: string, usage: TokenUsage } |
| **边界条件** | 支持 mock LLM 替换（注入预设响应用于测试） |
| **错误处理** | 网络/认证错误抛出明确异常，由主循环处理重试 |

### 3.4 工具系统

| 工具 | 参数 | 行为 | 输出 |
|------|------|------|------|
| `read_file` | `path` | 读取文件内容 | 文件内容字符串 |
| `write_file` | `path, content` | 写入文件 | 成功/失败状态 |
| `shell` | `command` | 执行 shell 命令 | stdout + stderr + exitCode |
| `run_test` | `command` | 运行测试命令 | stdout + stderr + exitCode |
| `lint` | `path` | 对指定路径运行 lint | stdout + stderr + exitCode |
| `grep` | `pattern, path` | 搜索代码内容 | 匹配行列表 |

**边界条件**：文件路径限制在 projectRoot 内；写入前检查路径合法性；shell 命令经护栏检查后执行。

**错误处理**：文件不存在 → 返回错误信息；命令执行失败 → 返回 exitCode + stderr。

### 3.5 反馈闭环（主维度）

| 项目 | 描述 |
|------|------|
| **输入** | 工具执行结果（exitCode, stdout, stderr） |
| **行为** | 解析退出码和输出 → 判定通过/失败 → 失败时分类（语法错误/类型错误/断言失败/lint 违规/超时/未知）→ 生成结构化反馈摘要 → 注入回下一轮 agent 上下文 |
| **输出** | FeedbackResult { passed, category, summary, failures[] } |
| **边界条件** | 最多 3 轮自动修正；超时命令单独标记；输出过长时截断保留关键信息 |
| **错误处理** | 无法解析的输出标记为 unknown 类别，保留原始输出供 LLM 自行分析 |

**失败分类规则**：
- `syntax_error`: 输出包含 "SyntaxError" 或 "Unexpected token"
- `type_error`: 输出包含 "Type '" 或 "is not assignable"
- `assertion`: exitCode 非 0 且输出包含 "AssertionError" 或 "expected" / "received"
- `lint`: lint 工具返回非零 exitCode
- `timeout`: 命令执行超时（默认 60s）
- `unknown`: 以上均不匹配

### 3.6 治理护栏（最低实现）

| 项目 | 描述 |
|------|------|
| **输入** | 待执行的 Action |
| **行为** | 检查 action 类型和参数，匹配危险命令黑名单 / 越界路径 → 判定放行/拦截/需确认 |
| **输出** | GuardResult { allowed, reason?, needApproval? } |
| **边界条件** | 所有 shell 命令必须经过护栏；HITL 确认超时 30s 自动拒绝 |
| **错误处理** | 护栏自身异常 → 默认拦截（安全优先） |

**危险命令黑名单**（正则匹配）：
- `rm\s+(-rf?|--recursive)`
- `DROP\s+(TABLE|DATABASE)`
- `curl.*\|\s*(sh|bash)`
- `>\s*/dev/`
- 写入 `/etc/`、`/System/`、`~/.ssh/` 等系统路径

**安全路径白名单**：所有文件操作限定在 `projectRoot` 目录内。

### 3.7 记忆 / 上下文

| 项目 | 描述 |
|------|------|
| **输入** | 当前步骤的消息和结果 |
| **行为** | 维护当前会话的完整消息历史；将系统提示、工具列表、最近 N 轮对话、反馈结果组装为上下文。每轮对话 = 1 条 user 消息 + 1 条 assistant 消息，默认最多保留 50 条消息（包含系统消息），约 25 轮对话 |
| **输出** | 组装后的 messages 数组 |
| **边界条件** | 上下文超出限制时，保留系统提示 + 最近 50 条消息 |
| **错误处理** | 无 |

### 3.8 凭据管理

| 项目 | 描述 |
|------|------|
| **输入** | `harness config set-key` / `status` / `clear-key` |
| **行为** | set-key: 隐藏回显录入，存入 Windows Credential Manager；status: 显示已配置/未配置；clear-key: 从凭据管理器中删除 |
| **输出** | 操作结果提示 |
| **边界条件** | 首次运行无 key 时自动引导；支持 `.env` 备选来源（README 说明明文风险） |
| **错误处理** | 凭据管理器不可用时回退到加密文件（主密码保护） |

---

## 4. 非功能性需求

### 4.1 性能

- 单次 agent 循环（不含 LLM 调用）：< 100ms
- 反馈解析（不含测试运行）：< 500ms
- LLM 调用超时：60s

### 4.2 安全（含凭据威胁模型）

**威胁模型**：
- 攻击者获取源代码访问权 → 无凭据（key 不在源码中）
- 攻击者获取 Git 历史 → 无凭据（key 从未提交）
- 攻击者获取运行机器访问权 → 凭据在 Windows Credential Manager 中，需系统级权限才能读取
- 攻击者读取终端日志 → 无凭据（key 不写入日志，set-key 隐藏回显）
- `.env` 备选方式 → 明文风险在 README 中明确警告

**对策**：
- API key 存储于 Windows Credential Manager（`keytar` 库）
- 所有日志输出前过滤敏感信息
- `.env` 已加入 `.gitignore`
- 护栏拦截所有危险 shell 命令

### 4.3 可用性

- 首次运行自动引导配置 API key
- 所有命令提供 `--help` 说明
- 错误信息清晰可操作

### 4.4 可观测性

- 每次 agent 循环记录：步骤编号、耗时、工具调用、结果摘要
- 护栏拦截事件记录到独立日志
- 所有日志带时间戳

---

## 5. 系统架构

### 5.1 组件图

```
CLI (Commander.js)
  │
  ▼
Agent Loop ──▶ LLMProvider (OpenAI-compatible / Mock)
  │
  ├──▶ ToolRegistry
  │     ├── ReadFileTool
  │     ├── WriteFileTool
  │     ├── ShellTool
  │     ├── RunTestTool
  │     ├── LintTool
  │     └── GrepTool
  │
  ├──▶ Guardrail (危险命令/路径检查)
  │
  ├──▶ FeedbackLoop (结果解析 → 分类 → 回灌)
  │
  └──▶ Memory (会话历史 + 上下文组装)
```

### 5.2 数据流

```
1. 用户输入任务 → CLI 解析
2. CLI → Agent Loop: 初始化上下文（系统提示 + 工具列表 + 任务）
3. Agent Loop → LLMProvider: 发送上下文，获取响应
4. Agent Loop → 解析响应中的 Action
5. Agent Loop → Guardrail: 检查 Action 安全性
6. Guardrail 放行 → ToolRegistry: 分发执行
7. ToolResult → FeedbackLoop: 解析结果（如果是测试/lint）
8. FeedbackResult → Agent Loop: 注入下一轮上下文
9. 重复 3-8 直到停机条件满足
10. Agent Loop → CLI: 输出最终结果
```

### 5.3 外部依赖

- **LLM 供应商**：NJUSE Hub（DeepSeek V3），兼容 OpenAI API 格式
- **凭据存储**：Windows Credential Manager（keytar）
- **运行时**：Node.js 18+
- **npm 分发**：npm registry

---

## 6. 数据模型

### 6.1 核心实体

```typescript
// LLM 抽象层
interface LLMProvider {
  chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
}

interface MockLLMProvider extends LLMProvider {
  queueResponse(response: LLMResponse): void;
  getHistory(): Message[];
}

// Agent 状态
type AgentState = 'idle' | 'running' | 'need_approval' | 'completed' | 'failed';

interface AgentConfig {
  maxSteps: number;        // 最大步骤数 (默认 30)
  maxRetries: number;      // 最大修正次数 (默认 3)
  projectRoot: string;     // 项目根目录
  model: string;           // LLM 模型名
}

// 消息
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

// 动作
interface Action {
  type: string;            // 工具名
  params: Record<string, string>;
  id: string;
}

// 治理
type GuardResult = 
  | { allowed: true }
  | { allowed: false; reason: string; needApproval: boolean };

// 反馈
interface FailureDetail {
  line: number | null;
  message: string;
  file: string | null;
}

type FailureCategory = 
  'syntax_error' | 'type_error' | 'assertion' | 'lint' | 'timeout' | 'unknown';

interface FeedbackResult {
  passed: boolean;
  exitCode: number;
  summary: string;
  failures: FailureDetail[];
  category: FailureCategory;
}

// 工具
interface ToolResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
  execute(params: Record<string, string>): Promise<ToolResult>;
}

// 记忆
interface Memory {
  messages: Message[];
  systemPrompt: string;
  addMessage(msg: Message): void;
  buildContext(): Message[];
}
```

### 6.2 关系与约束

- 每个 `AgentConfig` 关联一个 `LLMProvider` 和一个 `ToolRegistry`
- `ToolRegistry` 包含 6 个 `Tool` 实例
- `Guardrail` 在 `ToolRegistry.execute()` 之前被调用
- `FeedbackLoop` 在 `ToolResult` 产生后、回灌到 `Memory` 前运行
- `Memory` 是 Agent Loop 的唯一上下文来源

---

## 7. 凭据与分发设计

### 7.1 凭据存储方案

- **主方案**：Windows Credential Manager，通过 `keytar` 库读写
- **备选方案**：若凭据管理器不可用，回退到 `.env` 文件（明文警告见 README）
- **录入流程**：`harness config set-key` → 隐藏回显输入 → 存储至凭据管理器
- **查看状态**：`harness config status` → 输出 "API key: 已配置" 或 "API key: 未配置"
- **更新/清除**：`harness config set-key` 覆盖旧值；`harness config clear-key` 删除
- **备选来源**：`.env` 文件中的 `API_KEY` 变量，README 明确警告明文风险

### 7.2 分发

**形态**：npm 包

- **安装**：`npm install -g @rjj-maker/coding-agent-harness`
- **运行**：`harness` 或 `harness run "任务描述"`
- **Key 配置**：首次运行自动引导 `harness config set-key`
- **已知限制**：
  - 平台：Windows / macOS / Linux（Node.js 18+）
  - 凭据存储：Windows 使用 Credential Manager，macOS 使用 Keychain，Linux 使用 libsecret
  - 文件操作限制在项目根目录内

---

## 8. 技术选型与理由

| 组件 | 选择 | 理由 |
|------|------|------|
| **语言** | TypeScript | 与 Superpowers/OpenCode 同栈；类型安全；npm 生态丰富 |
| **运行时** | Node.js 18+ | LTS 版本，稳定可靠 |
| **LLM SDK** | OpenAI SDK (`openai`) | 兼容 OpenAI API 格式，NJUSE Hub 直接支持 |
| **CLI 框架** | Commander.js | 轻量、成熟、支持子命令和交互式 REPL |
| **测试** | Vitest | 快速、TypeScript 原生支持、mock 方便 |
| **凭据存储** | keytar | 跨平台系统级凭据管理器 |
| **Lint** | ESLint | TypeScript 标准 |
| **分发** | npm | TypeScript 项目自然选择，一键安装 |

**LLM 供应商**：NJUSE Hub（DeepSeek V3），学生已有配置，API 兼容 OpenAI 格式。抽象层设计为 `LLMProvider` 接口，可替换为任意 OpenAI-compatible 供应商。

---

## 9. 领域与机制设计

### 9.1 Coding 领域的四类机制

| 机制 | 领域实现 | 编码方式 |
|------|----------|----------|
| **动作/工具** | 读文件、写文件、shell、测试、lint、grep | `Tool` 接口 + `ToolRegistry` 分发 |
| **客观反馈信号** | 测试/lint 的 exitCode + 输出 | `FeedbackLoop` 解析器（确定性代码） |
| **危险动作** | `rm -rf`、系统路径写入、curl pipe shell | `Guardrail` 黑名单匹配 + HITL 状态机 |
| **记忆** | 会话消息历史 + 上下文组装 | `Memory` 模块（消息数组 + 上下文窗口管理） |

### 9.2 重点维度：反馈闭环

**为什么选反馈闭环**：
- 逻辑简单直接（解析 exitCode → 分类 → 生成摘要 → 回灌），每一步都是确定性数据转换
- Mock 测试天然友好（只需 mock 命令执行结果即可测试整个流水线）
- 与 Coding 场景高度契合（反馈信号来源明确：exitCode 0 = 通过，非 0 = 失败）
- 深入空间充足（失败分类、多轮修正、上下文摘要、修正策略）

**编码实现方案**：
```typescript
class FeedbackLoop {
  parseResult(toolResult: ToolResult): FeedbackResult {
    // 1. 解析 exitCode: 0 = 通过, 非 0 = 失败
    // 2. 分类失败原因: 正则匹配 stdout/stderr
    // 3. 提取失败详情: 文件名、行号、错误信息
    // 4. 生成结构化摘要
  }
  
  generateFeedback(result: FeedbackResult): string {
    // 将 FeedbackResult 转为 LLM 可理解的文本
    // 长度限制，避免上下文膨胀
  }
}
```

### 9.3 治理护栏编码实现方案

```typescript
class Guardrail {
  private readonly DANGEROUS_PATTERNS = [
    /rm\s+(-rf?|--recursive)/i,
    /DROP\s+(TABLE|DATABASE)/i,
    /curl.*\|\s*(sh|bash)/i,
    />\s*\/dev\//i,
  ];

  check(action: Action): GuardResult {
    if (action.type !== 'shell') return { allowed: true };
    
    const command = action.params.command;
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return { allowed: false, reason: `危险命令: ${command}`, needApproval: true };
      }
    }
    
    // 路径越界检查
    if (this.isOutsideProjectRoot(command)) {
      return { allowed: false, reason: '操作超出项目目录', needApproval: true };
    }
    
    return { allowed: true };
  }
}
```

---

## 10. 验收标准

| 功能 | 验收标准 | 测试方式 |
|------|----------|----------|
| Agent 主循环 | mock LLM 下，给定 3 步预设响应，循环正确执行 3 步后停机 | 单元测试 |
| LLM 抽象层 | 注入 mock LLM，断言每步收到的消息与上下文正确 | 单元测试 |
| 工具分发 | 注册 6 个工具，mock LLM 返回各工具动作，断言正确分发 | 单元测试 |
| 治理护栏 | `guardrail.check(shell("rm -rf /"))` → 拦截；`guardrail.check(shell("npm test"))` → 放行 | 单元测试 |
| 反馈闭环 | 注入测试失败输出 → 解析为失败 → 分类正确 → 回灌到下一轮上下文 | 单元测试 |
| 凭据管理 | `set-key` → 存入；`status` → 显示已配置；`clear-key` → 清除 | 手动验证 |
| 记忆 | 3 轮对话后，上下文包含全量消息历史 | 单元测试 |
| 机制演示 | 3 个场景（护栏拦截、反馈修正、重点维度）可一键运行 | 脚本/测试 |

---

## 11. 风险与未决问题

1. **LLM 响应格式不稳定**：LLM 可能返回无法解析的动作格式，需要鲁棒的解析器 + 错误回退机制
2. **反馈分类准确性**：正则匹配可能误判，需要充足的测试用例覆盖各种错误输出格式
3. **跨平台凭据存储**：keytar 在不同平台表现可能不一致，需要备选方案
4. **上下文窗口管理**：长对话可能导致 token 超限，需要实现上下文截断策略
5. **npm 包发布**：需要 npm 账号和发布流程，CI 中需配置 npm token