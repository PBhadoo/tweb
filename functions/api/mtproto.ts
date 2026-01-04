// Cloudflare Pages Function: HTTP MTProto Proxy
// Path: /api/mtproto

interface Env {}

// Telegram server endpoints
const DC_SERVERS: Record<number, string> = {
  1: 'pluto.web.telegram.org',
  2: 'venus.web.telegram.org',
  3: 'aurora.web.telegram.org',
  4: 'vesta.web.telegram.org',
  5: 'flora.web.telegram.org'
};

const DC_SERVERS_DOWNLOAD: Record<number, string> = {
  1: 'pluto-1.web.telegram.org',
  2: 'venus-1.web.telegram.org',
  3: 'aurora-1.web.telegram.org',
  4: 'vesta-1.web.telegram.org',
  5: 'flora-1.web.telegram.org'
};

// CORS headers
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequest: PagesFunction<Env> = async(context) => {
  const {request} = context;

  // Handle CORS preflight
  if(request.method === 'OPTIONS') {
    return new Response(null, {headers: corsHeaders});
  }

  try {
    const url = new URL(request.url);

    // Parse DC ID and path from query params
    const dcId = parseInt(url.searchParams.get('dc') || '2', 10);
    const path = url.searchParams.get('path') || 'apiw1';
    const isDownload = url.searchParams.get('download') === '1';

    if(!dcId || dcId < 1 || dcId > 5) {
      return new Response(JSON.stringify({error: 'Invalid DC ID', dcId}), {
        status: 400,
        headers: {'Content-Type': 'application/json', ...corsHeaders}
      });
    }

    const servers = isDownload ? DC_SERVERS_DOWNLOAD : DC_SERVERS;
    const host = servers[dcId];

    if(!host) {
      return new Response(JSON.stringify({error: 'DC not found', dcId}), {
        status: 404,
        headers: {'Content-Type': 'application/json', ...corsHeaders}
      });
    }

    // Build the target URL
    const targetUrl = `https://${host}/${path}`;

    // Forward the request to Telegram
    const requestInit: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };

    if(request.method === 'POST') {
      requestInit.body = await request.arrayBuffer();
    }

    const response = await fetch(targetUrl, requestInit);

    // Return the response with CORS headers
    const responseBody = await response.arrayBuffer();

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...corsHeaders
      }
    });
  } catch(error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({error: 'Proxy error', details: String(error)}), {
      status: 500,
      headers: {'Content-Type': 'application/json', ...corsHeaders}
    });
  }
};
