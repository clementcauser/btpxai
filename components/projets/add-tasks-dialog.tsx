"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddTasksDialogProps {
  projectId: string;
}

export function AddTasksDialog({ projectId }: AddTasksDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const nextId = useRef(1);
  const [tasks, setTasks] = useState<{ id: number; value: string }[]>([{ id: 0, value: "" }]);
  const [isPending, setIsPending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setTasks([{ id: 0, value: "" }]);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRefs.current[tasks.length - 1]?.focus();
    }
  }, [tasks.length, open]);

  function addLine() {
    setTasks((prev) => [...prev, { id: nextId.current++, value: "" }]);
  }

  function removeLine(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, value: string) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, value } : t)));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === tasks.length - 1) {
        addLine();
      } else {
        inputRefs.current[index + 1]?.focus();
      }
    }
  }

  const nonEmptyTitles = tasks.map((t) => t.value.trim()).filter((v) => v.length > 0);
  const canSubmit = nonEmptyTitles.length > 0 && !isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/projets/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles: nonEmptyTitles }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        nonEmptyTitles.length === 1
          ? "Tâche ajoutée"
          : `${nonEmptyTitles.length} tâches ajoutées`
      );
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erreur lors de l'ajout des tâches");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Plus className="size-3.5" />
        Ajouter
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter des tâches</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {tasks.map((task, index) => (
            <div key={task.id} className="flex items-center gap-2">
              <Input
                ref={(el) => { inputRefs.current[index] = el; }}
                value={task.value}
                onChange={(e) => updateLine(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={`Tâche ${index + 1}`}
                className="flex-1"
                disabled={isPending}
              />
              {tasks.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer la tâche ${index + 1}`}
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLine(index)}
                  disabled={isPending}
                  tabIndex={-1}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addLine}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 disabled:opacity-50"
          >
            <Plus className="size-3" />
            Ajouter une tâche
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-busy={isPending}
          >
            {isPending
              ? "Ajout en cours…"
              : `Ajouter${nonEmptyTitles.length > 0 ? ` (${nonEmptyTitles.length})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
