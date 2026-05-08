import { NextRequest, NextResponse } from "next/server"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { env } from "@/lib/env"

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ")

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  if (getUserRole(user) !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 })
  }

  let workspaceId: string
  try {
    const ws = await requireWorkspace(user.id)
    workspaceId = ws.workspaceId
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: "Workspace introuvable" }, { status: 400 })
    throw err
  }

  const label = req.nextUrl.searchParams.get("label") ?? "Boîte principale"
  const nonce = crypto.randomUUID()

  // state = nonce|workspaceId|label (séparé par | pour éviter les conflits base64)
  const state = Buffer.from(JSON.stringify({ nonce, workspaceId, label })).toString("base64url")

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  })

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
  response.cookies.set("gmail_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return response
}
