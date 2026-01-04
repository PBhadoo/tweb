// Cloudflare Worker for WebSocket Proxying to Telegram
// This is a standalone worker that can be deployed separately
// Deploy this as a Cloudflare Worker with WebSocket support
//
// Note: Install @cloudflare/workers-types for TypeScript support:
// pnpm add -D @cloudflare/workers-types

// @ts-nocheck - Cloudflare Workers types are separate from the main project

interface Env {}

// Build Telegram WebSocket URL
function buildTelegramWsUrl(dcId: number, connectionType: string, premium: boolean, test: boolean): string {
  const suffix = connectionType !== 'client' ? '-1' : '';
  const testSuffix = test ? '_test' : '';
  const premiumSuffix = premium ? '_premium' : '';
  const path = connectionType !== 'client' 
    ? 'apiws' + testSuffix + premiumSuffix 
    : 'apiws' + testSuffix;
  
  return `wss://kws${dcId}${suffix}.web.telegram.org/${path}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
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
      return new Response(JSON.stringify({
        info: 'Telegram WebSocket Proxy',
        usage: 'Connect via WebSocket with params: ?dc=<1-5>&type=<client|download|upload>&premium=<0|1>&test=<0|1>'
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
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

    // Build Telegram WebSocket URL
    const telegramUrl = buildTelegramWsUrl(dcId, connectionType, premium, test);

    // Create WebSocket pair for client connection
    const [client, server] = Object.values(new WebSocketPair());

    // Accept the server side
    server.accept();

    // Connect to Telegram
    const telegramWs = new WebSocket(telegramUrl, 'binary');
    
    // Handle Telegram WebSocket events
    telegramWs.addEventListener('open', () => {
      console.log(`Connected to Telegram DC${dcId}`);
    });

    telegramWs.addEventListener('message', (event) => {
      try {
        if (server.readyState === WebSocket.OPEN) {
          server.send(event.data);
        }
      } catch (e) {
        console.error('Error forwarding from Telegram:', e);
      }
    });

    telegramWs.addEventListener('close', (event) => {
      console.log(`Telegram connection closed: ${event.code} ${event.reason}`);
      try {
        server.close(event.code, event.reason);
      } catch (e) {}
    });

    telegramWs.addEventListener('error', (error) => {
      console.error('Telegram WebSocket error:', error);
      try {
        server.close(1011, 'Telegram connection error');
      } catch (e) {}
    });

    // Handle client WebSocket events
    server.addEventListener('message', (event) => {
      try {
        if (telegramWs.readyState === WebSocket.OPEN) {
          telegramWs.send(event.data);
        }
      } catch (e) {
        console.error('Error forwarding to Telegram:', e);
      }
    });

    server.addEventListener('close', (event) => {
      console.log(`Client connection closed: ${event.code} ${event.reason}`);
      try {
        telegramWs.close(event.code, event.reason);
      } catch (e) {}
    });

    server.addEventListener('error', (error) => {
      console.error('Client WebSocket error:', error);
      try {
        telegramWs.close();
      } catch (e) {}
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
};
