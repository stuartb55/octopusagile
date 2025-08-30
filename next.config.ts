import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - process is available in Node.js environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // More permissive CSP for development, strict for production
    const cspDirectives = [
      "default-src 'self'",
      isDevelopment 
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" 
        : "script-src 'self'",
      isDevelopment 
        ? "style-src 'self' 'unsafe-inline'" 
        : "style-src 'self'",
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

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          // Add security reminder header for development
          ...(isDevelopment ? [{
            key: 'X-Development-Warning',
            value: 'This site is running in development mode with relaxed security policies'
          }] : [])
        ]
      }
    ];
  }
};

export default nextConfig;
