import { supabaseService } from "@/lib/supabase/service"

export async function getAppSetting(key: string): Promise<string | null> {
  const { data } = await supabaseService
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single()
  return data?.value ?? null
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await supabaseService.from("app_settings").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  )
}

export async function getMultipleSettings(
  keys: string[]
): Promise<Record<string, string>> {
  const { data } = await supabaseService
    .from("app_settings")
    .select("key, value")
    .in("key", keys)

  const result: Record<string, string> = {}
  data?.forEach(({ key, value }) => {
    result[key] = value
  })
  return result
}
