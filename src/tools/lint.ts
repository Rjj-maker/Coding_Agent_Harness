import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';
import { ShellTool } from './shell.js';

export class LintTool implements Tool {
  name = 'lint';
  description = 'Run linter on specified path';
  parameters = { path: { type: 'string', description: 'Path to lint' } };
  private shell = new ShellTool();

  async execute(params: Record<string, string>): Promise<ToolResult> { return this.shell.execute({ command: `npx eslint ${params.path}` }); }
}