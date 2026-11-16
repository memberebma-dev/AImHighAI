import { Hono } from "hono";
import { handle } from "hono/vercel";
import { waitUntil } from "@vercel/functions";
import backend from "../backend/index";

// Vercel entry point: every /api/* request is served by the Hono backend.
// Routes read secrets from c.env, so expose process.env there, and provide
// waitUntil so the orchestrator keeps running after it responds.
const app = new Hono().basePath("/api");
app.use("*", async (c, next) => {
  c.env = process.env as Record<string, string>;
  Object.defineProperty(c, "executionCtx", {
    value: { waitUntil, passThroughOnException: () => {}, props: {} },
    configurable: true,
  });
  await next();
});
app.route("/", backend);

export const config = { maxDuration: 300 };
const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
