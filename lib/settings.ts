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

export type CompanyInfo = {
  name: string
  address: string
  phone: string
  email: string
  siret: string
  tva: string
}

const COMPANY_KEYS = [
  "company_name",
  "company_address",
  "company_phone",
  "company_email",
  "company_siret",
  "company_tva",
] as const

export async function getCompanyInfo(workspaceId: string): Promise<CompanyInfo> {
  const s = await getMultipleSettings(workspaceId, [...COMPANY_KEYS])
  return {
    name: s.company_name ?? "",
    address: s.company_address ?? "",
    phone: s.company_phone ?? "",
    email: s.company_email ?? "",
    siret: s.company_siret ?? "",
    tva: s.company_tva ?? "",
  }
}
