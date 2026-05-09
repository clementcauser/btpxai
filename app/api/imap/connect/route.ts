import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"
import { supabaseService } from "@/lib/supabase/service"
import { detectProvider, fetchIspdbConfig } from "@/lib/email-providers"
import { ImapClient } from "@/lib/imap"
import { encryptPassword } from "@/lib/crypto"

const detectSchema = z.object({
  step: z.literal("detect"),
  email: z.string().email(),
})

const saveSchema = z.object({
  step: z.literal("save"),
  email: z.string().email(),
  password: z.string().min(1),
  label: z.string().min(1).default("Boîte principale"),
  imap_host: z.string().min(1),
  imap_port: z.number().int().min(1).max(65535),
  imap_secure: z.boolean(),
  smtp_host: z.string().min(1),
  smtp_port: z.number().int().min(1).max(65535),
  smtp_secure: z.boolean(),
})

const bodySchema = z.discriminatedUnion("step", [detectSchema, saveSchema])

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ])
}

export async function POST(req: NextRequest) {
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 422 })
  }

  if (parsed.data.step === "detect") {
    const config =
      detectProvider(parsed.data.email) ??
      (await fetchIspdbConfig(parsed.data.email).catch(() => null))
    return NextResponse.json({ config })
  }

  // step === "save"
  const d = parsed.data

  try {
    await withTimeout(
      ImapClient.testConnection({
        imap_host: d.imap_host,
        imap_port: d.imap_port,
        imap_secure: d.imap_secure,
        smtp_host: d.smtp_host,
        smtp_port: d.smtp_port,
        smtp_secure: d.smtp_secure,
        username: d.email,
        password: d.password,
      }),
      12000,
      "Délai de connexion dépassé"
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue"
    return NextResponse.json({ error: `Connexion impossible : ${msg}` }, { status: 422 })
  }

  const passwordEncrypted = encryptPassword(d.password)

  const { data: conn, error } = await (supabaseService as any)
    .from("imap_connections")
    .insert({
      workspace_id: workspaceId,
      email: d.email,
      label: d.label,
      imap_host: d.imap_host,
      imap_port: d.imap_port,
      imap_secure: d.imap_secure,
      smtp_host: d.smtp_host,
      smtp_port: d.smtp_port,
      smtp_secure: d.smtp_secure,
      username: d.email,
      password_encrypted: passwordEncrypted,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Erreur insertion imap_connections:", error)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
  }

  return NextResponse.json({ success: true, connectionId: conn.id })
}
