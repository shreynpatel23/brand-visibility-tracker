import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better serverless function handling
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
  },

  // Optimize for serverless deployment
  output: "standalone",

  // Configure headers for better caching
  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
