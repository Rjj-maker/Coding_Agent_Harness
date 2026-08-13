const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

export class Logger {
  info(msg: string): void { console.log(`${C.gray}[${new Date().toLocaleTimeString()}]${C.reset} ${msg}`); }
  warn(msg: string): void { console.log(`${C.yellow}⚠${C.reset} ${msg}`); }
  error(msg: string): void { console.log(`${C.red}✗${C.reset} ${msg}`); }
  success(msg: string): void { console.log(`${C.green}✓${C.reset} ${msg}`); }
  step(step: number, action: string, duration: number): void {
    console.log(`${C.gray}[${new Date().toLocaleTimeString()}]${C.reset} ${C.cyan}▶${C.reset} Step ${step} ${C.dim}|${C.reset} ${action} ${C.dim}(${duration}ms)${C.reset}`);
  }
  banner(): void {
    console.log('');
    console.log(`${C.bold}${C.cyan}  ╔══════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ║${C.reset}   ${C.bold}Coding Agent Harness${C.reset} v0.1.0   ${C.bold}${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ╚══════════════════════════════════╝${C.reset}`);
    console.log('');
  }
  section(title: string): void {
    console.log(`\n${C.bold}${C.blue}◆ ${title}${C.reset}`);
  }
  divider(): void {
    console.log(C.gray + '─'.repeat(50) + C.reset);
  }
}
export const logger = new Logger();