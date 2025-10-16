import { inspect } from "node:util";
import type { TransformableInfo } from "logform";
import { createLogger, format, transports } from "winston";

const { combine, colorize, errors, printf, splat, timestamp } = format;

const consoleFormat = printf(
  (info: TransformableInfo & { stack?: unknown; timestamp?: unknown }) => {
    const { level, message, stack, timestamp: ts, ...meta } = info;

    const timestampValue =
      typeof ts === "string" || typeof ts === "number"
        ? String(ts)
        : new Date().toISOString();
    const messageValue =
      typeof message === "string" ? message : inspect(message, { depth: null });
    const stackValue = typeof stack === "string" ? stack : undefined;
    const metaContent =
      Object.keys(meta).length > 0 ? ` ${inspect(meta, { depth: null })}` : "";

    if (stackValue) {
      return `${timestampValue} ${level}: ${messageValue} — ${stackValue}${metaContent}`;
    }

    return `${timestampValue} ${level}: ${messageValue}${metaContent}`;
  },
);

export const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(errors({ stack: true }), splat()),
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp(), consoleFormat),
    }),
  ],
});

export function log(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    logger.info(message, meta);
    return;
  }

  logger.info(message);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    logger.warn(message, meta);
    return;
  }

  logger.warn(message);
}

export function logError(error: unknown, message?: string) {
  if (error instanceof Error) {
    logger.error(message ?? error.message, {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });
    return;
  }

  if (typeof error === "string") {
    if (message) {
      logger.error(`${message}: ${error}`);
      return;
    }

    logger.error(error);
    return;
  }

  logger.error(message ?? "Unexpected error", { error });
}

interface HttpFailureMeta {
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  userAgent?: string;
  ip?: string;
  errorMessage?: string;
}

export function logHttpFailure(meta: HttpFailureMeta) {
  const { method, url, statusCode, durationMs, userAgent, ip, errorMessage } =
    meta;
  const level = statusCode >= 500 ? "error" : "warn";

  const sanitizedErrorMessage =
    typeof errorMessage === "string" && errorMessage.length > 500
      ? `${errorMessage.slice(0, 497)}...`
      : errorMessage;

  const baseMeta: Record<string, unknown> = {
    method,
    url,
    statusCode,
    durationMs,
  };

  if (userAgent) {
    baseMeta.userAgent = userAgent;
  }

  if (ip) {
    baseMeta.ip = ip;
  }

  if (sanitizedErrorMessage) {
    baseMeta.errorMessage = sanitizedErrorMessage;
  }

  const message = `HTTP ${method} ${url} resulted in status ${statusCode}`;

  logger.log(level, message, baseMeta);
}
