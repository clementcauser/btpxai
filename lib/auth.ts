import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"
import { env } from "@/lib/env"

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin({ defaultRole: "ouvrier", adminRoles: ["admin"] }),
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
