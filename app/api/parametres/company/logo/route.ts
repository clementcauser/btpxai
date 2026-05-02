import { NextResponse } from "next/server"
import { createClient, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace } from "@/lib/workspaces"
import { setAppSetting } from "@/lib/settings"

const BUCKET = "company-logos"
const FILE_KEY = "logo"

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = getUserRole(user)
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const form = await request.formData()
  const file = form.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "png"
  const path = `${FILE_KEY}.${ext}`

  const { error } = await supabaseService.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseService.storage
    .from(BUCKET)
    .getPublicUrl(path)

  const { workspaceId } = await requireWorkspace(user.id)
  await setAppSetting(workspaceId, "company_logo_url", publicUrl)

  return NextResponse.json({ url: publicUrl })
}
