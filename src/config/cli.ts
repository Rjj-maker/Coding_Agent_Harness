import { Command } from 'commander';
import { CredentialStore } from './credential-store.js';
import { logger } from '../utils/logger.js';

export function createConfigCommand(): Command {
  const configCmd = new Command('config').description('管理 API key 配置');
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
  configCmd.command('status').description('查看 API key 配置状态').action(async () => {
    const store = new CredentialStore();
    const hasKey = await store.hasKey();
    logger.info(`API key: ${hasKey ? '已配置' : '未配置'}`);
  });
  configCmd.command('clear-key').description('清除已存储的 API key').action(async () => {
    const store = new CredentialStore();
    await store.clearKey();
  });
  return configCmd;
}