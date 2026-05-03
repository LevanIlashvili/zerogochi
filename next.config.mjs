/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a self-contained .next/standalone tree we can
  // copy into a slim runtime image (no node_modules at runtime).
  output: 'standalone',
};

export default nextConfig;
