import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

export class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Write content to a file';
  parameters = { path: { type: 'string', description: 'File path' }, content: { type: 'string', description: 'Content' } };
  private projectRoot: string;

  constructor(projectRoot: string) { this.projectRoot = projectRoot; }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, params.path);
      if (!fullPath.startsWith(resolve(this.projectRoot))) return { success: false, stdout: '', stderr: 'Access denied', exitCode: 1 };
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, params.content, 'utf-8');
      return { success: true, stdout: `File written: ${params.path}`, stderr: '', exitCode: 0 };
    } catch (e) { return { success: false, stdout: '', stderr: String(e), exitCode: 1 }; }
  }
}