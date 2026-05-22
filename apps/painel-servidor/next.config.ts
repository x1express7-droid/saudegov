import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pdfkit'],
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
