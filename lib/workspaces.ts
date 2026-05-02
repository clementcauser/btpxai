import { cookies } from "next/headers"
import { supabaseService } from "@/lib/supabase/service"
import type { Database } from "@/types/supabase"

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"]

export type WorkspaceContext = {
  workspaceId: string
  role: WorkspaceRole
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
export async function requireWorkspace(userId: string): Promise<WorkspaceContext> {
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

  return { workspaceId: data.workspace_id, role: data.role as WorkspaceRole }
}
