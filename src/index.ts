#!/usr/bin/env node
import { Command } from 'commander';
import { createConfigCommand } from './config/cli.js';
import { CredentialStore } from './config/credential-store.js';
import { AgentLoop } from './agent/loop.js';
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
program.name('harness').description('Coding Agent Harness').version('0.1.0');
program.addCommand(createConfigCommand());

program.command('run <task...>').description('执行单次编码任务')
  .option('-m, --model <model>', 'LLM 模型', 'deepseek-v3')
  .option('-r, --root <path>', '项目根目录', process.cwd())
  .option('-s, --max-steps <number>', '最大步骤数', '30')
  .action(async (taskParts: string[], options) => {
    const task = taskParts.join(' ');
    const projectRoot = options.root;
    const store = new CredentialStore();
    const apiKey = await store.getKey();
    if (!apiKey) { logger.error('未配置 API key，请先运行: harness config set-key'); process.exit(1); }
    const config: AgentConfig = { maxSteps: parseInt(options.maxSteps, 10), maxRetries: 3, projectRoot, model: options.model };
    const llm = new OpenAIProvider(apiKey, process.env.LLM_BASE_URL ?? 'https://njusehub.info/v1', options.model);
    const registry = new ToolRegistry();
    registry.register(new ReadFileTool(projectRoot));
    registry.register(new WriteFileTool(projectRoot));
    registry.register(new ShellTool());
    registry.register(new RunTestTool());
    registry.register(new LintTool());
    registry.register(new GrepTool(projectRoot));
    const loop = new AgentLoop(config, llm, registry, new Guardrail(projectRoot), new FeedbackLoop(), new Memory('You are a coding agent.', { maxMessages: 50 }));
    logger.info(`开始执行任务: ${task}`);
    const result = await loop.run(task);
    logger.info(`结果: ${result.state} | 步骤: ${result.steps} | ${result.message}`);
  });

program.action(async () => {
  logger.info('Coding Agent Harness v0.1.0');
  logger.info('输入任务描述开始交互，输入 /exit 退出');
  const store = new CredentialStore();
  const apiKey = await store.getKey();
  if (!apiKey) { logger.error('未配置 API key，请先运行: harness config set-key'); process.exit(1); }
  const projectRoot = process.cwd();
  const config: AgentConfig = { maxSteps: 30, maxRetries: 3, projectRoot, model: 'deepseek-v3' };
  const llm = new OpenAIProvider(apiKey, process.env.LLM_BASE_URL ?? 'https://njusehub.info/v1', 'deepseek-v3');
  const registry = new ToolRegistry();
  registry.register(new ReadFileTool(projectRoot));
  registry.register(new WriteFileTool(projectRoot));
  registry.register(new ShellTool());
  registry.register(new RunTestTool());
  registry.register(new LintTool());
  registry.register(new GrepTool(projectRoot));
  const loop = new AgentLoop(config, llm, registry, new Guardrail(projectRoot), new FeedbackLoop(), new Memory('You are a coding agent.', { maxMessages: 50 }));
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'harness> ' });
  rl.prompt();
  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    if (trimmed === '/exit' || trimmed === '/quit') { rl.close(); return; }
    if (!trimmed) { rl.prompt(); return; }
    const result = await loop.run(trimmed);
    logger.info(`[${result.state}] ${result.message}`);
    rl.prompt();
  });
  rl.on('close', () => { logger.info('再见！'); process.exit(0); });
});

program.parse();