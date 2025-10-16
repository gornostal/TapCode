import type { NextFunction, Request, Response } from "express";
import { logHttpFailure } from "../utils/logger";

export function createHttpErrorLogger() {
  return function httpErrorLogger(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = Date.now();

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 400 && body && typeof body === "object") {
        const maybeError = (body as { error?: unknown }).error;
        if (typeof maybeError === "string") {
          res.locals.errorMessage = maybeError;
        }
      }

      return originalJson(body);
    }) as typeof res.json;

    res.on("finish", () => {
      if (res.statusCode >= 400) {
        logHttpFailure({
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - startTime,
          userAgent: req.get("user-agent") ?? undefined,
          ip: req.ip,
          errorMessage:
            typeof res.locals.errorMessage === "string"
              ? res.locals.errorMessage
              : undefined,
        });
      }
    });

    next();
  };
}
