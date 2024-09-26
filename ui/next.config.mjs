/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: `/pSearch`,
  assetPrefix: `/pSearch`,
  images: {
    remotePatterns: [
      {
        hostname: 's2.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
