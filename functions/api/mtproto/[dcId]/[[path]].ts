// Cloudflare Pages Function: HTTP MTProto Proxy
// Path: /api/mtproto/[dcId]/[...path]
// 
// Note: Install @cloudflare/workers-types for TypeScript support:
// pnpm add -D @cloudflare/workers-types

// @ts-nocheck - Cloudflare Workers types are separate from the main project

interface Env {
  // Add any environment variables here if needed
}

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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse DC ID and path from URL
    const dcId = parseInt(params.dcId as string, 10);
    const pathParts = params.path as string[];
    const path = pathParts ? pathParts.join('/') : 'apiw1';
    
    if (!dcId || dcId < 1 || dcId > 5) {
      return new Response(JSON.stringify({ error: 'Invalid DC ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Determine if this is a download request
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') === '1';
    const servers = isDownload ? DC_SERVERS_DOWNLOAD : DC_SERVERS;
    const host = servers[dcId];

    if (!host) {
      return new Response(JSON.stringify({ error: 'DC not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Build the target URL
    const targetUrl = `https://${host}/${path}`;

    // Forward the request to Telegram
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Host': host
      },
      body: request.method === 'POST' ? await request.arrayBuffer() : undefined
    });

    // Return the response with CORS headers
    const responseBody = await response.arrayBuffer();
    
    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};
