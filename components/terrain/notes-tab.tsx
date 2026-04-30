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
      .catch(() => {
        // silently ignore load errors
      })
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
          <FileText className="w-10 h-10 text-muted-foreground opacity-30 mb-3 pointer-events-none" />
          <p className="text-sm text-muted-foreground">
            Aucune note pour ce chantier
          </p>
        </div>
      )}
    </div>
  )
}
