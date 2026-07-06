type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string): string {
    const ts = this.getTimestamp();
    const upperLevel = level.toUpperCase().padEnd(5);
    
    // Simple ANSI colors for server logging
    let color = '\x1b[0m'; // Reset
    switch (level) {
      case 'info':
        color = '\x1b[32m'; // Green
        break;
      case 'warn':
        color = '\x1b[33m'; // Yellow
        break;
      case 'error':
        color = '\x1b[31m'; // Red
        break;
      case 'debug':
        color = '\x1b[36m'; // Cyan
        break;
    }

    return `${color}[${ts}] [${upperLevel}] ${message}\x1b[0m`;
  }

  public info(message: string): void {
    console.log(this.formatMessage('info', message));
  }

  public warn(message: string): void {
    console.warn(this.formatMessage('warn', message));
  }

  public error(message: string): void {
    console.error(this.formatMessage('error', message));
  }

  public debug(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message));
    }
  }
}

export const logger = new Logger();
