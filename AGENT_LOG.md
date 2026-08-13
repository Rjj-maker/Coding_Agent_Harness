# AGENT_LOG.md — Coding Agent Harness 实现记录

## 项目信息

- **项目名称**：Coding Agent Harness
- **仓库**：@rjj-maker/coding-agent-harness
- **技术栈**：TypeScript + Node.js 18+ / Commander.js / OpenAI SDK / keytar / Vitest
- **测试框架**：Vitest（全部使用 mock LLM，无网络依赖）
- **主开发智能体**：OpenCode (DeepSeek V4 Pro)
- **冷启动验证智能体**：Claude Code

---

## 2026-08-13

### Task 1: 项目脚手架

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development (implementer: general subagent)
- **Prompt 配置**：读取 task-1-brief.md，严格按步骤执行
- **Commit**：`04e90c2`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `src/index.ts`
- **测试结果**：npm test → No test files found（正常，Task 2 后即绿）；npm run build → 通过
- **人工干预**：无
- **教训**：冷启动验证发现 eslint.config.mjs 内容缺失和 npm test 预期不符，已在 PLAN 中补全

---

### Task 2: 核心类型定义 + 记忆模块

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development (implementer: general subagent) + TDD
- **Prompt 配置**：读取 task-2-brief.md，严格 TDD 流程
- **Commit**：`ae9171c`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`src/agent/types.ts`, `src/memory/memory.ts`, `tests/memory/memory.test.ts`
- **测试结果**：🔴 红色 → 🟢 绿色（3/3 通过）
- **人工干预**：无
- **教训**：TDD 流程顺利，类型定义先于实现，测试覆盖了边界条件（截断）

---

### Task 3: LLM 抽象层（MockLLMProvider + OpenAIProvider）

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development + TDD
- **Prompt 配置**：读取 task-3-brief.md，严格 TDD
- **Commit**：`ffbc386`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`src/llm/provider.ts`, `src/llm/mock-provider.ts`, `src/llm/openai-provider.ts`, `tests/llm/mock-provider.test.ts`
- **测试结果**：🔴 红色 → 🟢 绿色（3/3 通过），全量 6/6 通过
- **人工干预**：无
- **教训**：MockLLMProvider 的 queueResponse + getHistory 设计使测试可以精确验证 LLM 调用上下文

---

### Task 4: 工具系统（接口 + 注册表 + 6 个工具）

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development + TDD
- **Prompt 配置**：读取 task-4-brief.md，先写 registry.test.ts + shell.test.ts
- **Commit**：`19f5469`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：10 个文件（6 个工具 + 注册表 + 接口 + 2 个测试）
- **测试结果**：🔴 红色 → 🟢 绿色（4/4 通过），全量 10/10 通过
- **人工干预**：无
- **教训**：工具接口设计为 Tool 接口，每个工具可独立测试。shell 测试使用真实 echo 命令验证

---

### Task 5: 治理护栏

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development + TDD
- **Prompt 配置**：读取 task-5-brief.md，严格 TDD
- **Commit**：`91528db`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`src/guardrail/guardrail.ts`, `tests/guardrail/guardrail.test.ts`
- **测试结果**：🔴 红色 → 🟢 绿色（6/6 通过），全量 16/16 通过
- **人工干预**：无
- **教训**：Guardrail 是纯确定性代码，完全不需要 LLM 参与测试。6 个测试覆盖了所有危险模式

---

### Task 6: 反馈闭环（主维度）

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development + TDD
- **Prompt 配置**：读取 task-6-brief.md，严格 TDD，覆盖所有 6 种错误分类
- **Commit**：`facca10`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`src/feedback/feedback-loop.ts`, `tests/feedback/feedback-loop.test.ts`
- **测试结果**：🔴 红色 → 🟢 绿色（8/8 通过），全量 24/24 通过
- **人工干预**：无
- **教训**：正则分类逻辑需要精心设计优先级（timeout 优先于 syntax_error），否则可能误判。测试覆盖了所有 6 种分类

---

### Task 7: Agent 主循环

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development + TDD
- **Prompt 配置**：读取 task-7-brief.md，mock LLM 驱动下 3 个测试
- **Commit**：`167a9bc`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`src/agent/loop.ts`, `tests/agent/loop.test.ts`
- **测试结果**：🔴 红色 → 🟢 绿色（3/3 通过），全量 27/27 通过
- **人工干预**：无
- **教训**：AgentLoop 的循环逻辑（上下文→LLM→动作→护栏→执行→反馈→回灌）通过 mock LLM 的预设响应队列可精确模拟每一步

---

### Task 8: CLI 入口 + 凭据管理

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development
- **Prompt 配置**：读取 task-8-brief.md，按顺序创建文件
- **Commit**：`ddf8432`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`src/index.ts`, `src/config/cli.ts`, `src/config/credential-store.ts`, `src/utils/logger.ts`
- **测试结果**：全量 27/27 通过，npm run build 通过
- **人工干预**：无
- **教训**：keytar 是原生模块，跨平台兼容性需注意。.env 备选方案是合理的 tradeoff

---

### Task 9: 机制演示

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development
- **Prompt 配置**：读取 task-9-10-11-brief.md
- **Commit**：`c788a09`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`tests/demo/demo.test.ts`
- **测试结果**：全量 36/36 通过
- **人工干预**：无
- **教训**：3 个演示场景全部使用 mock LLM，不依赖网络，可作为验收测试

---

### Task 10: CI 配置 + README

- **时间戳**：2026-08-13
- **技能**：subagent-driven-development
- **Commit**：`4dc8739`
- **Subagent**：general (DeepSeek V4 Pro)
- **文件**：`.github/workflows/ci.yml`, `README.md`
- **人工干预**：无

---

### Task 11: 补充 AGENT_LOG.md

- **时间戳**：2026-08-13
- **Commit**：`ab43b23`
- **人工干预**：后续在评审阶段补充了时间戳、技能名、prompt 配置、人工干预和教训

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