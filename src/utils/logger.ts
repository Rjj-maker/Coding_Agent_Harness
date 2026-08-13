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
    const title = 'Coding Agent Harness';
    const version = 'v0.1.0';
    const width = 36;
    const inner = `${title} ${version}`;
    const pad = Math.max(0, width - 2 - inner.length);
    const left = Math.floor(pad / 2);
    const right = pad - left;
    const top = '╔' + '═'.repeat(width - 2) + '╗';
    const mid = '║' + ' '.repeat(left) + inner + ' '.repeat(right) + '║';
    const bot = '╚' + '═'.repeat(width - 2) + '╝';
    console.log('');
    console.log(`${C.bold}${C.cyan}  ${top}${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ${mid}${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ${bot}${C.reset}`);
    console.log('');
  }
  section(title: string): void {
    console.log(`\n${C.bold}${C.blue}◆ ${title}${C.reset}`);
  }
  divider(): void {
    console.log('\n' + C.gray + '━'.repeat(60) + C.reset + '\n');
  }
  convStart(num: number, msg: string): void {
    const text = msg.length > 50 ? msg.slice(0, 48) + '...' : msg;
    console.log(`\n${C.bold}${C.cyan}◆ 对话 #${num}: ${text}${C.reset}`);
    console.log(C.cyan + '━'.repeat(60) + C.reset);
  }
  convEnd(): void {
    console.log(C.cyan + '━'.repeat(60) + C.reset + '\n');
  }
}
export const logger = new Logger();