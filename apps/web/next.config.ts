import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/shared'],
  experimental: {
    // Enable Turbopack for dev
  },
};

export default nextConfig;
