"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalendarEventWithDetails, CalendarEventType } from "@/types";

const Schema = z.object({
  title: z.string().min(1, "Titre requis"),
  date: z.string().min(1, "Date requise"),
  start_time: z.string().min(1, "Heure de début requise"),
  end_time: z.string().min(1, "Heure de fin requise"),
  event_type_id: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

interface WorkspaceUser {
  id: string;
  email: string;
  role: string | null;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEventWithDetails | null;
  defaultDate?: Date;
  eventTypes: CalendarEventType[];
  workspaceUsers: WorkspaceUser[];
  onSave: (data: {
    title: string;
    description?: string | null;
    start_at: string;
    end_at: string;
    event_type_id?: string | null;
    assignee_ids: string[];
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  eventTypes,
  workspaceUsers,
  onSave,
  onDelete,
}: EventDialogProps) {
  const isEdit = !!event;
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const defaultDateStr = defaultDate
    ? format(defaultDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      title: "",
      date: defaultDateStr,
      start_time: "08:00",
      end_time: "17:00",
      event_type_id: "",
      description: "",
    },
  });

  useEffect(() => {
    if (event) {
      const start = new Date(event.start_at);
      const end = new Date(event.end_at);
      reset({
        title: event.title,
        date: format(start, "yyyy-MM-dd"),
        start_time: format(start, "HH:mm"),
        end_time: format(end, "HH:mm"),
        event_type_id: event.event_type_id ?? "",
        description: event.description ?? "",
      });
      setSelectedAssignees(event.assignees.map((a) => a.user_id));
    } else {
      reset({
        title: "",
        date: defaultDateStr,
        start_time: "08:00",
        end_time: "17:00",
        event_type_id: "",
        description: "",
      });
      setSelectedAssignees([]);
    }
  }, [event, defaultDate, reset, defaultDateStr]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const start_at = new Date(
        `${values.date}T${values.start_time}:00`
      ).toISOString();
      const end_at = new Date(
        `${values.date}T${values.end_time}:00`
      ).toISOString();
      await onSave({
        title: values.title,
        description: values.description || null,
        start_at,
        end_at,
        event_type_id: values.event_type_id || null,
        assignee_ids: selectedAssignees,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  const ouvriers = workspaceUsers.filter((u) => u.role === "ouvrier");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'événement" : "Nouvel événement"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              autoFocus
              {...register("title")}
              placeholder="Nom de l'événement"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Début *</Label>
              <Input id="start_time" type="time" {...register("start_time")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Fin *</Label>
              <Input id="end_time" type="time" {...register("end_time")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={watch("event_type_id") || undefined}
              onValueChange={(v) => setValue("event_type_id", v ?? undefined)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un type...">
                  {(value: string | null) => {
                    const selected = eventTypes.find((t) => t.id === value);
                    return selected ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: selected.color }}
                        />
                        {selected.label}
                      </span>
                    ) : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ouvriers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Ouvriers assignés</Label>
              <div className="flex flex-wrap gap-2">
                {ouvriers.map((u) => {
                  const selected = selectedAssignees.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {u.email.split("@")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Détails supplémentaires..."
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Enregistrement..."
                  : isEdit
                    ? "Enregistrer"
                    : "Créer"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
