# Coding Agent Harness

AI-powered coding assistant harness with feedback loop and guardrails.

## 项目简介

Coding Agent Harness 是一个 TypeScript 实现的编码智能体内核，核心机制均由确定性的代码实现（非提示词），可在 mock LLM 下用单元测试独立验证。包含 6 个工具、危险命令护栏、反馈闭环和凭据安全管理，通过 npm 分发。

## 安装

```bash
git clone https://github.com/Rjj-maker/Coding_Agent_Harness.git
cd Coding_Agent_Harness
npm install
npm run build
```

## 快速上手

```bash
# 1. 配置 API key
node dist/index.js config set-key
# 输入你的 NJUSE Hub API key（sk-xxx...）

# 2. 设置模型（可选，默认 DeepSeek-V3）
node dist/index.js config set-model DeepSeek-V3

# 3. 查看配置
node dist/index.js config status
# API key: 已配置
# API 地址: https://njusehub.info/v1
# 模型: DeepSeek-V3

# 4. 单次任务
node dist/index.js run "在 src 目录下创建一个 hello.ts 文件，输出 Hello World"

# 5. 交互式 REPL（Ctrl+C 停止当前任务，/exit 退出）
node dist/index.js
```

## 使用

### 交互式 REPL

```bash
node dist/index.js
```

```
  ╔══════════════════════════════════════╗
  ║     Coding Agent Harness v0.1.0     ║
  ╚══════════════════════════════════════╝

模型: DeepSeek-V3  |  API: https://njusehub.info/v1
输入任务描述，输入 /exit 退出，Ctrl+C 停止当前任务

harness> 创建一个 utils.ts 文件，导出 add 和 multiply 函数

◆ 对话 #1: 创建一个 utils.ts 文件，导出 add 和 multiply 函数
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[09:30:01] ▶ Step 1 | write_file(utils.ts, export function add...) (1234ms)
[09:30:03] ▶ Step 2 | run_test(npx vitest run) (2156ms)
[09:30:05] ⚠ [Feedback] FAILED (assertion)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 完成 — 测试通过

harness> 添加一个 subtract 函数
```

### 单次任务

```bash
node dist/index.js run "在 src/utils.ts 中创建 add 函数"
node dist/index.js run "修复所有 TypeScript 类型错误" --model DeepSeek-V3
node dist/index.js run "运行测试并修复失败用例" --max-steps 50
```

### 配置

```bash
# 设置 API key（隐藏输入）
node dist/index.js config set-key

# 设置默认模型
node dist/index.js config set-model DeepSeek-V3

# 设置 API 地址（注意：PowerShell 中 URL 必须加引号）
node dist/index.js config set-endpoint "https://api.deepseek.com"

# 查看完整配置
node dist/index.js config status

# 清除 API key
node dist/index.js config clear-key
```

**切换 API 提供商示例**：

```bash
# DeepSeek 官方
node dist/index.js config set-endpoint "https://api.deepseek.com"
node dist/index.js config set-model deepseek-chat

# OpenAI
node dist/index.js config set-endpoint "https://api.openai.com/v1"
node dist/index.js config set-model gpt-4o

# NJUSE Hub（默认）
node dist/index.js config set-endpoint "https://njusehub.info/v1"
node dist/index.js config set-model DeepSeek-V3
```

> **注意**：Windows PowerShell 中 URL 必须用双引号包裹，否则 `<` 和 `>` 会被解析为重定向符号。macOS / Linux 终端可省略引号。

**API Key**：完整的密钥字符串，从你的 LLM 供应商获取（如 NJUSE Hub 控制台）。

**默认配置**：
- API 地址：`https://njusehub.info/v1`
- 默认模型：`DeepSeek-V3`
- 模型和地址存储在 `~/.harness/config.json`，API key 存储在系统凭据管理器

**环境变量**（优先级高于配置文件）：
- `LLM_BASE_URL`：覆盖 API 地址

**命令行参数**（优先级高于环境变量和配置文件）：
- `node dist/index.js run "任务" --model gpt-4o`：覆盖模型

## 测试

### Mock LLM 确定性测试

所有 harness 核心机制的单元测试均使用 `MockLLMProvider`（`src/llm/mock-provider.ts`），通过 `queueResponse()` 注入预设响应，**不依赖网络与真实 LLM**，在任意环境下可重复运行。

```bash
npm test
```

### 测试覆盖

| 模块 | 测试文件 | 测试内容 |
|------|----------|----------|
| Agent 主循环 | `tests/agent/loop.test.ts` | 正常执行、maxSteps 超限停机、危险动作拦截 |
| 治理护栏 | `tests/guardrail/guardrail.test.ts` | `rm -rf`、`DROP TABLE`、`curl \| sh`、越界路径拦截、安全命令放行 |
| 反馈闭环 | `tests/feedback/feedback-loop.test.ts` | 语法错误/类型错误/断言失败/lint/超时分类、反馈文本生成、通过检测 |
| 记忆模块 | `tests/memory/memory.test.ts` | 消息存储、上下文组装、窗口限制 |
| 工具系统 | `tests/tools/registry.test.ts`<br>`tests/tools/shell.test.ts` | 工具注册与分发、Shell 命令执行 |
| LLM 抽象层 | `tests/llm/mock-provider.test.ts` | MockLLM 响应队列、历史记录 |

