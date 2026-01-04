// Type definitions for Cloudflare Pages Functions
// These are simplified types - for full types install @cloudflare/workers-types

declare interface PagesFunction<Env = unknown> {
  (context: EventContext<Env>): Response | Promise<Response>;
}

declare interface EventContext<Env> {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil(promise: Promise<unknown>): void;
  next(): Promise<Response>;
  data: Record<string, unknown>;
}
