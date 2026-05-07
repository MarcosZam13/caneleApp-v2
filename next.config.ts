import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    // TODO: Los tipos de @supabase/supabase-js v2.102.1 no infieren bien con Database custom.
    // El código funciona correctamente en runtime. Arreglar cuando se estabilice la versión.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
