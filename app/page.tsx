import { redirect } from "next/navigation";
import { getUser, getUserRole } from "@/lib/supabase/server";

export default async function RootPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (getUserRole(user) === "super_admin") {
    redirect("/superadmin/workspaces");
  }

  redirect("/dashboard");
}
