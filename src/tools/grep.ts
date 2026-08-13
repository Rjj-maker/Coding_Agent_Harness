import { readFile, readdir, stat } from 'fs/promises';
import { resolve, extname } from 'path';
import { Tool } from './tool.js';
import { ToolResult } from '../agent/types.js';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.js', '.json', '.md']);

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else if (SUPPORTED_EXTENSIONS.has(extname(entry.name))) yield fullPath;
  }
}

export class GrepTool implements Tool {
  name = 'grep';
  description = 'Search for a pattern in project files';
  parameters = { pattern: { type: 'string', description: 'Regex pattern' }, path: { type: 'string', description: 'Directory to search' } };
  private projectRoot: string;

  constructor(projectRoot: string) { this.projectRoot = projectRoot; }

  async execute(params: Record<string, string>): Promise<ToolResult> {
    try {
      const searchPath = resolve(this.projectRoot, params.path);
      if (!searchPath.startsWith(resolve(this.projectRoot))) return { success: false, stdout: '', stderr: 'Access denied', exitCode: 1 };
      const regex = new RegExp(params.pattern, 'g');
      const results: string[] = [];
      let count = 0;
      for await (const fullPath of walk(searchPath)) {
        if (count++ >= 50) break;
        const content = await readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = fullPath.slice(searchPath.length + 1);
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) { results.push(`${relativePath}:${i + 1}: ${lines[i].trim()}`); regex.lastIndex = 0; }
        }
      }
      return { success: true, stdout: results.join('\n') || 'No matches found', stderr: '', exitCode: 0 };
    } catch (e) { return { success: false, stdout: '', stderr: String(e), exitCode: 1 }; }
  }
}