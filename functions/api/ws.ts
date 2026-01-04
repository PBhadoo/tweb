// Cloudflare Pages Function: WebSocket MTProto Proxy
// Path: /api/ws
// This uses Cloudflare Durable Objects for WebSocket proxying
//
// Note: Install @cloudflare/workers-types for TypeScript support:
// pnpm add -D @cloudflare/workers-types

// @ts-nocheck - Cloudflare Workers types are separate from the main project

interface Env {
  TELEGRAM_WS_PROXY: any; // DurableObjectNamespace
}

// Main request handler - upgrades to WebSocket
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // CORS headers for non-WebSocket requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a WebSocket upgrade request
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { 
      status: 426,
      headers: corsHeaders 
    });
  }

  // Parse parameters
  const dcId = parseInt(url.searchParams.get('dc') || '2', 10);
  const connectionType = url.searchParams.get('type') || 'client';
  const premium = url.searchParams.get('premium') === '1';
  const test = url.searchParams.get('test') === '1';

  if (dcId < 1 || dcId > 5) {
    return new Response('Invalid DC ID', { status: 400, headers: corsHeaders });
  }

  // Create a unique ID for this connection
  const id = env.TELEGRAM_WS_PROXY.idFromName(`${dcId}-${connectionType}-${Date.now()}-${Math.random()}`);
  const stub = env.TELEGRAM_WS_PROXY.get(id);

  // Forward the WebSocket request to the Durable Object
  const wsUrl = new URL(request.url);
  wsUrl.searchParams.set('dc', dcId.toString());
  wsUrl.searchParams.set('type', connectionType);
  wsUrl.searchParams.set('premium', premium ? '1' : '0');
  wsUrl.searchParams.set('test', test ? '1' : '0');

  return stub.fetch(new Request(wsUrl.toString(), request));
};

// Durable Object for handling WebSocket connections
export class TelegramWsProxy {
  private state: DurableObjectState;
  private clientWs: WebSocket | null = null;
  private telegramWs: WebSocket | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const dcId = parseInt(url.searchParams.get('dc') || '2', 10);
    const connectionType = url.searchParams.get('type') || 'client';
    const premium = url.searchParams.get('premium') === '1';
    const test = url.searchParams.get('test') === '1';

    // Build Telegram WebSocket URL
    const telegramUrl = this.buildTelegramWsUrl(dcId, connectionType, premium, test);

    // Create WebSocket pair for client
    const [clientSocket, serverSocket] = Object.values(new WebSocketPair());
    
    // Accept the WebSocket
    this.state.acceptWebSocket(serverSocket);
    this.clientWs = serverSocket;

    // Connect to Telegram
    try {
      this.telegramWs = new WebSocket(telegramUrl, 'binary');
      
      this.telegramWs.addEventListener('open', () => {
        console.log('Connected to Telegram');
      });

      this.telegramWs.addEventListener('message', (event) => {
        if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
          this.clientWs.send(event.data);
        }
      });

      this.telegramWs.addEventListener('close', () => {
        if (this.clientWs) {
          this.clientWs.close();
        }
      });

      this.telegramWs.addEventListener('error', (error) => {
        console.error('Telegram WS error:', error);
        if (this.clientWs) {
          this.clientWs.close();
        }
      });

    } catch (error) {
      console.error('Failed to connect to Telegram:', error);
      serverSocket.close(1011, 'Failed to connect to Telegram');
      return new Response('Failed to connect', { status: 502 });
    }

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    // Forward message from client to Telegram
    if (this.telegramWs && this.telegramWs.readyState === WebSocket.OPEN) {
      this.telegramWs.send(message);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    // Close Telegram connection when client disconnects
    if (this.telegramWs) {
      this.telegramWs.close();
    }
  }

  private buildTelegramWsUrl(dcId: number, connectionType: string, premium: boolean, test: boolean): string {
    const suffix = connectionType !== 'client' ? '-1' : '';
    const testSuffix = test ? '_test' : '';
    const premiumSuffix = premium ? '_premium' : '';
    const path = connectionType !== 'client' 
      ? 'apiws' + testSuffix + premiumSuffix 
      : 'apiws' + testSuffix;
    
    return `wss://kws${dcId}${suffix}.web.telegram.org/${path}`;
  }
}
