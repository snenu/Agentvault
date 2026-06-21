import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root },
  serverExternalPackages: [
    "@terminal3/t3n-sdk",
    "@bytecodealliance/jco",
    "@bytecodealliance/preview2-shim",
  ],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
