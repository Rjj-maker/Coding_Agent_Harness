import { logger } from '../utils/logger.js';

export class CredentialStore {
  private readonly SERVICE_NAME = 'coding-agent-harness';
  private readonly ACCOUNT_NAME = 'api-key';

  async setKey(key: string): Promise<void> {
    try {
      const keytar = await import('keytar');
      await keytar.setPassword(this.SERVICE_NAME, this.ACCOUNT_NAME, key);
      logger.info('API key 已安全存储到凭据管理器');
    } catch {
      logger.warn('凭据管理器不可用，使用 .env 文件备选方案');
      const { writeFileSync } = await import('fs');
      writeFileSync('.env', `API_KEY=${key}\n`, 'utf-8');
      logger.warn('警告: .env 文件为明文存储，请勿提交到 Git');
    }
  }

  async getKey(): Promise<string | null> {
    try {
      const keytar = await import('keytar');
      const key = await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
      if (key) return key;
    } catch {}
    try {
      const { readFileSync } = await import('fs');
      const content = readFileSync('.env', 'utf-8');
      const match = content.match(/^API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    } catch {}
    return null;
  }

  async hasKey(): Promise<boolean> { const key = await this.getKey(); return key !== null; }

  async clearKey(): Promise<void> {
    try { const keytar = await import('keytar'); await keytar.deletePassword(this.SERVICE_NAME, this.ACCOUNT_NAME); logger.info('API key 已清除'); } catch {}
    try { const { unlinkSync } = await import('fs'); unlinkSync('.env'); } catch {}
  }
}