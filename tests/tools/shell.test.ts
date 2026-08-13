import { describe, it, expect } from 'vitest';
import { ShellTool } from '../../src/tools/shell.js';

describe('ShellTool', () => {
  it('should execute echo command', async () => {
    const tool = new ShellTool();
    const result = await tool.execute({ command: 'echo hello' });
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('hello');
    expect(result.exitCode).toBe(0);
  });
});