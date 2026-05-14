import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  CheckSquare,
  Users,
  Mic,
  Camera,
  ExternalLink,
  MapPin,
  Calendar,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getProjectWithDetails, computeProjectTotal } from "@/lib/projects";
import { PROJECT_STATUS_CONFIG } from "@/lib/project-status";
import { buttonVariants } from "@/components/ui/button";
import { ProjectEditSheet } from "@/components/projets/project-edit-sheet";
import { ProjectStatusBadge } from "@/components/projets/project-status-badge";
import { ProjectMembersDialog } from "@/components/projets/project-members-dialog";
import { AddTasksDialog } from "@/components/projets/add-tasks-dialog";
import ProjectStepsManager from "@/components/bureau/project-steps-manager";
import { cn } from "@/lib/utils";
import type { QuoteStatus, ProjectStatus, TaskStatus } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  try {
    const project = await getProjectWithDetails(supabase, id);
    return { title: `${project.title} — BTP×AI` };
  } catch {
    return { title: "Projet — BTP×AI" };
  }
}

const QUOTE_STATUS_CONFIG: Record<
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
};

const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  todo: {
    label: "À faire",
    className: "bg-muted/60 text-muted-foreground border-border/80",
  },
  in_progress: {
    label: "En cours",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  done: {
    label: "Terminé",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  blocked: {
    label: "Bloqué",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(ht: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(ht);
}

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="size-4 text-primary/70 shrink-0" />
      <h2 className="font-heading text-base font-700 tracking-wide uppercase text-foreground">
        {title}
      </h2>
      {count !== undefined && (
        <span className="ml-1 text-xs text-muted-foreground tabular-nums">
          ({count})
        </span>
      )}
    </div>
  );
}

export default async function ProjetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const project = await getProjectWithDetails(supabase, id).catch(() =>
    notFound()
  );
  const { data: rawWorkspaceMembers } = await supabaseService
    .from("workspace_members")
    .select("id, user_id, workspace_id, role, created_at")
    .eq("workspace_id", project.workspace_id);

  const allUserIds = [
    ...new Set([
      ...(rawWorkspaceMembers ?? []).map((m) => m.user_id),
      ...project.project_members.map((m) => m.user_id as string),
    ]),
  ];

  const authUsers = allUserIds.length
    ? await Promise.all(
        allUserIds.map((uid) =>
          supabaseService.auth.admin.getUserById(uid).then(({ data }) => data?.user ?? null)
        )
      )
    : [];

  const usersById = Object.fromEntries(
    authUsers.filter(Boolean).map((u) => [
      u!.id,
      { id: u!.id, name: u!.user_metadata?.name ?? u!.email ?? "", email: u!.email ?? "", image: u!.user_metadata?.image ?? null },
    ])
  );

  const workspaceMembers = (rawWorkspaceMembers ?? []).map((m) => ({
    ...m,
    user: usersById[m.user_id] ?? null,
  }));

  const projectMembersWithUser = project.project_members.map((m) => ({
    ...m,
    user: usersById[m.user_id as string] ?? null,
  }));

  const cfg = PROJECT_STATUS_CONFIG[project.status as ProjectStatus];
  const totalHT = computeProjectTotal(project.quotes);
  const acceptedQuotes = project.quotes.filter((q) => q.status === "accepted");
  const totalAcceptedHT = acceptedQuotes.reduce(
    (s, q) => s + (q.total_ht ?? 0),
    0
  );
  const doneTasks = project.tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-8">
      {/* Back */}
      <div>
        <Link
          href="/projets"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-8"
          )}
        >
          <ChevronLeft className="size-3.5" />
          Retour aux projets
        </Link>
      </div>

      {/* Project header card */}
      <div className="relative rounded-sm border border-border bg-card overflow-hidden">
        {/* Status-colored strip */}
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(to right, ${cfg.stripColor}60, ${cfg.stripColor}, ${cfg.stripColor}60)`,
          }}
        />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${cfg.stripColor} 1px, transparent 1px), linear-gradient(90deg, ${cfg.stripColor} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Status indicator block */}
            <div
              className="size-16 rounded-sm flex items-center justify-center shrink-0 border"
              style={{
                background: `${cfg.stripColor}18`,
                borderColor: `${cfg.stripColor}40`,
              }}
            >
              <div
                className="size-3 rounded-full"
                style={{ background: cfg.stripColor }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs text-muted-foreground tracking-wider uppercase">
                  Projet
                </span>
                <ProjectStatusBadge
                  projectId={project.id}
                  initialStatus={project.status as ProjectStatus}
                />
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-700 tracking-wide uppercase text-foreground mb-3">
                {project.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {project.client && (
                  <Link
                    href={`/clients/${project.client.id}`}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Users className="size-3.5 text-primary/60 shrink-0" />
                    {project.client.name}
                  </Link>
                )}
                {project.description && (
                  <span className="text-muted-foreground">
                    {project.description}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary/60 shrink-0" />
                  Créé le {formatDate(project.created_at)}
                </span>
              </div>
            </div>
            <ProjectEditSheet
              projectId={project.id}
              initialTitle={project.title}
              initialDescription={project.description ?? null}
              initialStatus={project.status as ProjectStatus}
            />
          </div>

          {/* Stats */}
          <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-0.5">
                Devis
              </p>
              <p className="font-heading text-2xl font-700 text-foreground">
                {project.quotes.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-0.5">
                Montant total HT
              </p>
              <p className="font-heading text-2xl font-700 text-foreground">
                {totalHT > 0 ? formatAmount(totalHT) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-0.5">
                Tâches
              </p>
              <p className="font-heading text-2xl font-700 text-foreground">
                {doneTasks}
                <span className="text-muted-foreground text-base font-normal">
                  /{project.tasks.length}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-0.5">
                Membres
              </p>
              <p className="font-heading text-2xl font-700 text-foreground">
                {projectMembersWithUser.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <section className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary/70 shrink-0" />
            <h2 className="font-heading text-base font-700 tracking-wide uppercase text-foreground">
              Membres
            </h2>
            <span className="ml-1 text-xs text-muted-foreground tabular-nums">
              ({projectMembersWithUser.length})
            </span>
          </div>
          <ProjectMembersDialog
            projectId={project.id}
            members={projectMembersWithUser}
            workspaceMembers={workspaceMembers}
          />
        </div>
        {projectMembersWithUser.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun membre assigné à ce projet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projectMembersWithUser.map((member) => {
              const name = member.user?.name ?? "Utilisateur";
              return (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-muted/40 border border-border text-muted-foreground"
                >
                  <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                    {userInitials(name)}
                  </span>
                  {name}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Devis */}
      <section className="rounded-sm border border-border bg-card p-6">
        <SectionHeader
          icon={FileText}
          title="Devis"
          count={project.quotes.length}
        />
        {project.quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun devis pour ce projet.
          </p>
        ) : (
          <div className="rounded-sm border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
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
                    Montant HT
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {project.quotes.map((quote) => {
                  const qcfg = QUOTE_STATUS_CONFIG[quote.status as QuoteStatus];
                  return (
                    <tr key={quote.id} className="group">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {quote.reference ?? (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {formatDate(quote.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                            qcfg.className
                          )}
                        >
                          <span
                            className={cn("size-1.5 rounded-full", qcfg.dot)}
                          />
                          {qcfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {quote.total_ht != null
                          ? formatAmount(quote.total_ht)
                          : "—"}
                      </td>
                      <td className="pr-3 py-3">
                        <Link
                          href={`/devis/${quote.id}`}
                          className="text-muted-foreground/40 hover:text-primary transition-colors"
                          title="Voir le devis"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {project.quotes.length > 1 && totalHT > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td
                      colSpan={3}
                      className="px-4 py-2.5 text-xs text-muted-foreground"
                    >
                      {acceptedQuotes.length > 0 && (
                        <span>
                          Accepté :{" "}
                          <span className="text-emerald-400 font-medium">
                            {formatAmount(totalAcceptedHT)}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-medium text-foreground">
                      {formatAmount(totalHT)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>

      {/* Tasks */}
      <section className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-primary/70 shrink-0" />
            <h2 className="font-heading text-base font-700 tracking-wide uppercase text-foreground">
              Tâches
            </h2>
            <span className="ml-1 text-xs text-muted-foreground tabular-nums">
              ({project.tasks.length})
            </span>
          </div>
          <AddTasksDialog projectId={project.id} />
        </div>
        {project.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune tâche pour ce projet.
          </p>
        ) : (
          <div className="space-y-2">
            {project.tasks.map((task) => {
              const tcfg = TASK_STATUS_CONFIG[task.status as TaskStatus];
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-sm border border-border bg-muted/10 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-foreground",
                        task.status === "done" &&
                          "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span className="ml-3 text-xs text-muted-foreground">
                        <Calendar className="size-3 inline mr-1 -mt-0.5" />
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                  {task.assignee && (
                    <div
                      className="size-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0"
                      title={task.assignee.name}
                    >
                      <span className="text-primary font-medium text-[10px] leading-none">
                        {userInitials(task.assignee.name)}
                      </span>
                    </div>
                  )}
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                      tcfg.className
                    )}
                  >
                    {tcfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Project Steps */}
      <section className="rounded-sm border border-border bg-card p-6">
        <SectionHeader
          icon={ClipboardList}
          title="Étapes"
          count={project.project_steps.length}
        />
        <ProjectStepsManager projectId={project.id} />
      </section>

      {/* Terrain Notes */}
      {project.terrain_notes.length > 0 && (
        <section className="rounded-sm border border-border bg-card p-6">
          <SectionHeader
            icon={Mic}
            title="Notes terrain"
            count={project.terrain_notes.length}
          />
          <div className="space-y-3">
            {project.terrain_notes.map((note) => (
              <div
                key={note.id}
                className="flex gap-3 p-3 rounded-sm border border-border bg-muted/10"
              >
                <Mic className="size-4 text-primary/60 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {note.transcription ? (
                    <p className="text-sm text-foreground">
                      {note.transcription}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Note audio sans transcription
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(note.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Terrain Photos */}
      {project.terrain_photos.length > 0 && (
        <section className="rounded-sm border border-border bg-card p-6">
          <SectionHeader
            icon={Camera}
            title="Photos terrain"
            count={project.terrain_photos.length}
          />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {project.terrain_photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square rounded-sm overflow-hidden border border-border bg-muted/20 hover:border-primary/40 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.photo_url}
                  alt="Photo terrain"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {(photo.lat || photo.lng) && (
                  <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
                    <MapPin className="size-2.5 text-white" />
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
