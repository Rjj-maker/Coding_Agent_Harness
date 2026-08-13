import { Command } from 'commander';
import { CredentialStore } from './credential-store.js';
import { ConfigStore } from './config-store.js';
import { logger } from '../utils/logger.js';
import { createInterface } from 'readline';
import { stdin, stdout } from 'process';

function hiddenInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout });
    const buf: string[] = [];
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write(prompt + ' ');
    stdin.on('data', (key) => {
      const k = key.toString();
      if (k === '\r' || k === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\n');
        rl.close();
        resolve(buf.join(''));
      } else if (k === '\x7f' || k === '\b') {
        buf.pop();
        stdout.write('\b \b');
      } else if (k === '\x03') {
        stdin.setRawMode(false);
        stdin.pause();
        rl.close();
        process.exit(0);
      } else {
        buf.push(k);
        stdout.write('*');
      }
    });
  });
}

export function createConfigCommand(): Command {
  const configCmd = new Command('config').description('管理 API key 和模型配置');

  configCmd.command('set-key').description('设置 API key（隐藏输入）').action(async () => {
    const key = await hiddenInput('请输入 API key:');
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