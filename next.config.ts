import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t.contentsquare.net https://*.hotjar.com https://web-sdk.smartlook.com; connect-src 'self' https://t.contentsquare.net https://*.hotjar.com https://*.contentsquare.net https://rec.smartlook.com wss://*.hotjar.com wss://rec.smartlook.com;",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
