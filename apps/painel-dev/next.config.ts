import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, "../..");
loadEnvConfig(monorepoRoot, undefined, undefined, true);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
