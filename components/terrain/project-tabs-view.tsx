"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mic, Camera, Package, CheckSquare, AlertTriangle } from "lucide-react"
import type { ProjectWithClient } from "@/types"
import NotesTab from "./notes-tab"
import PhotosTab from "./photos-tab"
import MateriauxTab from "./materiaux-tab"
import AvancementTab from "./avancement-tab"
import ProblemeTab from "./probleme-tab"

type TabId = "notes" | "photos" | "materiaux" | "avancement" | "probleme"

type TabConfig = {
  id: TabId
  label: string
  short: string
  Icon: React.ElementType
  isAlert?: boolean
}

const TABS: TabConfig[] = [
  { id: "notes", label: "Notes vocales", short: "Notes", Icon: Mic },
  { id: "photos", label: "Photos", short: "Photos", Icon: Camera },
  { id: "materiaux", label: "Matériaux", short: "Mat.", Icon: Package },
  { id: "avancement", label: "Avancement", short: "Avance", Icon: CheckSquare },
  { id: "probleme", label: "Problème", short: "Alerte", Icon: AlertTriangle, isAlert: true },
]

const STATUS_DOT: Record<string, { color: string; pulse: boolean }> = {
  planned: { color: "oklch(0.5 0.008 258)", pulse: false },
  in_progress: { color: "oklch(0.69 0.168 47)", pulse: true },
  completed: { color: "oklch(0.62 0.12 150)", pulse: false },
  cancelled: { color: "oklch(0.62 0.22 25)", pulse: false },
}

export default function ProjectTabsView({
  project,
}: {
  project: ProjectWithClient
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>("notes")

  const dot = STATUS_DOT[project.status] ?? STATUS_DOT.planned

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="sticky top-0 z-10 border-b border-border"
        style={{ background: "oklch(0.105 0.008 258)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            aria-label="Retour aux chantiers"
            data-testid="back-button"
            className="flex items-center justify-center shrink-0 rounded-sm active:scale-95 transition-transform"
            style={{
              width: "44px",
              height: "44px",
              background: "oklch(0.23 0.012 258)",
              border: "1px solid oklch(0.29 0.012 258)",
            }}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex-1 min-w-0">
            <h1
              className="text-lg font-bold uppercase tracking-wide text-foreground truncate leading-tight"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              {project.title}
            </h1>
            {project.clients && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {project.clients.name}
              </p>
            )}
          </div>

          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{
              background: dot.color,
              animation: dot.pulse ? "forgePulse 2s ease infinite" : undefined,
            }}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto isolate" style={{ paddingBottom: "80px" }}>
        {activeTab === "notes" && <NotesTab projectId={project.id} />}
        {activeTab === "photos" && <PhotosTab projectId={project.id} />}
        {activeTab === "materiaux" && <MateriauxTab projectId={project.id} />}
        {activeTab === "avancement" && <AvancementTab projectId={project.id} />}
        {activeTab === "probleme" && <ProblemeTab projectId={project.id} />}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border"
        style={{ background: "oklch(0.105 0.008 258)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        data-testid="bottom-nav"
      >
        <div className="flex">
          {TABS.map(({ id, short, Icon, isAlert }) => {
            const isActive = activeTab === id
            const activeColor = isAlert
              ? "oklch(0.62 0.22 25)"
              : "oklch(0.69 0.168 47)"
            const inactiveColor = "oklch(0.45 0.008 258)"

            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                data-testid={`tab-${id}`}
                aria-label={short}
                aria-pressed={isActive}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
                style={{ minHeight: "64px", paddingTop: "10px", paddingBottom: "10px" }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: isActive ? activeColor : inactiveColor }}
                />
                <span
                  className="text-[9px] font-bold uppercase tracking-wider leading-none"
                  style={{
                    fontFamily: "var(--font-barlow)",
                    color: isActive ? activeColor : inactiveColor,
                  }}
                >
                  {short}
                </span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 rounded-full"
                    style={{ height: "2px", background: activeColor }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
