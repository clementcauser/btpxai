const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NODE_ENCRYPTION_KEY",
  "SEED_SUPERADMIN_EMAIL",
  "SEED_SUPERADMIN_PASSWORD",
  "SEED_SUPERADMIN_NAME",
] as const;

function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nCopy .env.example to .env.local and fill in the values.`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    NODE_ENCRYPTION_KEY: process.env.NODE_ENCRYPTION_KEY!,
    SEED_SUPERADMIN_EMAIL: process.env.SEED_SUPERADMIN_EMAIL!,
    SEED_SUPERADMIN_PASSWORD: process.env.SEED_SUPERADMIN_PASSWORD!,
    SEED_SUPERADMIN_NAME: process.env.SEED_SUPERADMIN_NAME!,
  };
}

export const env = validateEnv();
