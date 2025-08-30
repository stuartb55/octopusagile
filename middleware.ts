import { NextRequest, NextResponse } from 'next/server';

export function middleware(_request: NextRequest) {
  // Generate a unique nonce for this request (Edge Runtime compatible)
  const nonce = crypto.getRandomValues(new Uint8Array(16))
    .reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  const base64Nonce = btoa(nonce);
  
  // Create response
  const response = NextResponse.next();
  
  // Set the nonce in headers so it's available in the app
  response.headers.set('x-nonce', base64Nonce);
  
  // Build CSP header with nonces
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const cspDirectives = [
    "default-src 'self'",
    isDevelopment 
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" 
      : `script-src 'self' 'nonce-${base64Nonce}'`,
    isDevelopment 
      ? "style-src 'self' 'unsafe-inline'" 
      : `style-src 'self' 'nonce-${base64Nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    isDevelopment
      ? "connect-src 'self' https://api.octopus.energy ws: wss:"
      : "connect-src 'self' https://api.octopus.energy",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'none'",
    "worker-src 'none'",
    "manifest-src 'self'"
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  if (isDevelopment) {
    response.headers.set('X-Development-Warning', 'This site is running in development mode with relaxed security policies');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};