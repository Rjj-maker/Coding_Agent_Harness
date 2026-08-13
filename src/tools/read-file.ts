import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read the contents of a file';
  parameters = { path: { type: 'string', description: 'File path relative to project root' } };
  private projectRoot: string;

  constructor(projectRoot: string) { this.projectRoot = projectRoot; }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, params.path);
      if (!fullPath.startsWith(resolve(this.projectRoot))) return { success: false, stdout: '', stderr: 'Access denied', exitCode: 1 };
      const content = await readFile(fullPath, 'utf-8');
      return { success: true, stdout: content, stderr: '', exitCode: 0 };
    } catch (e) { return { success: false, stdout: '', stderr: String(e), exitCode: 1 }; }
  }
}