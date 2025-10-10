import { Router, type Express } from "express";
import type { HelloResponse } from "@shared/messages";

export function registerRoutes(app: Express) {
  const router = Router();

  router.get("/hello", (_req, res) => {
    const payload: HelloResponse = {
      message: "Hello from the PocketIDE server!",
    };

    res.json(payload);
  });

  app.use(router);
}
