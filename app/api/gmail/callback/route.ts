import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"

type OAuthState = {
  nonce: string
  workspaceId: string
  label: string
}

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/login`)
  }

  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")
  const stateParam = req.nextUrl.searchParams.get("state")

  if (error || !code || !stateParam) {
    console.error('[gmail/callback] Missing params — error:', error, 'code:', !!code, 'state:', !!stateParam)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error&reason=params`)
  }

  let state: OAuthState
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8")) as OAuthState
  } catch (e) {
    console.error('[gmail/callback] State decoding failed:', e)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error&reason=state`)
  }

  const expectedNonce = req.cookies.get("gmail_oauth_nonce")?.value
  if (!state.nonce || !expectedNonce || state.nonce !== expectedNonce) {
    console.error('[gmail/callback] Nonce mismatch — expected:', expectedNonce, 'got:', state.nonce)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error&reason=nonce`)
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
    const body = await tokenRes.text()
    console.error('[gmail/callback] Token exchange failed:', tokenRes.status, body)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error&reason=token_exchange`)
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  if (!tokens.refresh_token) {
    console.error('[gmail/callback] No refresh_token in response (user may have already granted access)')
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error&reason=no_refresh_token`)
  }

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userInfoRes.ok) {
    console.error('[gmail/callback] Userinfo fetch failed:', userInfoRes.status)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error&reason=userinfo`)
  }

  const userInfo = (await userInfoRes.json()) as { email: string }
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabaseService.from("gmail_connections") as any).insert({
    email: userInfo.email,
    label: state.label,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    workspace_id: state.workspaceId,
    created_at: now,
    updated_at: now,
  })

  if (insertError) {
    console.error('[gmail/callback] Insert failed:', insertError)
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error&reason=db_insert`)
  }

  const finalResponse = NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=connected`
  )
  finalResponse.cookies.delete("gmail_oauth_nonce")
  return finalResponse
}
