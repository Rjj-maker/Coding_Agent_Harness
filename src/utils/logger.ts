export class Logger {
  info(msg: string): void { console.log(`[${new Date().toISOString()}] INFO  ${msg}`); }
  warn(msg: string): void { console.warn(`[${new Date().toISOString()}] WARN  ${msg}`); }
  error(msg: string): void { console.error(`[${new Date().toISOString()}] ERROR ${msg}`); }
  step(step: number, action: string, duration: number): void { console.log(`[${new Date().toISOString()}] STEP ${step} | ${action} | ${duration}ms`); }
}
export const logger = new Logger();