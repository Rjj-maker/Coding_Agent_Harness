import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.harness');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface HarnessConfig {
  model?: string;
  endpoint?: string;
}

export class ConfigStore {
  private read(): HarnessConfig {
    try {
      if (!existsSync(CONFIG_FILE)) return {};
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private write(config: HarnessConfig): void {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  getModel(): string {
    return this.read().model ?? 'DeepSeek-V3';
  }

  setModel(model: string): void {
    const config = this.read();
    config.model = model;
    this.write(config);
  }

  getEndpoint(): string {
    return this.read().endpoint ?? process.env.LLM_BASE_URL ?? 'https://njusehub.info/v1';
  }

  setEndpoint(endpoint: string): void {
    const config = this.read();
    config.endpoint = endpoint;
    this.write(config);
  }

  getAll(): { model: string; endpoint: string } {
    return { model: this.getModel(), endpoint: this.getEndpoint() };
  }
}