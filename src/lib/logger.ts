/**
 * Minimal structured logger. Emits one JSON line per log to stderr.
 *
 * Use `logger.info / warn / error / debug`; never call `console.log` directly.
 * Vercel captures stderr automatically.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  msg: string;
  ts: number;
  [key: string]: unknown;
}

function emit(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const payload: LogPayload = { level, msg, ts: Date.now(), ...data };
  const line = JSON.stringify(payload);
  // Always to stderr so it doesn't pollute stdout streams.
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    // info + debug share stderr through console.error to keep stream layout consistent
    // in serverless logs.
    if (level === "debug" && process.env.NODE_ENV !== "development") return;
    process.stderr.write(line + "\n");
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => emit("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => emit("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit("error", msg, data),
};
