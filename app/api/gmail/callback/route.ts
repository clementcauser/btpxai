import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/login`)
  }

  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error`
    )
  }

  const state = req.nextUrl.searchParams.get("state")
  const expectedState = req.cookies.get("gmail_oauth_state")?.value

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error`
    )
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error`
    )
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error`
    )
  }

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userInfoRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error`
    )
  }

  const userInfo = (await userInfoRes.json()) as { email: string }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const now = new Date().toISOString()

  await supabaseService.from("gmail_connections").delete().neq("id", "")

  await supabaseService.from("gmail_connections").insert({
    email: userInfo.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    created_at: now,
    updated_at: now,
  })

  const finalResponse = NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=connected`
  )
  finalResponse.cookies.delete("gmail_oauth_state")
  return finalResponse
}
