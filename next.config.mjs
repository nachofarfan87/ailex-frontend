import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend URL: en producción usar BACKEND_URL env var, en dev local usa localhost:8000
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${BACKEND}/health`,
      },
    ]
  },
};

export default nextConfig;
