#!/usr/bin/env node
import { Command } from 'commander';
import { createConfigCommand } from './config/cli.js';
import { CredentialStore } from './config/credential-store.js';
import { ConfigStore } from './config/config-store.js';
import { AgentLoop, StepEvent } from './agent/loop.js';
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

function createRegistry(projectRoot: string): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(new ReadFileTool(projectRoot));
  registry.register(new WriteFileTool(projectRoot));
  registry.register(new ShellTool());
  registry.register(new RunTestTool());
  registry.register(new LintTool());
  registry.register(new GrepTool(projectRoot));
  return registry;
}

function onStep(event: StepEvent): void {
  logger.step(event.step, event.action, event.duration);
  if (event.feedback && !event.feedback.includes('PASSED')) {
    logger.warn(event.feedback);
  }
}

const program = new Command();
program.name('harness').description('Coding Agent Harness').version('0.1.0');
program.addCommand(createConfigCommand());

program.command('run <task...>').description('执行单次编码任务')
  .option('-m, --model <model>', 'LLM 模型')
  .option('-r, --root <path>', '项目根目录', process.cwd())
  .option('-s, --max-steps <number>', '最大步骤数', '30')
  .action(async (taskParts: string[], options) => {
    const task = taskParts.join(' ');
    const projectRoot = options.root;
    const store = new CredentialStore();
    const cfgStore = new ConfigStore();
    const apiKey = await store.getKey();
    if (!apiKey) { logger.error('未配置 API key，请先运行: harness config set-key'); process.exit(1); }
    const model = options.model ?? cfgStore.getModel();
    const endpoint = cfgStore.getEndpoint();
    const config: AgentConfig = { maxSteps: parseInt(options.maxSteps, 10), maxRetries: 3, projectRoot, model };
    const llm = new OpenAIProvider(apiKey, endpoint, model);
    const loop = new AgentLoop(config, llm, createRegistry(projectRoot), new Guardrail(projectRoot), new FeedbackLoop(), new Memory('You are a coding agent.', { maxMessages: 50 }), onStep);
    logger.convStart(0, task);
    logger.info(`模型: ${model}  |  API: ${endpoint}`);
    const result = await loop.run(task);
    logger.convEnd();
    if (result.state === 'completed') logger.success(`完成 (${result.steps} 步) — ${result.message}`);
    else if (result.state === 'need_approval') logger.warn(`需要审批 — ${result.message}`);
    else logger.error(`失败 (${result.steps} 步) — ${result.message}`);
  });

program.action(async () => {
  logger.banner();
  const store = new CredentialStore();
  const cfgStore = new ConfigStore();
  const apiKey = await store.getKey();
  if (!apiKey) {
    logger.error('未配置 API key');
    logger.info('请运行: harness config set-key');
    process.exit(1);
  }
  const model = cfgStore.getModel();
  const endpoint = cfgStore.getEndpoint();
  logger.info(`模型: ${model}  |  API: ${endpoint}`);
  logger.info('输入任务描述，输入 /exit 退出，Ctrl+C 停止当前任务');
  const projectRoot = process.cwd();
  const config: AgentConfig = { maxSteps: 30, maxRetries: 3, projectRoot, model };
  const llm = new OpenAIProvider(apiKey, endpoint, model);
  const loop = new AgentLoop(config, llm, createRegistry(projectRoot), new Guardrail(projectRoot), new FeedbackLoop(), new Memory('You are a coding agent.', { maxMessages: 50 }), onStep);
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'harness> ' });
  let convCount = 0;
  let runningTask: AbortController | null = null;
  rl.prompt();

  process.on('SIGINT', () => {
    if (runningTask) {
      logger.warn('\n中断信号 — 正在取消当前任务...');
      runningTask.abort();
      runningTask = null;
    } else {
      logger.info('\n再见！');
      rl.close();
    }
  });

  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    if (trimmed === '/exit' || trimmed === '/quit') { logger.info('再见！'); rl.close(); return; }
    if (!trimmed) { rl.prompt(); return; }
    convCount++;
    logger.convStart(convCount, trimmed);
    runningTask = new AbortController();
    const result = await loop.run(trimmed, runningTask.signal);
    runningTask = null;
    logger.convEnd();
    if (result.state === 'completed') logger.success(`完成 — ${result.message}`);
    else if (result.state === 'need_approval') logger.warn(`需要审批 — ${result.message}`);
    else logger.error(`失败 — ${result.message}`);
    rl.prompt();
  });
  rl.on('close', () => { process.exit(0); });
});

program.parse();