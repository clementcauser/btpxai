"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUS_CONFIG } from "@/lib/project-status";
import type { ProjectStatus } from "@/types";

const EditProjectSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
});

type EditProjectForm = z.infer<typeof EditProjectSchema>;

interface ProjectEditSheetProps {
  projectId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialStatus: ProjectStatus;
}

export function ProjectEditSheet({
  projectId,
  initialTitle,
  initialDescription,
  initialStatus,
}: ProjectEditSheetProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<EditProjectForm>({
    resolver: zodResolver(EditProjectSchema),
    defaultValues: {
      title: initialTitle,
      description: initialDescription ?? "",
      status: initialStatus,
    },
  });

  async function onSubmit(values: EditProjectForm) {
    try {
      const res = await fetch(`/api/projets/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      toast.success("Projet mis à jour");
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" />
        }
      >
        <Pencil className="size-3.5" />
        Modifier
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Modifier le projet</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 space-y-5 px-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v as ProjectStatus)}
            >
              <SelectTrigger>
                <SelectValue>
                  {PROJECT_STATUS_CONFIG[form.watch("status")]?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PROJECT_STATUS_CONFIG) as [ProjectStatus, typeof PROJECT_STATUS_CONFIG[ProjectStatus]][]).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
