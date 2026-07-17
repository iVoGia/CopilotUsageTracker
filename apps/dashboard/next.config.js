/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@ghc/shared'],
};

module.exports = nextConfig;
