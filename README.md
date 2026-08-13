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
  ╔══════════════════════════════════╗
  ║   Coding Agent Harness v0.1.0   ║
  ╚══════════════════════════════════╝

模型: DeepSeek-V3  |  API: https://njusehub.info/v1
输入任务描述，输入 /exit 退出，Ctrl+C 停止当前任务
──────────────────────────────────────────────────
harness> 创建一个 utils.ts 文件，导出 add 和 multiply 函数
──────────────────────────────────────────────────
[09:30:01] ▶ Step 1 | write_file(utils.ts, export function add...) (1234ms)
[09:30:03] ▶ Step 2 | run_test(npx vitest run) (2156ms)
[09:30:03] ⚠ [Feedback] FAILED (assertion)
──────────────────────────────────────────────────
✓ 完成 — 任务完成

harness> /exit
```

### 单次任务

```bash
node dist/index.js run "在 src/utils.ts 中创建 add 函数"
node dist/index.js run "修复所有 TypeScript 类型错误" --model DeepSeek-V3
node dist/index.js run "运行测试并修复失败用例" --max-steps 50
```

### 配置

```bash
harness config set-key              # 设置 API key（隐藏输入）
harness config set-model <模型名>    # 设置默认模型（如 DeepSeek-V3）
harness config set-endpoint <URL>   # 设置 API 地址
harness config status               # 查看完整配置
harness config clear-key            # 清除 API key
```

**API Key**：完整的密钥字符串，从你的 LLM 供应商获取（如 NJUSE Hub 控制台）。

**默认配置**：
- API 地址：`https://njusehub.info/v1`
- 默认模型：`DeepSeek-V3`
- 模型和地址存储在 `~/.harness/config.json`，API key 存储在系统凭据管理器

**环境变量**（优先级高于配置文件）：
- `LLM_BASE_URL`：覆盖 API 地址

**命令行参数**（优先级高于环境变量和配置文件）：
- `harness run "任务" --model gpt-4o`：覆盖模型

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
│       └── logger.ts           # 日志工具
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