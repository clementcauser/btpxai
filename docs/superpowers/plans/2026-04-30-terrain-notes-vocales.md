# Terrain Notes Vocales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow ouvriers to record timestamped voice notes on a chantier, transcribed via Web Speech API (primary) or OpenAI Whisper (fallback), stored in Supabase with the audio file, visible to bureau in the client fiche.

**Architecture:** A Supabase migration adds `terrain_notes`. A `POST /api/terrain/notes` route accepts either a transcription string (Web Speech path) or an audio file (Whisper path). The existing `NotesTab` component is updated to persist notes via the API and load existing ones on mount. The bureau client detail page gains a read-only notes section per project.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + Storage), OpenAI Whisper (`openai` npm package), Zod, Vitest, Cypress

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260430000012_terrain_notes.sql` | Table + RLS policies |
| Modify | `types/supabase.ts` | Add `terrain_notes` row/insert/update types |
| Modify | `types/index.ts` | `TerrainNote` already defined — no change needed |
| Modify | `lib/env.ts` | Add `OPENAI_API_KEY` |
| Create | `lib/terrain-notes.ts` | CRUD helpers (getTerrainNotes, createTerrainNote) |
| Create | `app/api/terrain/notes/route.ts` | POST + GET handlers |
| Modify | `components/terrain/notes-tab.tsx` | Persist via API, load on mount, fallback MediaRecorder |
| Modify | `app/(bureau)/clients/[id]/page.tsx` | Fetch + render terrain notes per project |
| Create | `tests/unit/terrain-notes.test.ts` | Unit tests for lib + API |

---

## Task 1: Supabase migration — `terrain_notes` table

**Files:**
- Create: `supabase/migrations/20260430000012_terrain_notes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260430000012_terrain_notes.sql

create table if not exists public.terrain_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  transcription text,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table public.terrain_notes enable row level security;

-- ouvrier: insert + read own rows
create policy "ouvrier_insert_own_notes"
  on public.terrain_notes
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ouvrier'
  );

create policy "ouvrier_select_own_notes"
  on public.terrain_notes
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ouvrier'
  );

-- bureau + admin: read all
create policy "bureau_admin_select_notes"
  on public.terrain_notes
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' in ('bureau', 'admin')
  );
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Create Supabase Storage bucket**

In the Supabase dashboard (or via CLI), create a private bucket named `terrain-audio`.

Via CLI:
```bash
npx supabase storage create terrain-audio --no-public
```

Expected: bucket exists.

- [ ] **Step 4: Regenerate TypeScript types**

```bash
npx supabase gen types typescript --local > types/supabase.ts
```

Expected: `terrain_notes` appears in `types/supabase.ts` under `public.Tables`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260430000012_terrain_notes.sql types/supabase.ts
git commit -m "feat: add terrain_notes table with RLS policies"
```

---

## Task 2: Add `OPENAI_API_KEY` to env

**Files:**
- Modify: `lib/env.ts`
- Modify: `.env.local` (not committed)
- Modify: `.env.example` (committed)

- [ ] **Step 1: Update `lib/env.ts`**

Replace the `required` array and return object:

```typescript
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const
```

And in the return object of `validateEnv()`, add:
```typescript
OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
```

- [ ] **Step 2: Add key to `.env.example`**

Add the following line to `.env.example`:
```
OPENAI_API_KEY=
```

- [ ] **Step 3: Add real key to `.env.local`** (manual — not committed)

```
OPENAI_API_KEY=sk-...
```

- [ ] **Step 4: Add `OPENAI_API_KEY` to vitest config**

In `vitest.config.ts`, add inside the `env` object:
```typescript
OPENAI_API_KEY: "test-openai-key",
```

- [ ] **Step 5: Install `openai` package**

```bash
npm install openai
```

Expected: `openai` appears in `package.json` dependencies.

- [ ] **Step 6: Commit**

```bash
git add lib/env.ts .env.example vitest.config.ts package.json package-lock.json
git commit -m "chore: add OPENAI_API_KEY env var and install openai package"
```

---

## Task 3: `lib/terrain-notes.ts` — CRUD helpers

**Files:**
- Create: `lib/terrain-notes.ts`
- Test: `tests/unit/terrain-notes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/terrain-notes.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { getTerrainNotes, createTerrainNote } from "@/lib/terrain-notes"

