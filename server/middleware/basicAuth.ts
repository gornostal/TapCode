import type { RequestHandler } from "express";

import type { BasicAuthConfig } from "../utils/config";

export function basicAuthMiddleware(
  credentials: BasicAuthConfig,
): RequestHandler {
  const expectedToken = Buffer.from(
    `${credentials.username}:${credentials.password}`,
    "utf8",
  ).toString("base64");

  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", 'Basic realm="TapCode"');
      res.sendStatus(401);
      return;
    }

    const receivedToken = header.slice(6).trim();
    if (receivedToken !== expectedToken) {
      res.setHeader("WWW-Authenticate", 'Basic realm="TapCode"');
      res.sendStatus(401);
      return;
    }

    next();
  };
}
