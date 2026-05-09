"use client"

import { useTheme } from "next-themes"
import { Monitor, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

const OPTIONS = [
  { value: "system", label: "Système", Icon: Monitor },
  { value: "light",  label: "Clair",   Icon: Sun     },
  { value: "dark",   label: "Sombre",  Icon: Moon    },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <section aria-labelledby="theme-heading">
      <div className="space-y-3">
        <div>
          <span
            id="theme-heading"
            className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
          >
            Apparence
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choisissez le thème de l&apos;interface
          </p>
        </div>
        <div
          className="inline-flex border border-border rounded-sm overflow-hidden"
          role="group"
          aria-label="Sélecteur de thème"
        >
          {OPTIONS.map(({ value, label, Icon }, index) => {
            const isActive = mounted && theme === value
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  index > 0 && "border-l border-border",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
