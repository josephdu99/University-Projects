import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Studio and teacher sign-up carry a photo (the server refuses anything
      // over 2 MB), and a studio can upload its terms as a PDF (up to 5 MB).
      // This leaves room for the largest of those plus the form's fields.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
