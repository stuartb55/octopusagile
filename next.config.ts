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
        : "script-src 'self' 'unsafe-hashes' 'sha256-7mu4H06fwDCjmnxxr/xNHyuQC6pLTHr4M2E4jXw5WZs=' 'sha256-QAlSewaQLi/NPCznjAZSyvQ72heD0VdxmNDDkZeCxgc=' 'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=' 'sha256-s5DOaPRZP9T8jHi4r9v9ac6W1EDGP5DlRkuljgFcC3A=' 'sha256-Fos4Q2eDccOVqoFVrRUQJtBu1Q9OCdrh/nwbb+0Pwkc=' 'sha256-e3C4FJJCwRrE3s7nM3YO38qVpga9j0AYmFBZnQjwIlA=' 'sha256-SDvJd2PAMIGZsqfs4z8Vq7JimYRsUJej4nhs1FuojOw=' 'sha256-8VjaS5Nx0HO8HZzKOARIB8uUZ4hoK0Wswopsrbunero=' 'sha256-x+en11sZ3s2uuNzKFjcQ6cBi2wmUmpnNJ2rICEPoSVc=' 'sha256-RdbcnVFK6zGoNMIwUyNFLOA6ctEW7uOjN9qkV3P7LY8=' 'sha256-WDHpdcgFbt9SLem1OykhTxDeRKtDkyPirDPzAOPtoYw=' 'sha256-P4p9HYtfg+w3NupQ1+ovBlYCtFG+tEOrHmOdw5SdkMQ=' 'sha256-qYlfT/FkwG9IjbyX1/8ik+FVSzQugKY5OlnmZpGKjb4=' 'sha256-xe0+FJIcYDj8l7VfqVPNFZ/yhtFcHHDDL7Nlf8xnWxY='",
      isDevelopment 
        ? "style-src 'self' 'unsafe-inline'" 
        : "style-src 'self' 'unsafe-hashes' 'sha256-R0edqj818Q2GSChz9Bmf7NmpeMlCeetyXy/3cImG5wo=' 'sha256-pGJbEgswt/KHNxfXfXJZmuzGVyXVnOErjEK3NA/r1hg='",
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
