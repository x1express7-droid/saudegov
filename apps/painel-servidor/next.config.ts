import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/_storage/upload/:anexoId',
        destination: '/api/storage/upload/:anexoId',
      },
      {
        source: '/_storage/download/:anexoId',
        destination: '/api/storage/download-file/:anexoId',
      },
    ]
  },
};

export default nextConfig;
