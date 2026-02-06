export class Logger {
  private prefix = "[env-run]:";
  private debugEnabled: boolean;

  // ANSI color codes
  private colors = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    gray: "\x1b[90m",
  };

  constructor(debugEnabled = false) {
    this.debugEnabled = debugEnabled || process.env.NODE_ENV === "test";
  }

  info(message: string): void {
    console.info(
      `${this.colors.blue}[INFO]${this.colors.reset} ${this.prefix} ${message}`
    );
  }

  warn(message: string): void {
    console.warn(
      `${this.colors.yellow}[WARN]${this.colors.reset} ${this.prefix} ${message}`
    );
  }

  error(message: string): void {
    console.error(
      `${this.colors.red}[ERROR]${this.colors.reset} ${this.prefix} ${message}`
    );
  }

  debug(message: string): void {
    if (this.debugEnabled) {
      console.debug(
        `${this.colors.gray}[DEBUG]${this.colors.reset} ${this.prefix} ${message}`
      );
    }
  }
}