### 机制演示（`tests/demo/demo.test.ts`）

一键运行 3 个场景，在 Mock LLM 下确定性地复现 harness 核心行为：

| 场景 | 描述 | 复现行为 |
|------|------|----------|
| **Demo 1：护栏拦截** | Guardrail 拦截危险动作 | MockLLM 返回 `rm -rf /` / `DROP TABLE` 等动作，Guardrail 检测并拦截，Agent 状态转为 `need_approval` |
| **Demo 2：反馈修正** | 反馈闭环驱动自我修正 | MockLLM 先尝试读取不存在的文件（失败）→ FeedbackLoop 注入失败反馈 → MockLLM 改为读取存在的文件（成功）→ 断言第二轮 LLM 调用上下文中包含失败反馈 |
| **Demo 3：错误分类** | 反馈闭环错误分类 | 验证 FeedbackLoop 对 syntax_error / type_error / assertion / lint / timeout 五类错误的分类准确性 |

### Harness 内核自实现

全部核心机制由确定性代码实现，零外部 agent 框架依赖：

- **主循环**：`src/agent/loop.ts` — 上下文组装 → LLM 调用 → JSON 解析 → 动作分发 → 反馈回灌 → 循环直至停机
- **工具分发**：`src/tools/registry.ts` — 注册 6 个工具，按 action.type 路由到对应 tool.execute()
- **治理护栏**：`src/guardrail/guardrail.ts` — 正则黑名单匹配 + 路径越界检查，HITL 确认流
- **反馈闭环**：`src/feedback/feedback-loop.ts` — exitCode 解析 → 6 类错误分类 → 结构化摘要 → 回灌 LLM 上下文

## 安全配置

- **主方案**：Windows Credential Manager / macOS Keychain / Linux libsecret
- **备选方案**：`.env` 文件中的 `API_KEY` 变量
- **警告**：`.env` 为明文存储，请勿提交到 Git

## 目录结构

```
├── .github/workflows/ci.yml    # CI 配置（unit-test job）
├── src/
│   ├── index.ts                # CLI 入口（REPL + run 双模式）
│   ├── agent/
│   │   ├── types.ts            # 核心类型定义（Message, Action, AgentConfig 等）
│   │   └── loop.ts             # Agent 主循环
│   ├── config/
│   │   ├── cli.ts              # config 子命令（set-key/status/clear-key）
│   │   └── credential-store.ts # 凭据管理（keytar + .env 备选）
│   ├── llm/
│   │   ├── provider.ts         # LLMProvider 接口
│   │   ├── openai-provider.ts  # OpenAI 兼容实现
│   │   └── mock-provider.ts    # Mock LLM（测试用）
│   ├── tools/
│   │   ├── tool.ts             # Tool 接口
│   │   ├── registry.ts         # ToolRegistry 工具注册与分发
│   │   ├── read-file.ts        # 读文件
│   │   ├── write-file.ts       # 写文件
│   │   ├── shell.ts            # 执行 Shell 命令
│   │   ├── run-test.ts         # 运行测试
│   │   ├── lint.ts             # 运行 Lint
│   │   └── grep.ts             # 搜索代码
│   ├── guardrail/
│   │   └── guardrail.ts        # 治理护栏（危险命令拦截）
│   ├── feedback/
│   │   └── feedback-loop.ts    # 反馈闭环（主维度）
│   ├── memory/
│   │   └── memory.ts           # 记忆模块（会话历史 + 上下文）
│   └── utils/
│       ├── logger.ts           # 日志工具
│       └── markdown.ts         # Markdown→ANSI 终端渲染器
├── tests/
│   ├── agent/loop.test.ts
│   ├── demo/demo.test.ts       # 机制演示（3 个场景）
│   ├── feedback/feedback-loop.test.ts
│   ├── guardrail/guardrail.test.ts
│   ├── llm/mock-provider.test.ts
│   ├── memory/memory.test.ts
│   └── tools/
│       ├── registry.test.ts
│       └── shell.test.ts
├── SPEC.md                     # 设计文档
├── PLAN.md                     # 实现计划
├── SPEC_PROCESS.md             # 规约生成过程
├── AGENT_LOG.md                # 实现日志
└── README.md
```

## 安全边界

- **凭据存储**：API key 通过 keytar 存入操作系统级凭据管理器（Windows Credential Manager / macOS Keychain / Linux libsecret），绝不写入源码、Git 历史或日志
- **文件操作**：所有文件读写限制在项目根目录（projectRoot）内，无法越界访问系统文件
- **危险命令拦截**：`rm -rf`、`DROP TABLE`、`curl | sh` 等危险 Shell 命令在护栏层被拦截，需人工确认
- **无凭据泄露**：仓库中不存在任何真实 API key 或凭据

## 命令

npm install / npm test / npm run build / npm run lint

## 已知限制

- 平台：Windows / macOS / Linux（Node.js >= 18）
- 文件操作限制在项目根目录内
- Agent 最多 30 步，反馈修正最多 3 轮

## 技术栈

TypeScript + Node.js 18+ / Commander.js / OpenAI SDK / keytar / Vitest

## License

MIT