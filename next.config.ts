import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Desabilita o ESLint durante o build no Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Opcional: também desabilita verificação de TypeScript durante o build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
