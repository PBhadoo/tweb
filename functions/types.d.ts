// Type definitions for Cloudflare Pages Functions
// These are simplified types - for full types install @cloudflare/workers-types

declare interface PagesFunction<Env = unknown> {
  (context: EventContext<Env>): Promise<Response>;
}

declare interface EventContext<Env> {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil(promise: Promise<any>): void;
  next(): Promise<Response>;
  data: Record<string, any>;
}

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

declare interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
  newUniqueId(): DurableObjectId;
}

declare interface DurableObjectId {
  toString(): string;
}

declare interface DurableObjectStub {
  fetch(request: Request | string): Promise<Response>;
}

declare interface DurableObjectState {
  id: DurableObjectId;
  storage: DurableObjectStorage;
  waitUntil(promise: Promise<any>): void;
  acceptWebSocket(ws: WebSocket): void;
}

declare interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}

declare interface ResponseInit {
  webSocket?: WebSocket;
}
