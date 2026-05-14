import type { ProjectStatus } from "@/types";

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string; dot: string; stripColor: string }
> = {
  planned: {
    label: "Planifié",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
    stripColor: "oklch(0.55 0.02 258)",
  },
  in_progress: {
    label: "En cours",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    stripColor: "oklch(0.69 0.168 47)",
  },
  completed: {
    label: "Terminé",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
    stripColor: "oklch(0.6 0.15 150)",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
    dot: "bg-red-400",
    stripColor: "oklch(0.55 0.2 25)",
  },
};
