import { exec } from 'child_process';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

export class ShellTool implements Tool {
  name = 'shell';
  description = 'Execute a shell command';
  parameters = { command: { type: 'string', description: 'Shell command' } };

  async execute(params: Record<string, string>): Promise<ToolResult> {
    return new Promise((resolve) => {
      exec(params.command, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout.slice(0, 10000),
          stderr: stderr.slice(0, 10000),
          exitCode: error ? (error as any).code ?? 1 : 0,
        });
      });
    });
  }
}