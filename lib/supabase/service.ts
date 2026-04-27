import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { env } from "@/lib/env"

export const supabaseService = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
