import { Router, type Express } from "express";
import type { FilesResponse, HelloResponse } from "@shared/messages";
import { listImmediateChildrenFromRoot, searchFiles } from "./utils/fileSearch";

const normalizeQueryParam = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        return item;
      }
    }
    return "";
  }

  return "";
};

export function registerRoutes(app: Express) {
  const router = Router();

  router.get("/hello", (_req, res) => {
    const payload: HelloResponse = {
      message: "Hello from the PocketIDE server!",
    };

    res.json(payload);
  });

  router.get("/files", (req, res, next) => {
    const query = normalizeQueryParam(req.query.q).trim();

    const itemsPromise = query
      ? searchFiles(query, 10)
      : listImmediateChildrenFromRoot();

    itemsPromise
      .then((items) => {
        const response: FilesResponse = { query, items };
        res.json(response);
      })
      .catch((error) => next(error));
  });

  app.use(router);
}
