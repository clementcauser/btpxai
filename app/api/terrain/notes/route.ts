import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace } from "@/lib/workspaces"
import { getTerrainNotes, createTerrainNote } from "@/lib/terrain-notes"
import { env } from "@/lib/env"

const getSchema = z.object({
  project_id: z.string().uuid("project_id doit être un UUID valide"),
})

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = getSchema.safeParse({ project_id: searchParams.get("project_id") })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètre invalide", details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const notes = await getTerrainNotes(supabaseService, parsed.data.project_id)
    return NextResponse.json({ notes })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la récupération des notes" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const projectId = formData.get("project_id")
  const transcriptionRaw = formData.get("transcription")
  const audioFile = formData.get("audio")

  if (typeof projectId !== "string" || !z.string().uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "project_id invalide" }, { status: 422 })
  }

  let transcription: string | null = null
  let audioUrl: string | null = null

  if (typeof transcriptionRaw === "string" && transcriptionRaw.trim()) {
    transcription = transcriptionRaw.trim()
  } else if (audioFile instanceof File) {
    const fileName = `${projectId}/${crypto.randomUUID()}.webm`
    const arrayBuffer = await audioFile.arrayBuffer()
    const { error: uploadError } = await supabaseService.storage
      .from("terrain-audio")
      .upload(fileName, Buffer.from(arrayBuffer), { contentType: "audio/webm" })

    if (uploadError) {
      return NextResponse.json({ error: "Erreur upload audio" }, { status: 500 })
    }

    const { data: urlData } = supabaseService.storage
      .from("terrain-audio")
      .getPublicUrl(fileName)
    audioUrl = urlData.publicUrl

    try {
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
      const whisperFile = new File([Buffer.from(arrayBuffer)], "audio.webm", {
        type: "audio/webm",
      })
      const result = await openai.audio.transcriptions.create({
        file: whisperFile,
        model: "whisper-1",
        language: "fr",
      })
      transcription = result.text
    } catch {
      // Keep audio_url even if Whisper fails — bureau can still listen
      transcription = null
    }
  } else {
    return NextResponse.json(
      { error: "transcription ou audio requis" },
      { status: 422 }
    )
  }

  try {
    const { workspaceId } = await requireWorkspace(user.id)
    const note = await createTerrainNote(supabaseService, workspaceId, {
      project_id: projectId,
      user_id: user.id,
      transcription,
      audio_url: audioUrl,
    })
    return NextResponse.json({ note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la sauvegarde de la note" }, { status: 500 })
  }
}
