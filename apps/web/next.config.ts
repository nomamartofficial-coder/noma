import { loadPublicEnvironment } from '@noma/config/public';
import type { NextConfig } from 'next';

loadPublicEnvironment(process.env);

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
