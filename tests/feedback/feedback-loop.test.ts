import { describe, it, expect } from 'vitest';
import { FeedbackLoop } from '../../src/feedback/feedback-loop.js';

describe('FeedbackLoop', () => {
  const feedback = new FeedbackLoop();

  it('should detect passing test', () => {
    const result = feedback.process({ success: true, stdout: 'Tests: 5 passed', stderr: '', exitCode: 0 });
    expect(result.passed).toBe(true);
    expect(result.category).toBe('unknown');
    expect(result.failures).toHaveLength(0);
  });

  it('should detect syntax error', () => {
    const result = feedback.process({ success: false, stdout: '', stderr: 'SyntaxError: Unexpected token at line 42', exitCode: 1 });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('syntax_error');
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it('should detect type error', () => {
    const result = feedback.process({ success: false, stdout: '', stderr: "error TS2322: Type 'string' is not assignable", exitCode: 2 });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('type_error');
  });

  it('should detect assertion failure', () => {
    const result = feedback.process({ success: false, stdout: '', stderr: 'AssertionError: expected 1 to equal 2', exitCode: 1 });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('assertion');
  });

  it('should detect lint failure', () => {
    const result = feedback.process({ success: false, stdout: '3 problems (2 errors, 1 warning)', stderr: '', exitCode: 1 });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('lint');
  });

  it('should detect timeout', () => {
    const result = feedback.process({ success: false, stdout: '', stderr: 'ETIMEDOUT', exitCode: 124 });
    expect(result.passed).toBe(false);
    expect(result.category).toBe('timeout');
  });

  it('should generate feedback text for LLM', () => {
    const result = feedback.process({ success: false, stdout: '', stderr: 'AssertionError: expected 1 to equal 2\n    at test.ts:10:5', exitCode: 1 });
    const text = feedback.generateFeedback(result);
    expect(text).toContain('FAILED');
    expect(text).toContain('assertion');
    expect(text).toContain('AssertionError');
  });

  it('should generate passing feedback text', () => {
    const result = feedback.process({ success: true, stdout: 'Tests: 5 passed', stderr: '', exitCode: 0 });
    const text = feedback.generateFeedback(result);
    expect(text).toContain('PASSED');
  });
});