# AGENT_LOG.md — Coding Agent Harness 实现记录

## 项目信息

- **项目名称**：Coding Agent Harness
- **仓库**：@rjj-maker/coding-agent-harness
- **分支**：feat/demo-docs
- **技术栈**：TypeScript + Node.js 18+ / Commander.js / OpenAI SDK / keytar / Vitest
- **测试框架**：Vitest（全部使用 mock LLM，无网络依赖）

---

## Task 1: 项目脚手架

- **Commit**：`04e90c2`
- **状态**：complete
- **文件**：`package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `src/index.ts`
- **说明**：创建 TypeScript + Vitest 项目骨架，配置 Commander.js、OpenAI SDK、keytar 依赖，添加构建和测试脚本。

---

## Task 2: 核心类型定义 + 记忆模块

- **Commit**：`ae9171c`
- **状态**：complete
- **文件**：`src/agent/types.ts`, `src/memory/memory.ts`, `tests/memory/memory.test.ts`
- **说明**：定义 Agent 核心类型（Message, Action, AgentConfig, ToolResult, GuardResult, FeedbackResult, LLMProvider 等），实现 Memory 类（消息管理 + 上下文组装 + 截断）。TDD：先写测试后实现。

---

## Task 3: LLM 抽象层（MockLLMProvider + OpenAIProvider）

- **Commit**：`ffbc386`
- **状态**：complete
- **文件**：`src/llm/provider.ts`, `src/llm/mock-provider.ts`, `src/llm/openai-provider.ts`, `tests/llm/mock-provider.test.ts`
- **说明**：MockLLMProvider 支持预设响应队列，可注入 LLM 响应进行确定性测试，记录所有消息历史以便验证。OpenAIProvider 封装 OpenAI SDK 兼容 NJUSE Hub。TDD：先写测试后实现。

---

## Task 4: 工具系统（接口 + 注册表 + 6 个工具）

- **Commit**：`19f5469`
- **状态**：complete
- **文件**：`src/tools/tool.ts`, `src/tools/registry.ts`, `src/tools/read-file.ts`, `src/tools/write-file.ts`, `src/tools/shell.ts`, `src/tools/run-test.ts`, `src/tools/lint.ts`, `src/tools/grep.ts`, `tests/tools/registry.test.ts`, `tests/tools/shell.test.ts`
- **说明**：Tool 接口 + ToolRegistry 工具注册与分发。实现 6 个工具：ReadFileTool、WriteFileTool、ShellTool、RunTestTool、LintTool、GrepTool。所有工具均限制在 projectRoot 内操作。TDD：先写测试后实现。

---

## Task 5: 治理护栏

- **Commit**：`91528db`
- **状态**：complete
- **文件**：`src/guardrail/guardrail.ts`, `tests/guardrail/guardrail.test.ts`
- **说明**：Guardrail 类支持危险命令黑名单（rm -rf、DROP TABLE、curl | sh 等）和路径越界检查，危险动作返回 needApproval 以触发 HITL。所有检测逻辑均为确定性代码，不依赖 LLM。TDD：先写测试后实现。

---

## Task 6: 反馈闭环（主维度）

- **Commit**：`facca10`
- **状态**：complete
- **文件**：`src/feedback/feedback-loop.ts`, `tests/feedback/feedback-loop.test.ts`
- **说明**：FeedbackLoop 支持解析测试/lint 结果、分类失败类型（syntax_error/type_error/assertion/lint/timeout/unknown）、提取失败详情（文件名/行号/错误信息）、生成 LLM 可读的反馈摘要。分类逻辑为正则匹配，不依赖 LLM。TDD：先写测试后实现。

---

## Task 7: Agent 主循环

- **Commit**：`167a9bc`
- **状态**：complete
- **文件**：`src/agent/loop.ts`, `tests/agent/loop.test.ts`
- **说明**：AgentLoop 负责组织上下文 → 调用 LLM → 解析动作 → 护栏检查 → 工具分发 → 反馈回灌 → 停机判断的完整循环。支持 max_steps 限制、危险动作拦截、失败反馈回灌与重试。TDD：先写测试后实现。

---

## Task 8: CLI 入口 + 凭据管理

- **Commit**：`ddf8432`
- **状态**：complete
- **文件**：`src/index.ts`, `src/config/cli.ts`, `src/config/credential-store.ts`, `src/utils/logger.ts`
- **说明**：提供 CLI 可执行程序入口（harness / harness run / harness config），交互式凭据管理（keytar 主方案 + .env 备选方案），API key 隐藏输入，状态查询与清除。TDD：先写测试后实现。

---

## Task 9: 机制演示

- **Commit**：`c788a09`
- **状态**：complete
- **文件**：`tests/demo/demo.test.ts`
- **说明**：3 个演示场景：① 护栏拦截危险动作 ② 反馈闭环驱动自我修正（注入失败后 agent 收到反馈并改变行为）③ 反馈闭环正确分类所有错误类型。所有测试均使用 mock LLM。

---

## Task 10: CI 配置 + README

- **Commit**：`4dc8739`
- **状态**：complete
- **文件**：`.github/workflows/ci.yml`, `README.md`
- **说明**：CI 包含 unit-test job（Node.js 18/20），每次 push 自动运行测试和构建。README 包含安装、使用、安全配置、命令说明和已知限制。

---

## Task 11: 补充 AGENT_LOG.md

- **Commit**：（见最新 commit）
- **状态**：complete
- **文件**：`AGENT_LOG.md`
- **说明**：补充 Task 1-11 的实际 commit hash 和实现信息。

---

## 测试汇总

- **测试文件数**：8
- **测试用例数**：36
- **测试框架**：Vitest
- **Mock 策略**：全部核心机制测试使用 MockLLMProvider，无网络依赖
- **测试命令**：`npm test`（一键运行全部 36 个测试）

## 构建

- **构建命令**：`npm run build`
- **构建输出**：`dist/`
- **TypeScript 配置**：严格模式，ESM 模块，target ES2022