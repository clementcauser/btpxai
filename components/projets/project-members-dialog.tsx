"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProjectMember, WorkspaceMemberWithUser } from "@/types";

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface ProjectMembersDialogProps {
  projectId: string;
  members: ProjectMember[];
  workspaceMembers: WorkspaceMemberWithUser[];
}

export function ProjectMembersDialog({
  projectId,
  members,
  workspaceMembers,
}: ProjectMembersDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<Set<string>>(
    () => new Set(members.map((m) => m.user_id))
  );
  const [loading, setLoading] = useState<string | null>(null);

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (val) {
      setMemberIds(new Set(members.map((m) => m.user_id)));
    } else {
      startTransition(() => router.refresh());
    }
  }

  const projectMembers = workspaceMembers.filter(
    (wm) => wm.user_id && memberIds.has(wm.user_id)
  );
  const otherMembers = workspaceMembers.filter(
    (wm) => wm.user_id && !memberIds.has(wm.user_id)
  );

  async function handleAdd(userId: string) {
    setLoading(userId);
    setMemberIds((prev) => new Set([...prev, userId]));
    try {
      const res = await fetch(`/api/projets/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Membre ajouté");
    } catch {
      setMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.error("Erreur lors de l'ajout");
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove(userId: string) {
    setLoading(userId);
    setMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    try {
      const res = await fetch(`/api/projets/${projectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Membre retiré");
    } catch {
      setMemberIds((prev) => new Set([...prev, userId]));
      toast.error("Erreur lors du retrait");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <Settings className="size-3.5" />
        Gérer
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer les membres</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          {projectMembers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Dans ce projet — {memberIds.size}
              </p>
              <div className="space-y-1">
                {projectMembers.map((wm) => (
                  <MemberRow
                    key={wm.user_id}
                    wm={wm}
                    isMember
                    loading={loading === wm.user_id}
                    onAction={() => handleRemove(wm.user_id!)}
                  />
                ))}
              </div>
            </div>
          )}

          {projectMembers.length > 0 && otherMembers.length > 0 && (
            <div className="border-t border-border" />
          )}

          {otherMembers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Autres membres du workspace
              </p>
              <div className="space-y-1">
                {otherMembers.map((wm) => (
                  <MemberRow
                    key={wm.user_id}
                    wm={wm}
                    isMember={false}
                    loading={loading === wm.user_id}
                    onAction={() => handleAdd(wm.user_id!)}
                  />
                ))}
              </div>
            </div>
          )}

          {workspaceMembers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun membre dans ce workspace.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  wm,
  isMember,
  loading,
  onAction,
}: {
  wm: WorkspaceMemberWithUser;
  isMember: boolean;
  loading: boolean;
  onAction: () => void;
}) {
  const name = wm.user?.name ?? "Utilisateur";
  const email = wm.user?.email ?? "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md border",
        isMember ? "bg-blue-500/5 border-blue-500/20" : "bg-card border-border"
      )}
    >
      <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
        {userInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isMember ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "size-7 shrink-0 border",
          isMember
            ? "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
            : "text-blue-400 hover:text-blue-400 hover:bg-blue-400/10 border-blue-400/20"
        )}
        disabled={loading}
        onClick={onAction}
      >
        {isMember ? (
          <Minus className="size-3.5" />
        ) : (
          <Plus className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
