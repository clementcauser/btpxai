import type { Metadata } from "next"
import { getUser, getUserRole } from "@/lib/supabase/server"
import {
  FileText,
  Users,
  Mail,
  Clock,
  TrendingUp,
  Wrench,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Tableau de bord — BTP×AI",
}

const stats = [
  {
    label: "Devis en cours",
    value: "—",
    icon: FileText,
    description: "À envoyer ou en attente",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Clients actifs",
    value: "—",
    icon: Users,
    description: "Avec chantier en cours",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    label: "Messages non lus",
    value: "—",
    icon: Mail,
    description: "Dans la messagerie",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    label: "Chantiers actifs",
    value: "—",
    icon: Wrench,
    description: "En cours d'exécution",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
]

const quickActions = [
  {
    label: "Générer un devis",
    description: "Brief client → devis en quelques secondes",
    href: "/devis/nouveau",
    icon: FileText,
    accent: "primary",
  },
  {
    label: "Voir la messagerie",
    description: "Emails classifiés automatiquement",
    href: "/inbox",
    icon: Mail,
    accent: "violet",
  },
  {
    label: "Nouveau client",
    description: "Ajouter un contact au répertoire",
    href: "/clients/nouveau",
    icon: Users,
    accent: "sky",
  },
]

export default async function DashboardPage() {
  const user = await getUser()
  const role = getUserRole(user) ?? "bureau"

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bonjour"
    if (hour < 18) return "Bon après-midi"
    return "Bonsoir"
  })()

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground tracking-wider uppercase">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
          <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Voici un résumé de l&apos;activité de votre entreprise.
          </p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 text-primary border-primary/40 uppercase tracking-wider text-[10px] px-2 py-1"
        >
          {role === "admin" ? "Administrateur" : "Bureau"}
        </Badge>
      </div>

      {/* Stats grid */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Indicateurs
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="bg-card border-border hover:border-border/80 transition-colors"
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </CardTitle>
                  <div className={`size-7 rounded-sm ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`size-3.5 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <p className="font-heading text-2xl font-700 text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Actions rapides
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="group flex items-start gap-3 rounded-sm border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="size-8 rounded-sm bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <action.icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Empty activity feed */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Activité récente
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="rounded-sm border border-border border-dashed bg-card/50 p-12 text-center">
          <div className="size-12 rounded-sm bg-muted mx-auto mb-3 flex items-center justify-center">
            <Clock className="size-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Aucune activité récente
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Les devis, emails et chantiers apparaîtront ici.
          </p>
        </div>
      </section>
    </div>
  )
}
