import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.12", "localhost", "127.0.0.1"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
}

export default nextConfig;
