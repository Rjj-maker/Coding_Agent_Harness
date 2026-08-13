import { ToolResult } from '../agent/types.js';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
  execute(params: Record<string, string>): Promise<ToolResult>;
}