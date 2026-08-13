import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';
import { ShellTool } from './shell.js';

export class RunTestTool implements Tool {
  name = 'run_test';
  description = 'Run test command';
  parameters = { command: { type: 'string', description: 'Test command' } };
  private shell = new ShellTool();

  async execute(params: Record<string, string>): Promise<ToolResult> { return this.shell.execute(params); }
}