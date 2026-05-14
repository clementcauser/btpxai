import { redirect } from "next/navigation";
import { getUser, getUserRole } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getOpenAlertesCount } from "@/lib/terrain-alertes";
import { requireWorkspace } from "@/lib/workspaces";
import { SidebarShell } from "@/components/layout/sidebar-shell";

type Role = "admin" | "bureau" | "ouvrier";

export default async function BureauLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (getUserRole(user) as Role) ?? "bureau";

  if (role !== "admin" && role !== "bureau") {
    redirect("/profil");
  }

  let alertBadge = 0;
  try {
    alertBadge = await getOpenAlertesCount(supabaseService);
  } catch {
    alertBadge = 0;
  }

  let workspaceName: string | null = null;
  let logoUrl: string | null = null;
  try {
    const { workspaceId } = await requireWorkspace(user.id);

    const { data: ws } = await supabaseService
      .from("workspaces")
      .select("name, workspace_settings(key, value)")
      .eq("id", workspaceId)
      .single();

    workspaceName = ws?.name ?? null;
    const logoSetting = (
      ws?.workspace_settings as { key: string; value: string }[] | null
    )?.find((s) => s.key === "company_logo_url");
    logoUrl = logoSetting?.value ?? null;
  } catch {}

  return (
    <SidebarShell
      email={user.email!}
      role={role}
      alertBadge={alertBadge}
      workspaceName={workspaceName}
      logoUrl={logoUrl}
    >
      {children}
    </SidebarShell>
  );
}
