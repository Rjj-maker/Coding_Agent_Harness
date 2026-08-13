# Coding Agent Harness

AI-powered coding assistant harness with feedback loop and guardrails.

## 安装

npm install -g @rjj-maker/coding-agent-harness

## 使用

### 交互式 REPL

harness

### 单次任务

harness run "在 src/utils.ts 中创建 add 函数"

### 配置 API Key

harness config set-key    # 设置 API key（隐藏输入）
harness config status     # 查看配置状态
harness config clear-key  # 清除 API key

## 安全配置

- **主方案**：Windows Credential Manager / macOS Keychain / Linux libsecret
- **备选方案**：`.env` 文件中的 `API_KEY` 变量
- **警告**：`.env` 为明文存储，请勿提交到 Git

## 目录结构

src/ 源代码，tests/ 测试，详见 REPO。

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