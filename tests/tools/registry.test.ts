import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../src/tools/registry.js';
import { Tool } from '../../src/tools/tool.js';
import { ToolResult } from '../../src/agent/types.js';

class FakeTool implements Tool {
  name = 'fake';
  description = 'A fake tool';
  parameters = { input: { type: 'string', description: 'test param' } };
  async execute(_params: Record<string, string>): Promise<ToolResult> {
    return { success: true, stdout: 'fake output', stderr: '', exitCode: 0 };
  }
}

describe('ToolRegistry', () => {
  it('should register and execute a tool', async () => {
    const registry = new ToolRegistry();
    const tool = new FakeTool();
    registry.register(tool);
    const result = await registry.execute({ type: 'fake', params: { input: 'hello' }, id: '1' });
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('fake output');
  });

  it('should throw for unknown tool', async () => {
    const registry = new ToolRegistry();
    await expect(registry.execute({ type: 'unknown', params: {}, id: '1' })).rejects.toThrow('Unknown tool');
  });

  it('should return tool descriptions', () => {
    const registry = new ToolRegistry();
    registry.register(new FakeTool());
    const descs = registry.getToolDescriptions();
    expect(descs).toContain('fake');
    expect(descs).toContain('A fake tool');
  });
});