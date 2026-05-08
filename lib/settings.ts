import { supabaseService } from "@/lib/supabase/service";

export async function getAppSetting(
  workspaceId: string,
  key: string
): Promise<string | null> {
  const { data } = await supabaseService
    .from("workspace_settings")
    .select("value")
    .eq("workspace_id", workspaceId)
    .eq("key", key)
    .single();
  return data?.value ?? null;
}

export async function setAppSetting(
  workspaceId: string,
  key: string,
  value: string
): Promise<void> {
  await supabaseService
    .from("workspace_settings")
    .upsert(
      {
        workspace_id: workspaceId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,key" }
    );
}

export async function getMultipleSettings(
  workspaceId: string,
  keys: string[]
): Promise<Record<string, string>> {
  const { data } = await supabaseService
    .from("workspace_settings")
    .select("key, value")
    .eq("workspace_id", workspaceId)
    .in("key", keys);

  const result: Record<string, string> = {};
  data?.forEach(({ key, value }) => {
    result[key] = value;
  });

  return result;
}
