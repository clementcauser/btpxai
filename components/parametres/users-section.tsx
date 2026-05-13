"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  UserPlus,
  Loader2,
  Shield,
  Briefcase,
  HardHat,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserRole = "admin" | "bureau" | "ouvrier";

type AdminUser = {
  id: string;
  email: string;
  role: UserRole | null;
  created_at: string;
};

const inviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "bureau", "ouvrier"]),
});

type InviteForm = z.infer<typeof inviteSchema>;

type Props = {
  initialUsers: AdminUser[];
};

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; icon: React.ElementType; className: string }
> = {
  admin: {
    label: "Admin",
    icon: Shield,
    className: "bg-primary/15 text-primary border-primary/30",
  },
  bureau: {
    label: "Bureau",
    icon: Briefcase,
    className: "bg-secondary text-secondary-foreground border-border",
  },
  ouvrier: {
    label: "Ouvrier",
    icon: HardHat,
    className: "bg-muted text-muted-foreground border-border",
  },
};

function RoleBadge({ role }: { role: UserRole | null }) {
  if (!role)
    return <span className="text-xs text-muted-foreground italic">—</span>;
  const cfg = ROLE_CONFIG[role];
  if (!cfg)
    return <span className="text-xs text-muted-foreground italic">{role}</span>;
  const Icon = cfg.icon;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs font-medium",
        cfg.className,
      ].join(" ")}
    >
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function UsersSection({ initialUsers }: Props) {
  console.log("🚀 ~ UsersSection ~ initialUsers:", initialUsers);
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [roleDialog, setRoleDialog] = useState<AdminUser | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "bureau" },
  });

  const selectedRole = watch("role");

  function onInvite(data: InviteForm) {
    setInviteError(null);
    startTransition(async () => {
      const res = await fetch("/api/parametres/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { user?: AdminUser; error?: string };
      if (!res.ok) {
        setInviteError(json.error ?? "Erreur lors de l'invitation");
      } else {
        setUsers((prev) => [
          ...prev,
          json.user ?? {
            id: crypto.randomUUID(),
            email: data.email,
            role: data.role,
            created_at: new Date().toISOString(),
          },
        ]);
        reset();
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 3000);
      }
    });
  }

  async function changeRole(userId: string, newRole: UserRole) {
    setRoleChanging(true);
    try {
      const res = await fetch(`/api/parametres/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setRoleDialog(null);
      }
    } finally {
      setRoleChanging(false);
    }
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <Users className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Gestion des membres
        </span>
        <Badge variant="secondary" className="ml-auto text-xs py-0 h-5">
          {users.length}
        </Badge>
      </div>

      {/* Users table */}
      <div className="divide-y divide-border">
        {users.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center italic">
            Aucun utilisateur.
          </p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              data-testid="user-row"
              className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                  {initials(user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-foreground truncate">
                  {user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Membre depuis{" "}
                  {new Date(user.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <RoleBadge role={user.role} />
              <button
                type="button"
                onClick={() => setRoleDialog(user)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors shrink-0"
                data-testid={`change-role-${user.id}`}
              >
                Modifier
              </button>
            </div>
          ))
        )}
      </div>

      {/* Invite form */}
      <div className="p-5 border-t border-border bg-muted/10 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="size-3.5 text-primary" />
          <span className="text-xs font-medium tracking-wider uppercase text-foreground">
            Inviter un membre
          </span>
        </div>

        <form
          onSubmit={handleSubmit(onInvite)}
          className="space-y-3"
          noValidate
        >
          <div className="flex gap-2">
            <div className="flex-1 w-full space-y-1">
              <Input
                type="email"
                placeholder="email@exemple.com"
                data-testid="invite-email-input"
                className="font-mono text-sm"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            {/* Role selector */}
            <div className="flex rounded-sm border border-border overflow-hidden shrink-0">
              {(["bureau", "ouvrier", "admin"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setValue("role", r)}
                  data-testid={`invite-role-${r}`}
                  className={[
                    "px-3 py-1.5 text-xs font-medium tracking-wide transition-colors",
                    selectedRole === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  ].join(" ")}
                >
                  {r === "bureau"
                    ? "Bureau"
                    : r === "ouvrier"
                      ? "Ouvrier"
                      : "Admin"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              data-testid="invite-submit-btn"
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              Inviter
            </Button>
            {inviteSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-primary animate-in fade-in duration-200">
                <CheckCircle2 className="size-3.5" />
                Invitation envoyée
              </span>
            )}
            {inviteError && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <X className="size-3.5" />
                {inviteError}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Role change dialog */}
      {roleDialog && (
        <Dialog
          open={!!roleDialog}
          onOpenChange={(open) => {
            if (!open) setRoleDialog(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <div className="space-y-4">
              <div>
                <h3 className="font-heading text-lg font-600 tracking-wide uppercase">
                  Changer le rôle
                </h3>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  {roleDialog.email}
                </p>
              </div>

              <Label className="text-xs tracking-wider uppercase text-muted-foreground">
                Nouveau rôle
              </Label>

              <div className="grid grid-cols-3 gap-2">
                {(
                  Object.entries(ROLE_CONFIG) as [
                    UserRole,
                    (typeof ROLE_CONFIG)[UserRole],
                  ][]
                ).map(([role, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = roleDialog.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => changeRole(roleDialog.id, role)}
                      disabled={roleChanging || isActive}
                      data-testid={`confirm-role-${role}`}
                      className={[
                        "flex flex-col items-center gap-2 p-3 rounded-sm border transition-colors",
                        "disabled:cursor-not-allowed",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {roleChanging && !isActive ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
