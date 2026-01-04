/*
 * Cloudflare Pages Proxy Configuration
 * Configure this to route Telegram connections through your Cloudflare Pages proxy
 */

export interface ProxyConfig {
  // Enable proxy mode - when true, all connections go through the proxy
  enabled: boolean;
  // Base URL of your Cloudflare Pages deployment (e.g., 'https://your-app.pages.dev')
  baseUrl: string;
  // HTTP API proxy path
  httpPath: string;
  // WebSocket proxy path  
  wsPath: string;
}

// Check URL parameter or localStorage for proxy settings
function getProxyEnabled(): boolean {
  // URL parameter takes precedence
  if (typeof location !== 'undefined') {
    if (location.search.indexOf('proxy=1') > 0) return true;
    if (location.search.indexOf('proxy=0') > 0) return false;
  }
  
  // Check localStorage
  try {
    const stored = localStorage.getItem('tweb_proxy_enabled');
    if (stored !== null) return stored === '1';
  } catch (e) {}
  
  // Default: FORCED enabled for restricted network environments
  return true;
}

function getProxyBaseUrl(): string {
  // Check URL parameter
  if (typeof location !== 'undefined') {
    const match = location.search.match(/proxyUrl=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  
  // Check localStorage
  try {
    const stored = localStorage.getItem('tweb_proxy_url');
    if (stored) return stored;
  } catch (e) {}
  
  // Default: same origin (assumes app is deployed on Cloudflare Pages)
  if (typeof location !== 'undefined') {
    return location.origin;
  }
  
  return '';
}

const ProxyConfig: ProxyConfig = {
  enabled: getProxyEnabled(),
  baseUrl: getProxyBaseUrl(),
  httpPath: '/api/mtproto',
  wsPath: '/api/ws'
};

// Helper functions to get full proxy URLs
export function getProxyHttpUrl(dcId: number, path: string): string {
  return `${ProxyConfig.baseUrl}${ProxyConfig.httpPath}/${dcId}/${path}`;
}

export function getProxyWsUrl(dcId: number, connectionType: string, premium?: boolean): string {
  const premiumSuffix = premium ? '&premium=1' : '';
  return `${ProxyConfig.baseUrl}${ProxyConfig.wsPath}?dc=${dcId}&type=${connectionType}${premiumSuffix}`;
}

// Allow runtime configuration
export function setProxyEnabled(enabled: boolean): void {
  ProxyConfig.enabled = enabled;
  try {
    localStorage.setItem('tweb_proxy_enabled', enabled ? '1' : '0');
  } catch (e) {}
}

export function setProxyBaseUrl(url: string): void {
  ProxyConfig.baseUrl = url;
  try {
    localStorage.setItem('tweb_proxy_url', url);
  } catch (e) {}
}

export default ProxyConfig;
