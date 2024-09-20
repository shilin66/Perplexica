/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: `/${process.env.BASE_PATH}`,
  assetPrefix: `/${process.env.BASE_PATH}`,
  images: {
    remotePatterns: [
      {
        hostname: 's2.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
