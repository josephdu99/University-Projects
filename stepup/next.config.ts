import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Studio and teacher sign-up carry a photo. The browser shrinks it to a
      // modest JPEG first and the server refuses anything over 2 MB; this
      // leaves room for that plus the form's other fields.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
