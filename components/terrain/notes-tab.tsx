"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, Square, Clock, FileText } from "lucide-react"
import type { TerrainNote } from "@/types"

// Web Speech API types — not yet in all TypeScript lib.dom.d.ts versions
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

export default function NotesTab({ projectId }: { projectId: string }) {
  const [isRecording, setIsRecording] = useState(false)
  const [notes, setNotes] = useState<TerrainNote[]>([])
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const startRecording = useCallback(() => {
    const w = window as WindowWithSpeech
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = "fr-FR"
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length })
        .map((_, i) => event.results[i][0].transcript)
        .join(" ")
        .trim()

      if (transcript) {
        const note: TerrainNote = {
          id: crypto.randomUUID(),
          project_id: projectId,
          user_id: "",
          transcription: transcript,
          audio_url: null,
          created_at: new Date().toISOString(),
        }
        setNotes((prev) => [note, ...prev])
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }, [projectId])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
  }, [])

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={toggleRecording}
        data-testid="record-button"
        className="w-full flex items-center justify-center gap-3 rounded-sm font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
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
            Enregistrer une note vocale
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

      {notes.length === 0 && !isRecording && (
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
