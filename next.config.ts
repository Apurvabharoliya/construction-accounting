import type { NextConfig } from "next";

// Validate required environment variables at startup
const requiredEnvVars = [
  { name: 'NVIDIA_API_KEY', description: 'AI-powered descriptions (get from build.nvidia.com)' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase project URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous key' },
]

for (const env of requiredEnvVars) {
  if (!process.env[env.name]) {
    console.warn(`⚠️  Missing ${env.name}: ${env.description}`)
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
