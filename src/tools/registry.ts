import { Action, ToolResult } from '../agent/types.js';
import { Tool } from './tool.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void { this.tools.set(tool.name, tool); }

  async execute(action: Action): Promise<ToolResult> {
    const tool = this.tools.get(action.type);
    if (!tool) throw new Error(`Unknown tool: ${action.type}`);
    return tool.execute(action.params);
  }

  getToolDescriptions(): string {
    const descriptions: string[] = [];
    for (const tool of this.tools.values()) descriptions.push(`- ${tool.name}: ${tool.description}`);
    return descriptions.join('\n');
  }

  getToolNames(): string[] { return Array.from(this.tools.keys()); }
}