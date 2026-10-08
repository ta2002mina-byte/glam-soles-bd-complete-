import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Explicit AVIF-first negotiation (Phase 11 performance polish)
    formats: ["image/avif", "image/webp"],

    remotePatterns: [
      {
        // Sample/demo product images (placehold.co)
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },

      {
        // Unsplash images
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },

      {
        // Testimonial avatar photos
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/**",
      },

      {
        // Matches any Supabase project's storage host
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },

      {
        // Signed URLs for the private "returns" bucket
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;