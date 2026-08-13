import { FeedbackResult, FailureDetail, ToolResult } from '../agent/types.js';

export class FeedbackLoop {
  process(result: ToolResult): FeedbackResult {
    const passed = result.exitCode === 0;
    if (passed) {
      return { passed: true, exitCode: result.exitCode, category: 'unknown', failures: [], summary: 'All checks passed.' };
    }
    const category = this.classify(result.stderr + result.stdout);
    const failures = this.extractFailures(result.stderr + result.stdout, category);
    const summary = this.generateSummary(passed, category, failures, result);
    return { passed, exitCode: result.exitCode, category, failures, summary };
  }

  classify(output: string): FeedbackResult['category'] {
    if (/ETIMEDOUT|timed?\s*out/i.test(output)) return 'timeout';
    if (/SyntaxError|Unexpected\s+token/i.test(output)) return 'syntax_error';
    if (/Type\s+'[^']+'\s+is\s+not\s+assignable|TS\d{4}/i.test(output)) return 'type_error';
    if (/AssertionError|expected.*(to|==|===)|received/i.test(output)) return 'assertion';
    if (/eslint|prettier|tslint/i.test(output)) return 'lint';
    if (this.looksLikeTestOutput(output)) return 'lint';
    return 'unknown';
  }

  private looksLikeTestOutput(output: string): boolean {
    return /\d+\s+(problems?|errors?|warnings?)/i.test(output);
  }

  extractFailures(output: string, _category: FeedbackResult['category']): FailureDetail[] {
    const failures: FailureDetail[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/\(?([\w./\\-]+\.(?:ts|js|tsx|jsx)):(\d+)(?::(\d+))?\)?/);
      if (match) { failures.push({ file: match[1], line: parseInt(match[2], 10), message: trimmed }); }
    }
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || failures.some(f => f.message === trimmed)) continue;
      if (/\b(?:AssertionError|SyntaxError|TypeError|ReferenceError|RangeError|Error|error\s+TS\d+)/i.test(trimmed)) {
        failures.push({ file: null, line: null, message: trimmed.slice(0, 500) });
      }
    }
    if (failures.length === 0 && output.trim()) { failures.push({ file: null, line: null, message: output.slice(0, 500) }); }
    return failures.slice(0, 20);
  }

  generateSummary(passed: boolean, category: FeedbackResult['category'], failures: FailureDetail[], _result: ToolResult): string {
    if (passed) return 'All checks passed.';
    const labels: Record<string, string> = { syntax_error: 'Syntax Error', type_error: 'Type Error', assertion: 'Assertion Failure', lint: 'Lint Error', timeout: 'Timeout', unknown: 'Unknown Error' };
    return [`[${labels[category]}]`, `Failures: ${failures.length}`, ...failures.map((f) => { const loc = f.file ? `${f.file}:${f.line}` : 'unknown location'; return `  ${loc}: ${f.message.slice(0, 200)}`; })].join('\n');
  }

  generateFeedback(result: FeedbackResult): string {
    const status = result.passed ? 'PASSED' : 'FAILED';
    return `[Feedback] ${status} (${result.category})\n${result.summary}`;
  }
}