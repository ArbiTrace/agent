// agent/src/utils/logger.ts
// Simple but powerful logging

import fs from "fs";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");

// Create logs directory
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG";

export class Logger {
  private logFile: string;

  constructor(name: string) {
    const date = new Date().toISOString().split("T")[0];
    this.logFile = path.join(logsDir, `${name}-${date}.log`);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private format(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  private write(level: LogLevel, message: string, data?: any) {
    const formatted = this.format(level, message, data);

    // Console output with colors
    const colors: Record<LogLevel, string> = {
      INFO: "\x1b[36m",     // Cyan
      SUCCESS: "\x1b[32m",  // Green
      WARN: "\x1b[33m",     // Yellow
      ERROR: "\x1b[31m",    // Red
      DEBUG: "\x1b[35m",    // Magenta
    };

    const reset = "\x1b[0m";
    console.log(`${colors[level]}${formatted}${reset}`);

    // File output
    fs.appendFileSync(this.logFile, formatted + "\n");
  }

  info(message: string, data?: any) {
    this.write("INFO", message, data);
  }

  success(message: string, data?: any) {
    this.write("SUCCESS", message, data);
  }

  warn(message: string, data?: any) {
    this.write("WARN", message, data);
  }

  error(message: string, data?: any) {
    this.write("ERROR", message, data);
  }

  debug(message: string, data?: any) {
    this.write("DEBUG", message, data);
  }
}

export const logger = new Logger("arbitrace-agent");
