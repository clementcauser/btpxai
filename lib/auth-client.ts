import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },
}

export async function signOut() {
  await supabase.auth.signOut()
}

export function useSession() {
  return supabase.auth.getSession()
}