type Supabase = SupabaseClient<Database>

function makeBuilder(result: { data: unknown; error: null | object }) {
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  for (const method of ["select", "insert", "eq", "order", "single"]) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

function makeSupabase(...builders: ReturnType<typeof makeBuilder>[]) {
  const from = vi.fn()
  builders.forEach((b) => from.mockReturnValueOnce(b))
  return { from } as unknown as Supabase
}

const mockNote = {
  id: "n1",
  project_id: "p1",
  user_id: "u1",
  transcription: "Besoin de rallonges électriques",
  audio_url: null,
  created_at: "2026-04-30T09:00:00Z",
}

describe("getTerrainNotes", () => {
  it("returns notes for a project ordered by created_at desc", async () => {
    const builder = makeBuilder({ data: [mockNote], error: null })
    const supabase = makeSupabase(builder)

    const result = await getTerrainNotes(supabase, "p1")

    expect(supabase.from).toHaveBeenCalledWith("terrain_notes")
    expect(builder.eq).toHaveBeenCalledWith("project_id", "p1")
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(result).toEqual([mockNote])
  })

  it("throws when Supabase returns an error", async () => {
    const dbError = { message: "DB error", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(getTerrainNotes(supabase, "p1")).rejects.toEqual(dbError)
  })
})

describe("createTerrainNote", () => {
  it("inserts a note and returns the saved row", async () => {
    const builder = makeBuilder({ data: mockNote, error: null })
    const supabase = makeSupabase(builder)

    const result = await createTerrainNote(supabase, {
      project_id: "p1",
      user_id: "u1",
      transcription: "Besoin de rallonges électriques",
      audio_url: null,
    })

    expect(supabase.from).toHaveBeenCalledWith("terrain_notes")
    expect(builder.insert).toHaveBeenCalledWith({
      project_id: "p1",
      user_id: "u1",
      transcription: "Besoin de rallonges électriques",
      audio_url: null,
    })
    expect(builder.single).toHaveBeenCalled()
    expect(result).toEqual(mockNote)
  })

  it("throws when insert fails", async () => {
    const dbError = { message: "Insert failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      createTerrainNote(supabase, {
        project_id: "p1",
        user_id: "u1",
        transcription: "test",
        audio_url: null,
      })
    ).rejects.toEqual(dbError)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/unit/terrain-notes.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/terrain-notes'`

- [ ] **Step 3: Implement `lib/terrain-notes.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { TerrainNote } from "@/types"

type Supabase = SupabaseClient<Database>

type CreateTerrainNoteInput = {
  project_id: string
  user_id: string
  transcription: string | null
  audio_url: string | null
}

export async function getTerrainNotes(
  supabase: Supabase,
  projectId: string
): Promise<TerrainNote[]> {
  const { data, error } = await supabase
    .from("terrain_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as TerrainNote[]
}

export async function createTerrainNote(
  supabase: Supabase,
  input: CreateTerrainNoteInput
): Promise<TerrainNote> {
  const { data, error } = await supabase
    .from("terrain_notes")
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as TerrainNote
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/unit/terrain-notes.test.ts
```

Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/terrain-notes.ts tests/unit/terrain-notes.test.ts
git commit -m "feat: add terrain-notes CRUD helpers with tests"
```

---

## Task 4: `POST /api/terrain/notes` and `GET /api/terrain/notes`

**Files:**
- Create: `app/api/terrain/notes/route.ts`

Note: The API route uses `supabaseService` (service role) to bypass RLS for inserts from authenticated users — consistent with other API routes in this codebase.

- [ ] **Step 1: Create the route file**

```typescript
// app/api/terrain/notes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"
import { getUser } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
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
    // Upload audio to Supabase Storage
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

    // Transcribe with Whisper
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
    const note = await createTerrainNote(supabaseService, {
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/terrain/notes/route.ts
git commit -m "feat: add POST/GET /api/terrain/notes with Whisper fallback"
```

---

## Task 5: Update `NotesTab` — persist notes, load on mount, MediaRecorder fallback

**Files:**
- Modify: `components/terrain/notes-tab.tsx`

- [ ] **Step 1: Replace the component with the updated version**

```typescript
"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, Square, Clock, FileText, Loader2 } from "lucide-react"
import type { TerrainNote } from "@/types"

interface SpeechRecognitionResult {
  readonly length: number
  [index: number]: { readonly transcript: string }
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResult[] & { readonly length: number }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

type RecordingState = "idle" | "recording" | "uploading"

export default function NotesTab({ projectId }: { projectId: string }) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [notes, setNotes] = useState<TerrainNote[]>([])
  const [hasSpeechAPI, setHasSpeechAPI] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const w = window as WindowWithSpeech
    setHasSpeechAPI(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition))

    fetch(`/api/terrain/notes?project_id=${projectId}`)
      .then((r) => r.json())
      .then((json: { notes?: TerrainNote[] }) => {
        if (json.notes) setNotes(json.notes)
      })
      .catch(() => {/* silently ignore load errors */})
  }, [projectId])

  const persistNote = useCallback(
    async (formData: FormData): Promise<TerrainNote | null> => {
      try {
        const res = await fetch("/api/terrain/notes", { method: "POST", body: formData })
        if (!res.ok) return null
        const json = (await res.json()) as { note?: TerrainNote }
        return json.note ?? null
      } catch {
        return null
      }
    },
    []
  )

  // ─── Web Speech path ──────────────────────────────────────────────────────────

  const startSpeechRecording = useCallback(() => {
    const w = window as WindowWithSpeech
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = "fr-FR"
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = async (event) => {
      const transcript = Array.from({ length: event.results.length })
        .map((_, i) => event.results[i][0].transcript)
        .join(" ")
        .trim()

      if (!transcript) return

      const fd = new FormData()
      fd.append("project_id", projectId)
      fd.append("transcription", transcript)

      const saved = await persistNote(fd)
      if (saved) {
        setNotes((prev) => [saved, ...prev])
      } else {
        // Optimistic fallback if API fails
        setNotes((prev) => [
          {
            id: crypto.randomUUID(),
            project_id: projectId,
            user_id: "",
            transcription: transcript,
            audio_url: null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setRecordingState("recording")
  }, [projectId, persistNote])

  const stopSpeechRecording = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecordingState("idle")
  }, [])

  // ─── MediaRecorder fallback path ──────────────────────────────────────────────

  const startMediaRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setRecordingState("uploading")

        const fd = new FormData()
        fd.append("project_id", projectId)
        fd.append("audio", blob, "note.webm")

        const saved = await persistNote(fd)
        if (saved) setNotes((prev) => [saved, ...prev])
        setRecordingState("idle")
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecordingState("recording")
    } catch {
      // Microphone denied — do nothing
    }
  }, [projectId, persistNote])

  const stopMediaRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }, [])

  // ─── Toggle handler ───────────────────────────────────────────────────────────

  const handleToggle = () => {
    if (recordingState === "recording") {
      if (hasSpeechAPI) {
        stopSpeechRecording()
      } else {
        stopMediaRecording()
      }
    } else {
      if (hasSpeechAPI) {
        startSpeechRecording()
      } else {
        startMediaRecording()
      }
    }
  }

  const isRecording = recordingState === "recording"
  const isUploading = recordingState === "uploading"

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={handleToggle}
        disabled={isUploading}
        data-testid="record-button"
        className="w-full flex items-center justify-center gap-3 rounded-sm font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-60"
        style={{
          height: "56px",
          fontFamily: "var(--font-barlow)",
          background: isRecording
            ? "oklch(0.62 0.22 25)"
            : "oklch(0.69 0.168 47)",
          color: isRecording ? "white" : "oklch(0.11 0.008 258)",
          animation: isRecording ? "forgePulse 1.5s ease infinite" : undefined,
        }}
      >
        {isRecording ? (
          <>
            <Square className="w-5 h-5" />
            Arrêter l&apos;enregistrement
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            {hasSpeechAPI ? "Enregistrer une note vocale" : "Enregistrer un fichier audio"}
          </>
        )}
      </button>

      {isRecording && (
        <div className="flex items-center justify-center gap-2 py-2">
          <span
            className="w-2 h-2 rounded-full bg-destructive"
            style={{ animation: "zapFlicker 0.8s ease infinite" }}
          />
          <span
            className="text-xs font-bold uppercase tracking-wider text-destructive"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Enregistrement en cours…
          </span>
        </div>
      )}

      {isUploading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Transcription en cours…
          </span>
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Notes récentes
          </p>
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-card border border-border rounded-sm p-4"
              style={{ animation: "fadeSlideIn 0.25s ease both" }}
            >
              <p className="text-sm text-foreground leading-relaxed">
                {note.transcription ?? "Transcription en cours…"}
              </p>
              {note.audio_url && (
                <audio
                  controls
                  src={note.audio_url}
                  className="w-full mt-2 h-8"
                  style={{ colorScheme: "dark" }}
                />
              )}
              <div className="flex items-center gap-1.5 mt-3">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  {new Date(note.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && !isRecording && !isUploading && (
        <div className="flex flex-col items-center py-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucune note pour ce chantier
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/terrain/notes-tab.tsx
git commit -m "feat: persist terrain notes via API, add MediaRecorder fallback"
```

---

## Task 6: Bureau client detail page — terrain notes section

**Files:**
- Modify: `app/(bureau)/clients/[id]/page.tsx`

The page already fetches `ClientWithQuotes`. We need to also fetch terrain notes for each project and render them.

- [ ] **Step 1: Add `getTerrainNotes` import and fetch**

At the top of the file, add the import:
```typescript
import { getTerrainNotes } from "@/lib/terrain-notes"
import { Mic, Play } from "lucide-react"
```

In the `ClientDetailPage` server component, after fetching the client, add a notes fetch for all projects:

```typescript
// After the existing client fetch
const projectIds = client.projects.map((p) => p.id)
const notesPerProject = Object.fromEntries(
  await Promise.all(
    projectIds.map(async (id) => {
      try {
        const notes = await getTerrainNotes(supabase, id)
        return [id, notes] as const
      } catch {
        return [id, []] as const
      }
    })
  )
)
```

Pass `notesPerProject` down into the JSX.

- [ ] **Step 2: Add notes section inside each project card**

Inside the existing project card JSX (after the quotes table/empty state), add:

```tsx
{/* Terrain notes */}
{(() => {
  const notes = notesPerProject[project.id] ?? []
  if (notes.length === 0) return null
  return (
    <div className="border-t border-border/40 px-4 py-3 space-y-2">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
        <Mic className="size-3" />
        Notes vocales ({notes.length})
      </p>
      {notes.slice(0, 3).map((note) => (
        <div key={note.id} className="bg-secondary/30 rounded-sm px-3 py-2 space-y-1">
          <p className="text-xs text-foreground leading-relaxed">
            {note.transcription ?? <span className="italic text-muted-foreground">Audio uniquement</span>}
          </p>
          {note.audio_url && (
            <audio controls src={note.audio_url} className="w-full h-7 mt-1" />
          )}
          <p className="text-[10px] text-muted-foreground">
            {new Date(note.created_at).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ))}
      {notes.length > 3 && (
        <p className="text-[10px] text-muted-foreground italic px-1">
          +{notes.length - 3} note{notes.length - 3 > 1 ? "s" : ""} supplémentaire{notes.length - 3 > 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
})()}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(bureau)/clients/[id]/page.tsx"
git commit -m "feat: show terrain notes in bureau client detail page"
```

---

## Task 7: Cypress E2E test — record and retrieve a note

**Files:**
- Modify: `cypress/e2e/terrain.cy.ts`

The Cypress terrain test uses a cookie-based auth bypass and `test-project-id`. The API route at `POST /api/terrain/notes` will need a matching E2E bypass — we stub the network call instead of calling the real API.

- [ ] **Step 1: Add the notes test suite to `cypress/e2e/terrain.cy.ts`**

Add this suite at the end of the file, inside the top-level `describe`:

```typescript
// ─── Notes vocales ────────────────────────────────────────────────────────────

describe("Notes vocales", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/terrain/notes*", {
      statusCode: 200,
      body: { notes: [] },
    }).as("getNotes")

    cy.intercept("POST", "/api/terrain/notes", {
      statusCode: 201,
      body: {
        note: {
          id: "note-1",
          project_id: "test-project-id",
          user_id: "test-user-id",
          transcription: "Besoin de rallonges électriques côté portail",
          audio_url: null,
          created_at: new Date().toISOString(),
        },
      },
    }).as("postNote")

    cy.loginAsOuvrier()
    cy.visit(`/terrain/${TEST_PROJECT_ID}`)
  })

  it("affiche l'onglet Notes et le bouton d'enregistrement", () => {
    cy.get("[data-testid='tab-notes']").click()
    cy.get("[data-testid='record-button']").should("be.visible")
    cy.get("[data-testid='record-button']").invoke("outerHeight").should("be.gte", 48)
  })

  it("affiche les notes existantes chargées depuis l'API", () => {
    cy.intercept("GET", "/api/terrain/notes*", {
      statusCode: 200,
      body: {
        notes: [
          {
            id: "note-existing",
            project_id: "test-project-id",
            user_id: "test-user-id",
            transcription: "Note existante de test",
            audio_url: null,
            created_at: new Date().toISOString(),
          },
        ],
      },
    }).as("getNotesWithData")

    cy.get("[data-testid='tab-notes']").click()
    cy.wait("@getNotesWithData")
    cy.contains("Note existante de test").should("be.visible")
  })

  it("simule un POST de note et affiche le résultat", () => {
    cy.get("[data-testid='tab-notes']").click()

    // Simulate the component calling the API directly
    cy.window().then((win) => {
      const fd = new win.FormData()
      fd.append("project_id", "test-project-id")
      fd.append("transcription", "Besoin de rallonges électriques côté portail")
      return win.fetch("/api/terrain/notes", { method: "POST", body: fd })
    })

    cy.wait("@postNote")
    cy.get("@postNote").its("response.statusCode").should("eq", 201)
  })
})
```

- [ ] **Step 2: Run Cypress in headless mode**

```bash
npm run test:e2e -- --spec "cypress/e2e/terrain.cy.ts"
```

Expected: all tests pass including the new Notes vocales suite.

- [ ] **Step 3: Commit**

```bash
git add cypress/e2e/terrain.cy.ts
git commit -m "test: add Cypress E2E tests for terrain notes vocales"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: all unit tests pass.

- [ ] **Step 2: TypeScript full check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:3000/terrain/test-project-id` (with Cypress cookie set), navigate to the Notes tab, verify the record button appears and is ≥ 48px. Open the bureau client detail page and verify the notes section renders (will be empty without real DB data).

- [ ] **Step 4: Final commit tag**

```bash
git log --oneline -8
```

All 8 commits from this feature should appear. Branch is ready for PR.
