// Alternative HTTP-only configuration for extremely restricted environments
// This forces all connections to use HTTP long-polling instead of WebSocket

/*
 * To use HTTP-only mode, set these environment variables in .env.local:
 * 
 * VITE_MTPROTO_HTTP=1
 * VITE_MTPROTO_HAS_WS=
 * VITE_MTPROTO_HAS_HTTP=1
 * VITE_MTPROTO_AUTO=
 * 
 * Or add these URL parameters:
 * ?proxy=1&http=1
 */

import ProxyConfig from './proxy';

export function isHttpOnlyMode(): boolean {
  if (typeof location !== 'undefined') {
    if (location.search.indexOf('http=1') > 0) return true;
    if (location.search.indexOf('httpsOnly=1') > 0) return true;
  }
  
  // If proxy is enabled, default to HTTP-only for maximum compatibility
  return ProxyConfig.enabled;
}

export default {
  // Force HTTP transport in proxy mode
  forceHttp: isHttpOnlyMode()
};
