/**
 * DigiCode Compile Server Proxy Worker
 *
 * Features:
 * - Primary/Backup failover (Ubuntu -> Railway)
 * - CORS headers for browser requests
 * - Health check passthrough
 */

// Server configuration
const SERVERS = {
  primary: 'https://compile.digital-fab.jp',    // Ubuntu server via Cloudflare Tunnel
  backup: 'https://amiable-patience-production-1d47.up.railway.app'  // Railway backup
};

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://code.fablab-westharima.jp',
  'https://digicode-frontend.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000'
];

// CORS headers
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle CORS preflight
function handleOptions(request: Request): Response {
  const origin = request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Add CORS headers to response
function addCorsHeaders(response: Response, origin: string | null): Response {
  const newHeaders = new Headers(response.headers);
  const corsHeaders = getCorsHeaders(origin);

  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Forward request to target server
async function forwardRequest(request: Request, targetBase: string): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = targetBase + url.pathname + url.search;

  const headers = new Headers(request.headers);
  // Remove host header to avoid conflicts
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers: headers,
  };

  // Include body for POST/PUT requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(targetUrl, init);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Try primary server first
    try {
      console.log(`[Proxy] Trying primary server: ${SERVERS.primary}`);
      const response = await forwardRequest(request, SERVERS.primary);

      // If primary responds successfully, return with CORS headers
      if (response.ok || response.status < 500) {
        console.log(`[Proxy] Primary server responded: ${response.status}`);
        return addCorsHeaders(response, origin);
      }

      // Primary returned 5xx error, try backup
      console.log(`[Proxy] Primary server error: ${response.status}, trying backup...`);
    } catch (error) {
      // Primary server unreachable, try backup
      console.log(`[Proxy] Primary server unreachable: ${error}, trying backup...`);
    }

    // Failover to backup server
    try {
      console.log(`[Proxy] Trying backup server: ${SERVERS.backup}`);
      const response = await forwardRequest(request, SERVERS.backup);
      console.log(`[Proxy] Backup server responded: ${response.status}`);
      return addCorsHeaders(response, origin);
    } catch (error) {
      console.log(`[Proxy] Backup server also failed: ${error}`);

      // Both servers failed
      return new Response(
        JSON.stringify({
          success: false,
          error: 'All compile servers are unavailable',
          message: 'Both primary and backup servers failed to respond'
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }
  },
} satisfies ExportedHandler<Env>;
