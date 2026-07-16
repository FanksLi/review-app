/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['sql.js'],
  turbopack: {},
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  output: 'standalone',
};

export default nextConfig;
