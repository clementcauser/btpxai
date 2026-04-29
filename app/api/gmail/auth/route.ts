import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ")

function requireBureauOrAdmin(role?: string) {
  return role === "admin" || role === "bureau"
}

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!requireBureauOrAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}

export async function DELETE(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!requireBureauOrAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { data: conn } = await supabaseService
    .from("gmail_connections")
    .select("access_token")
    .limit(1)
    .single()

  if (conn?.access_token) {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${conn.access_token}`,
      { method: "POST" }
    ).catch(() => null)
  }

  await supabaseService.from("gmail_connections").delete().neq("id", "")

  return NextResponse.json({ success: true })
}
