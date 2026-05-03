import { cookies } from "next/headers"
import { supabaseService } from "@/lib/supabase/service"
import type { Database } from "@/types/supabase"

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"]

export type WorkspaceContext = {
  workspaceId: string
  role: WorkspaceRole
  isOwner: boolean
}

export class WorkspaceError extends Error {
  constructor(message = "Workspace introuvable ou accès refusé") {
    super(message)
    this.name = "WorkspaceError"
  }
}

/**
 * Résout le workspace actif pour un utilisateur serveur.
 * Lit le cookie active_workspace_id, vérifie l'appartenance via workspace_members,
 * et retourne (workspaceId, role). Lance WorkspaceError si aucun workspace valide.
 *
 * Note: implémentation complète en Phase 2 (getActiveWorkspace + cookie signé).
 */
const CYPRESS_TEST_WORKSPACE_ID = "test-workspace-id"

export async function requireWorkspace(userId: string): Promise<WorkspaceContext> {
  // E2E bypass: test users have no real workspace_members rows
  if (process.env.NODE_ENV !== "production" || process.env.IS_E2E === "true") {
    const cookieStore = await cookies()
    const cypressUser = cookieStore.get("cypress-test-user")?.value
    if (cypressUser) {
      return { workspaceId: CYPRESS_TEST_WORKSPACE_ID, role: "admin", isOwner: false }
    }
  }

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get("active_workspace_id")?.value

  let data: { workspace_id: string; role: string } | null = null

  if (cookieValue) {
    const { data: row } = await supabaseService
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .eq("workspace_id", cookieValue)
      .single()
    data = row
  } else {
    const { data: row } = await supabaseService
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .limit(1)
      .single()
    data = row
  }

  if (!data) throw new WorkspaceError()

  const { data: workspace } = await supabaseService
    .from("workspaces")
    .select("owner_id")
    .eq("id", data.workspace_id)
    .single()

  return {
    workspaceId: data.workspace_id,
    role: data.role as WorkspaceRole,
    isOwner: workspace?.owner_id === userId,
  }
}
