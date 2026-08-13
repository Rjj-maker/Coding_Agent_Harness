import { Command } from 'commander';
import { CredentialStore } from './credential-store.js';
import { ConfigStore } from './config-store.js';
import { logger } from '../utils/logger.js';

export function createConfigCommand(): Command {
  const configCmd = new Command('config').description('管理 API key 和模型配置');

  configCmd.command('set-key').description('设置 API key（隐藏输入）').action(async () => {
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));
    const key = await ask('请输入 API key: ');
    rl.close();
    if (!key.trim()) { logger.error('API key 不能为空'); process.exit(1); }
    const store = new CredentialStore();
    await store.setKey(key.trim());
  });

  configCmd.command('status').description('查看当前配置状态').action(async () => {
    const credStore = new CredentialStore();
    const hasKey = await credStore.hasKey();
    const cfgStore = new ConfigStore();
    const { model, endpoint } = cfgStore.getAll();
    logger.info(`API key: ${hasKey ? '已配置' : '未配置'}`);
    logger.info(`API 地址: ${endpoint}`);
    logger.info(`模型: ${model}`);
  });

  configCmd.command('clear-key').description('清除已存储的 API key').action(async () => {
    const store = new CredentialStore();
    await store.clearKey();
  });

  configCmd.command('set-model <model>').description('设置默认模型').action((model: string) => {
    const store = new ConfigStore();
    store.setModel(model);
    logger.info(`模型已设置为: ${model}`);
  });

  configCmd.command('set-endpoint <url>').description('设置 API 地址').action((url: string) => {
    const store = new ConfigStore();
    store.setEndpoint(url);
    logger.info(`API 地址已设置为: ${url}`);
  });

  return configCmd;
}