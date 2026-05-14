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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  id: string;
  name: string;
}

interface TaskRow {
  id: number;
  value: string;
  assignedTo: string | null;
  dueDate: string;
}

interface AddTasksDialogProps {
  projectId: string;
  members?: Member[];
}

export function AddTasksDialog({ projectId, members = [] }: AddTasksDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const nextId = useRef(1);
  const [tasks, setTasks] = useState<TaskRow[]>([{ id: 0, value: "", assignedTo: null, dueDate: "" }]);
  const [isPending, setIsPending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      nextId.current = 1;
      inputRefs.current = [];
      setTasks([{ id: 0, value: "", assignedTo: null, dueDate: "" }]);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRefs.current[tasks.length - 1]?.focus();
    }
  }, [tasks.length, open]);

  function addLine() {
    setTasks((prev) => [...prev, { id: nextId.current++, value: "", assignedTo: null, dueDate: "" }]);
  }

  function removeLine(index: number) {
    inputRefs.current.splice(index, 1);
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof TaskRow, value: string | null) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
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

  const nonEmptyTasks = tasks.filter((t) => t.value.trim().length > 0);
  const canSubmit = nonEmptyTasks.length > 0 && !isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsPending(true);
    try {
      const payload = nonEmptyTasks.map((t) => ({
        title: t.value.trim(),
        assignedTo: t.assignedTo ?? undefined,
        dueDate: t.dueDate || undefined,
      }));
      const res = await fetch(`/api/projets/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: payload }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        nonEmptyTasks.length === 1
          ? "Tâche ajoutée"
          : `${nonEmptyTasks.length} tâches ajoutées`
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des tâches</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          {tasks.map((task, index) => (
            <div key={task.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  ref={(el) => { inputRefs.current[index] = el; }}
                  value={task.value}
                  onChange={(e) => updateLine(index, "value", e.target.value)}
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

              <div className="flex items-center gap-2 pl-0">
                {members.length > 0 && (
                  <Select
                    value={task.assignedTo ?? "none"}
                    onValueChange={(v) => updateLine(index, "assignedTo", v === "none" ? null : v)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-7 text-xs w-40 text-muted-foreground">
                      <SelectValue placeholder="Responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-muted-foreground">
                        Sans responsable
                      </SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="datetime-local"
                  value={task.dueDate}
                  onChange={(e) => updateLine(index, "dueDate", e.target.value)}
                  disabled={isPending}
                  className="h-7 text-xs w-48 text-muted-foreground"
                />
              </div>
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
              : `Ajouter${nonEmptyTasks.length > 0 ? ` (${nonEmptyTasks.length})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
