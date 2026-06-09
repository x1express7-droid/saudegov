import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, "../..");
loadEnvConfig(monorepoRoot, undefined, undefined, true);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pdfkit', 'nodemailer', '@saude/core-notifications'],
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      {
        source: '/saude/tfd/fila',
        destination: '/saude/tfd/processos',
        permanent: false,
      },
      {
        source: '/saude/tfd/configuracoes/saldos',
        destination: '/saude/tfd/saldos',
        permanent: true,
      },
      {
        source: '/saude/tfd/configuracoes/saldos/:path*',
        destination: '/saude/tfd/saldos/:path*',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/_storage/upload/:anexoId',
        destination: '/api/storage/upload/:anexoId?:query*',
      },
      {
        source: '/_storage/download/:anexoId',
        destination: '/api/storage/download-file/:anexoId?:query*',
      },
    ]
  },
};

export default nextConfig;
