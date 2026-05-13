"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarToggle({
  collapsed,
  onToggle,
  label,
}: {
  collapsed: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <div className="border-t border-sidebar-border px-2 py-2">
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Ouvrir la sidebar" : "Réduire la sidebar"}
        className={cn(
          "w-full flex items-center gap-3 py-2 px-2 rounded-md text-sm font-medium",
          "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent",
          "transition-colors duration-150 group",
          collapsed && "justify-center"
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4 shrink-0" />
        ) : (
          <>
            <PanelLeftClose className="size-4 shrink-0" />
            <span className="truncate tracking-wide">{label ?? "Réduire"}</span>
          </>
        )}
      </button>
    </div>
  );
}
