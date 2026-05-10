import type { Metadata } from "next";
import Link from "next/link";
import { getUser, getUserRole } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { getDashboardMetrics } from "@/lib/dashboard";
import { getAppSetting } from "@/lib/settings";
import { requireWorkspace } from "@/lib/workspaces";
import { DashboardAutoRefresh } from "@/components/dashboard/auto-refresh";
import { DashboardNewClientAction } from "@/components/dashboard/new-client-action";
import {
  FileText,
  Mail,
  Package,
  AlertTriangle,
  Euro,
  HardHat,
  Clock,
  ArrowRight,
  Sheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Tableau de bord — BTP×AI",
};

function formatRevenue(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const quickActions = [
  {
    label: "Générer un devis",
    description: "Brief client → devis en quelques secondes",
    href: "/devis/nouveau",
    icon: FileText,
    external: false,
  },
  {
    label: "Voir la messagerie",
    description: "Emails classifiés automatiquement",
    href: "/inbox",
    icon: Mail,
    external: false,
  },
];

export default async function DashboardPage() {
  const user = await getUser();
  const role = getUserRole(user) ?? "bureau";
  console.log(role);
  let metrics = {
    pendingQuotes: 0,
    activeProjects: 0,
    unprocessedEmails: 0,
    weeklyRevenue: 0,
    pendingMaterials: 0,
    openAlerts: 0,
  };

  let sheetsUrl: string | null = null;

  try {
    metrics = await getDashboardMetrics(supabaseService);
  } catch {
    // Fail gracefully — show zeros
  }

  try {
    if (user) {
      const { workspaceId } = await requireWorkspace(user.id);
      sheetsUrl = await getAppSetting(workspaceId, "sheets_spreadsheet_url");
    }
  } catch {
    // Fail gracefully — no link shown
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  type MetricCard = {
    label: string;
    value: string;
    description: string;
    icon: React.ElementType;
    href?: string;
    linkLabel?: string;
    accentColor: string;
    iconBg: string;
    iconColor: string;
    urgent: boolean;
  };

  const metricCards: MetricCard[] = [
    {
      label: "Devis en attente",
      value: String(metrics.pendingQuotes),
      description: "devis envoyés sans réponse",
      icon: FileText,
      href: "/devis",
      linkLabel: "Voir les devis",
      accentColor: "oklch(0.69 0.168 47)",
      iconBg: "oklch(0.69 0.168 47 / 0.12)",
      iconColor: "oklch(0.69 0.168 47)",
      urgent: false,
    },
    {
      label: "Chantiers actifs",
      value: String(metrics.activeProjects),
      description: "projets en cours",
      icon: HardHat,
      accentColor: "oklch(0.62 0.12 210)",
      iconBg: "oklch(0.62 0.12 210 / 0.12)",
      iconColor: "oklch(0.62 0.12 210)",
      urgent: false,
    },
    {
      label: "Emails non traités",
      value: String(metrics.unprocessedEmails),
      description: "à traiter dans la messagerie",
      icon: Mail,
      href: "/inbox",
      linkLabel: "Ouvrir la messagerie",
      accentColor: "oklch(0.65 0.15 280)",
      iconBg: "oklch(0.65 0.15 280 / 0.12)",
      iconColor: "oklch(0.65 0.15 280)",
      urgent: false,
    },
    {
      label: "CA de la semaine",
      value: formatRevenue(metrics.weeklyRevenue),
      description: "devis acceptés cette semaine",
      icon: Euro,
      href: "/devis",
      linkLabel: "Voir les devis",
      accentColor: "oklch(0.60 0.14 145)",
      iconBg: "oklch(0.60 0.14 145 / 0.12)",
      iconColor: "oklch(0.60 0.14 145)",
      urgent: false,
    },
    {
      label: "Matériaux en attente",
      value: String(metrics.pendingMaterials),
      description: "demandes à traiter",
      icon: Package,
      href: "/materiaux",
      linkLabel: "Voir les demandes",
      accentColor: "oklch(0.70 0.18 55)",
      iconBg: "oklch(0.70 0.18 55 / 0.12)",
      iconColor: "oklch(0.70 0.18 55)",
      urgent: false,
    },
    {
      label: "Alertes terrain",
      value: String(metrics.openAlerts),
      description:
        metrics.openAlerts > 0
          ? "problèmes ouverts ou en cours"
          : "aucun problème signalé",
      icon: AlertTriangle,
      href: "/alertes",
      linkLabel: "Voir les alertes",
      accentColor:
        metrics.openAlerts > 0
          ? "oklch(0.62 0.22 25)"
          : "oklch(0.29 0.012 258)",
      iconBg:
        metrics.openAlerts > 0
          ? "oklch(0.62 0.22 25 / 0.12)"
          : "oklch(0.21 0.01 258)",
      iconColor:
        metrics.openAlerts > 0
          ? "oklch(0.62 0.22 25)"
          : "oklch(0.58 0.008 258)",
      urgent: metrics.openAlerts > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardAutoRefresh />

      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="size-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground tracking-widest uppercase">
            {dateLabel}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-700 tracking-wide uppercase leading-none">
              {greeting}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Résumé de l&apos;activité de la semaine.
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-primary/40 text-primary uppercase tracking-wider text-[10px] px-2 py-1"
          >
            {role === "admin" ? "Administrateur" : "Bureau"}
          </Badge>
        </div>
        <div className="mt-4 h-px bg-border" />
      </header>

      {/* Alert banner */}
      {metrics.openAlerts > 0 && (
        <Link
          href="/alertes"
          className="flex items-center gap-3 rounded-sm px-4 py-3 transition-opacity hover:opacity-90"
          style={{
            background: "oklch(0.22 0.1 25)",
            border: "1px solid oklch(0.5 0.2 25)",
          }}
          data-testid="alert-banner"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: "oklch(0.62 0.22 25)",
              animation: "alertPulse 2.4s ease infinite",
            }}
          />
          <p
            className="flex-1 text-sm font-bold"
            style={{
              color: "oklch(0.92 0.2 25)",
              fontFamily: "var(--font-barlow)",
            }}
          >
            {metrics.openAlerts} alerte
            {metrics.openAlerts > 1 ? "s" : ""} terrain en attente de traitement
          </p>
          <span
            className="text-xs uppercase tracking-wider font-bold"
            style={{
              color: "oklch(0.75 0.18 25)",
              fontFamily: "var(--font-barlow)",
            }}
          >
            Voir →
          </span>
        </Link>
      )}

      {/* Metric cards */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Indicateurs
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {metricCards.map((card, i) => {
            const cardContent = (
              <div
                className="relative flex flex-col gap-3 h-full rounded-sm border border-border bg-card p-5 overflow-hidden transition-colors"
                style={{
                  borderLeftColor: card.accentColor,
                  borderLeftWidth: "3px",
                  animation: "fadeSlideIn 0.35s ease both",
                  animationDelay: `${i * 0.06}s`,
                  ...(card.urgent
                    ? {
                        boxShadow: "0 0 0 1px oklch(0.5 0.2 25 / 0.25) inset",
                      }
                    : {}),
                }}
              >
                {/* Label + icon */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.1em] leading-tight"
                    style={{ color: "oklch(0.55 0.008 258)" }}
                  >
                    {card.label}
                  </span>
                  <div
                    className="size-7 rounded-sm flex items-center justify-center shrink-0"
                    style={{ background: card.iconBg }}
                  >
                    <card.icon
                      className="size-3.5"
                      style={{ color: card.iconColor }}
                    />
                  </div>
                </div>

                {/* Value */}
                <p
                  className="font-heading font-700 leading-none tracking-tight"
                  style={{
                    fontSize: card.value.length > 8 ? "1.6rem" : "2.25rem",
                    color: card.urgent
                      ? card.iconColor
                      : "oklch(0.92 0.012 78)",
                  }}
                >
                  {card.value}
                </p>

                {/* Description */}
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "oklch(0.55 0.008 258)" }}
                >
                  {card.description}
                </p>

                {/* Link */}
                {card.href && card.linkLabel && (
                  <div
                    className="flex items-center gap-1 text-[11px] font-medium mt-auto transition-opacity hover:opacity-70"
                    style={{ color: card.accentColor }}
                  >
                    {card.linkLabel}
                    <ArrowRight className="size-3" />
                  </div>
                )}
              </div>
            );

            return card.href ? (
              <Link key={card.label} href={card.href} className="block">
                {cardContent}
              </Link>
            ) : (
              <div key={card.label}>{cardContent}</div>
            );
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Actions rapides
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-start gap-3 rounded-sm border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="size-8 rounded-sm bg-muted flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/15">
                <action.icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
          <DashboardNewClientAction />
          {sheetsUrl && (
            <a
              href={sheetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="dashboard-sheets-link"
              className="group flex items-start gap-3 rounded-sm border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="size-8 rounded-sm bg-muted flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/15">
                <Sheet className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  Google Sheet
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Consulter le tableau de bord Sheets
                </p>
              </div>
            </a>
          )}
        </div>
      </section>

      <p className="text-[10px] text-muted-foreground/40 text-right tracking-wider uppercase">
        Données actualisées toutes les 5 minutes
      </p>
    </div>
  );
}
