import { redirect } from "next/navigation";
import { getUser, getUserRole } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getOpenAlertesCount } from "@/lib/terrain-alertes";
import { requireWorkspace } from "@/lib/workspaces";
import { AppSidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";

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

    console.log({ ws });

    workspaceName = ws?.name ?? null;
    const logoSetting = (
      ws?.workspace_settings as { key: string; value: string }[] | null
    )?.find((s) => s.key === "company_logo_url");
    logoUrl = logoSetting?.value ?? null;
  } catch {}

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          email={user.email!}
          role={role}
          alertBadge={alertBadge}
          workspaceName={workspaceName}
          logoUrl={logoUrl}
        />
      </div>

      {/* Mobile header + drawer */}
      <MobileHeader
        email={user.email!}
        role={role}
        alertBadge={alertBadge}
        workspaceName={workspaceName}
        logoUrl={logoUrl}
      />

      {/* Main content */}
      <main className="lg:pl-56 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
