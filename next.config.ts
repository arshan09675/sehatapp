import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    // Doctor photos live in the public doctor-photos Storage bucket.
    remotePatterns: supabaseUrl
      ? [new URL("/storage/v1/object/public/**", supabaseUrl)]
      : [],
  },
  experimental: {
    serverActions: {
      // Default is 1 MB; doctor onboarding uploads a photo (≤ 2 MB) plus
      // form fields in one action request.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
