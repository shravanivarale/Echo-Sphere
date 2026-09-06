import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: rootDir,
  },
  // Prevent webpack from bundling these — they must run as native Node modules
  serverExternalPackages: ['pdfjs-dist', 'mammoth', 'pdf-parse'],
};

export default nextConfig;
