/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript — Next compiles them in-place.
  transpilePackages: ['@divemap/ui', '@divemap/db', '@divemap/deco-engine'],
}

export default nextConfig
