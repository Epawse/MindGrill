/**
 * Minimal structured logger. Emits one JSON line per log.
 *
 * Use `logger.info / warn / error / debug`; never call `console.log` directly.
 * Vercel captures stderr automatically on the server side.
 * Browser-safe: falls back to `console` methods when `process.stderr` is absent.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  msg: string;
  ts: number;
  [key: string]: unknown;
}

const isServer =
  typeof process !== "undefined" &&
  typeof process.stderr !== "undefined" &&
  typeof process.stderr.write === "function";

function emit(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const nodeEnv =
    typeof process !== "undefined" && process.env ? process.env.NODE_ENV : undefined;
  if (level === "debug" && nodeEnv !== "development") return;
  const payload: LogPayload = { level, msg, ts: Date.now(), ...data };
  const line = JSON.stringify(payload);
  if (isServer) {
    // Server: write to stderr so it doesn't pollute stdout streams.
    process.stderr.write(line + "\n");
  } else {
    // Browser: fall back to console methods.
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.info(line);
    }
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => emit("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => emit("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit("error", msg, data),
};
