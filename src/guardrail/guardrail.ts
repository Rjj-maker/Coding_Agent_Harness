import { resolve } from 'path';
import { Action, GuardResult } from '../agent/types.js';

const DANGEROUS_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /rm\s+(-rf?|--recursive)/i, description: '递归删除命令 rm -rf' },
  { pattern: /DROP\s+(TABLE|DATABASE)/i, description: '删除数据库/表 DROP TABLE/DATABASE' },
  { pattern: /curl.*\|\s*(sh|bash)/i, description: 'curl 管道到 shell (curl | sh)' },
  { pattern: />\s*\/dev\//i, description: '写入系统设备 /dev/' },
];

export class Guardrail {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = resolve(projectRoot);
  }

  check(action: Action): GuardResult {
    if (action.type === 'shell') {
      return this.checkShellCommand(action.params.command ?? '');
    }
    if (action.type === 'write_file') {
      return this.checkFilePath(action.params.path ?? '');
    }
    return { allowed: true };
  }

  private checkShellCommand(command: string): GuardResult {
    for (const { pattern, description } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return { allowed: false, reason: `危险命令: ${description} (${command})`, needApproval: true };
      }
    }
    return { allowed: true };
  }

  private checkFilePath(filePath: string): GuardResult {
    const resolved = resolve(this.projectRoot, filePath);
    if (!resolved.startsWith(this.projectRoot)) {
      return { allowed: false, reason: `操作超出项目目录: ${filePath}`, needApproval: true };
    }
    return { allowed: true };
  }
}