import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  FolderOpen,
  ExternalLink,
  Mic,
  Camera,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getClientWithQuotes } from "@/lib/clients"
import { getTerrainNotes } from "@/lib/terrain-notes"
import { getTerrainPhotos } from "@/lib/terrain-photos"
import type { TerrainNote, TerrainPhoto } from "@/types"
import { buttonVariants } from "@/components/ui/button"
import { ClientDetailActions } from "@/components/clients/client-detail-actions"
import ProjectStepsManager from "@/components/bureau/project-steps-manager"
import { cn } from "@/lib/utils"
import type { QuoteStatus } from "@/types"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  try {
    const client = await getClientWithQuotes(supabase, id)
    return { title: `${client.name} — BTP×AI` }
  } catch {
    return { title: "Client — BTP×AI" }
  }
}

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: "Brouillon",
    className: "bg-muted/60 text-muted-foreground border-border/80",
    dot: "bg-muted-foreground",
  },
  sent: {
    label: "Envoyé",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  accepted: {
    label: "Accepté",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  rejected: {
    label: "Refusé",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
  expired: {
    label: "Expiré",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    dot: "bg-slate-500",
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatAmount(ht: number, tva: number) {
  const ttc = ht * (1 + tva / 100)
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(ttc)
}

function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const client = await getClientWithQuotes(supabase, id).catch(() => notFound())

  const [notesPerProject, photosPerProject] = await Promise.all([
    Object.fromEntries(
      await Promise.all(
        client.projects.map(async (p) => {
          try {
            const notes = await getTerrainNotes(supabase, p.id)
            return [p.id, notes] as const
          } catch {
            return [p.id, [] as TerrainNote[]] as const
          }
        })
      )
    ) as Record<string, TerrainNote[]>,
    Object.fromEntries(
      await Promise.all(
        client.projects.map(async (p) => {
          try {
            const photos = await getTerrainPhotos(supabase, p.id)
            return [p.id, photos] as const
          } catch {
            return [p.id, [] as TerrainPhoto[]] as const
          }
        })
      )
    ) as Record<string, TerrainPhoto[]>,
  ])

  const allQuotes = client.projects.flatMap((p) =>
    p.quotes.map((q) => ({ ...q, projectTitle: p.title, projectId: p.id }))
  )

  const totalQuotes = allQuotes.length
  const acceptedQuotes = allQuotes.filter((q) => q.status === "accepted")
  const totalRevenue = acceptedQuotes.reduce(
    (sum, q) => sum + (q.total_ht ?? 0) * (1 + (q.tva_rate ?? 20) / 100),
    0
  )

  return (
    <div className="space-y-8">
      {/* Back */}
      <div>
        <Link
          href="/clients"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-8"
          )}
        >
          <ChevronLeft className="size-3.5" />
          Retour aux clients
        </Link>
      </div>

      {/* Client header card */}
      <div className="relative rounded-sm border border-border bg-card overflow-hidden">
        {/* Amber top strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.69 0.168 47) 1px, transparent 1px), linear-gradient(90deg, oklch(0.69 0.168 47) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-6 flex-wrap">
            {/* Monogram */}
            <div className="size-20 rounded-sm bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-primary font-heading font-700 text-3xl leading-none tracking-wider">
                {clientInitials(client.name)}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground tracking-wider uppercase">
                  Fiche client
                </span>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-700 tracking-wide uppercase text-foreground truncate mb-3">
                {client.name}
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary/60 shrink-0" />
                    <a
                      href={`mailto:${client.email}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {client.email}
                    </a>
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary/60 shrink-0" />
                    {client.phone}
                  </span>
                )}
                {client.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary/60 shrink-0" />
                    {client.address}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary/60 shrink-0" />
                  Client depuis le {formatDate(client.created_at)}
                </span>
              </div>
            </div>

            {/* Actions (client component for edit/delete) */}
            <ClientDetailActions client={client} />
          </div>

          {/* Stats strip */}
          <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-0.5">
                Projets
              </p>
              <p className="font-heading text-2xl font-700 text-foreground">
                {client.projects.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-0.5">
                Devis
              </p>
              <p className="font-heading text-2xl font-700 text-foreground">
                {totalQuotes}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-0.5">
                CA (TTC)
              </p>
              <p className="font-heading text-2xl font-700 text-primary">
                {totalRevenue > 0
                  ? new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(totalRevenue)
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects & Quotes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Projets & devis
          </span>
        </div>

        {client.projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border border-dashed border-border rounded-sm">
            <FolderOpen className="size-7 opacity-30" />
            <p className="text-sm">Aucun projet pour ce client</p>
          </div>
        ) : (
          <div className="space-y-3">
            {client.projects.map((project) => (
              <div
                key={project.id}
                className="rounded-sm border border-border bg-card overflow-hidden"
              >
                {/* Project header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-secondary/20">
                  <FolderOpen className="size-3.5 text-primary/60 shrink-0" />
                  <span className="font-medium text-sm text-foreground flex-1 truncate">
                    {project.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(project.created_at)}
                  </span>
                </div>

                {/* Quotes for this project */}
                {project.quotes.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-muted-foreground/50 italic">
                    Aucun devis pour ce projet
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wider uppercase">
                          Référence
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wider uppercase hidden sm:table-cell">
                          Date
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wider uppercase">
                          Statut
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wider uppercase">
                          Montant TTC
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {project.quotes.map((quote) => {
                        const cfg = STATUS_CONFIG[quote.status as QuoteStatus]
                        return (
                          <tr
                            key={quote.id}
                            className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="size-3 text-muted-foreground/40 shrink-0" />
                                <span className="font-mono text-xs text-muted-foreground">
                                  {quote.reference ?? `DEV-${quote.id.slice(0, 6).toUpperCase()}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(quote.created_at)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-sm border",
                                  cfg.className
                                )}
                              >
                                <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-xs text-foreground tabular-nums">
                                {quote.total_ht != null
                                  ? formatAmount(quote.total_ht, quote.tva_rate ?? 20)
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-2 py-3">
                              <Link
                                href={`/devis/${quote.id}/preview`}
                                className="p-1.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors inline-flex"
                                title="Voir le devis"
                              >
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

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
                            {note.transcription ?? (
                              <span className="italic text-muted-foreground">Audio uniquement</span>
                            )}
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

                {/* Terrain photos */}
                {(() => {
                  const photos = photosPerProject[project.id] ?? []
                  if (photos.length === 0) return null
                  return (
                    <div className="border-t border-border/40 px-4 py-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
                        <Camera className="size-3" />
                        Photos chantier ({photos.length})
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {photos.slice(0, 8).map((photo) => (
                          <a
                            key={photo.id}
                            href={photo.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square rounded-sm overflow-hidden bg-muted border border-border/60 block"
                            title={new Date(photo.created_at).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.photo_url}
                              alt={`Photo du ${new Date(photo.created_at).toLocaleDateString("fr-FR")}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {photo.lat && photo.lng && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/60 rounded-sm p-0.5">
                                <MapPin className="size-2 text-white/80" />
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </a>
                        ))}
                      </div>
                      {photos.length > 8 && (
                        <p className="text-[10px] text-muted-foreground italic px-1">
                          +{photos.length - 8} photo{photos.length - 8 > 1 ? "s" : ""} supplémentaire{photos.length - 8 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* Project steps check-list */}
                <ProjectStepsManager projectId={project.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
