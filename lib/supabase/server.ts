import { supabaseService } from "@/lib/supabase/service"

// Better-Auth handles authentication independently of Supabase Auth.
// The cookie-based SSR client would always be anonymous here, so we delegate
// to the service role client for all server-side operations.
// Routes must be protected by Better-Auth middleware before reaching this client.
export async function createClient() {
  return supabaseService
}
