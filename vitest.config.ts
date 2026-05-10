import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["node_modules", ".next", "cypress/**"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      ANTHROPIC_API_KEY: "test-anthropic-key",
      OPENAI_API_KEY: "test-openai-key",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      RESEND_API_KEY: "test-resend-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NODE_ENCRYPTION_KEY: "aeeff606779133747037cb8cd4e064ff4df29cdff839414a7968e552b93ccd60",
      SEED_SUPERADMIN_EMAIL: "test-superadmin@example.com",
      SEED_SUPERADMIN_PASSWORD: "test-password",
      SEED_SUPERADMIN_NAME: "Test Superadmin",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
