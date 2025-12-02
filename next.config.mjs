/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Removed ignoreBuildErrors to ensure type safety
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Performance optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig
