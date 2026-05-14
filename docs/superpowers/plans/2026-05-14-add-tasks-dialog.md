# AddTasksDialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "+ Ajouter" button to the Tasks section of the project detail page that opens a dialog allowing bulk task creation.

**Architecture:** Three self-contained changes: (1) a new POST API route that bulk-inserts tasks for a project, (2) a new `AddTasksDialog` client component handling the multi-input UX, (3) a one-line integration into the existing server page. Each change is independent and can be committed separately.

**Tech Stack:** Next.js App Router, Supabase (supabaseService), Zod, shadcn/ui Dialog + Input + Button, sonner toasts, React `useTransition` + `useRouter`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/api/projets/[id]/tasks/route.ts` | POST — bulk insert tasks |
| Create | `components/projets/add-tasks-dialog.tsx` | Client dialog with multi-input form |
| Modify | `app/(bureau)/projets/[id]/page.tsx:481-541` | Add button to Tasks section header |

---

## Task 1: API route — `POST /api/projets/[id]/tasks`

**Files:**
- Create: `app/api/projets/[id]/tasks/route.ts`

- [ ] **Step 1: Create the route file**

```ts
// app/api/projets/[id]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { requireWorkspace, WorkspaceError } from "@/lib/workspaces"

const PostTasksSchema = z.object({
  titles: z
    .array(z.string().min(1).max(500))
    .min(1, "Au moins une tâche requise")
    .max(50, "Maximum 50 tâches par envoi"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const role = getUserRole(user)
  if (role === "ouvrier") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  let workspaceId: string
  try {
    ;({ workspaceId } = await requireWorkspace(user.id))
  } catch (err) {
    if (err instanceof WorkspaceError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  const { id: projectId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const result = PostTasksSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Données invalides", details: result.error.flatten() },
      { status: 422 }
    )
  }

  const rows = result.data.titles.map((title) => ({
    project_id: projectId,
    workspace_id: workspaceId,
    title,
    status: "todo" as const,
  }))

  const { data, error } = await supabaseService
    .from("tasks")
    .insert(rows)
    .select()

  if (error) {
    console.error("Error inserting tasks:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création des tâches" },
      { status: 500 }
    )
  }

  return NextResponse.json({ tasks: data }, { status: 201 })
}
```

- [ ] **Step 2: Verify the file exists and has no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "tasks/route"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add app/api/projets/[id]/tasks/route.ts
git commit -m "feat: add POST /api/projets/[id]/tasks for bulk task creation"
```

---

## Task 2: `AddTasksDialog` component

**Files:**
- Create: `components/projets/add-tasks-dialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/projets/add-tasks-dialog.tsx
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
  const [tasks, setTasks] = useState<string[]>([""]);
  const [isPending, setIsPending] = useState(false);
  const lastInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTasks([""]);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      lastInputRef.current?.focus();
    }
  }, [tasks.length, open]);

  function addLine() {
    setTasks((prev) => [...prev, ""]);
  }

  function removeLine(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, value: string) {
    setTasks((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === tasks.length - 1) {
        addLine();
      } else {
        // focus next input
        const inputs = document.querySelectorAll<HTMLInputElement>(
          "[data-task-input]"
        );
        inputs[index + 1]?.focus();
      }
    }
  }

  const nonEmptyTitles = tasks.filter((t) => t.trim().length > 0);
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
            <div key={index} className="flex items-center gap-2">
              <Input
                ref={index === tasks.length - 1 ? lastInputRef : undefined}
                data-task-input
                value={task}
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
          >
            {isPending
              ? "Ajout en cours…"
              : `Ajouter ${nonEmptyTitles.length > 0 ? `(${nonEmptyTitles.length})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "add-tasks-dialog"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/projets/add-tasks-dialog.tsx
git commit -m "feat: add AddTasksDialog component for bulk task creation"
```

---

## Task 3: Integrate into project detail page

**Files:**
- Modify: `app/(bureau)/projets/[id]/page.tsx`

The Tasks section (around line 481) currently renders:

```tsx
<section className="rounded-sm border border-border bg-card p-6">
  <SectionHeader
    icon={CheckSquare}
    title="Tâches"
    count={project.tasks.length}
  />
  {/* ...task list... */}
</section>
```

- [ ] **Step 1: Add the import**

At the top of `app/(bureau)/projets/[id]/page.tsx`, add alongside the other projets imports:

```tsx
import { AddTasksDialog } from "@/components/projets/add-tasks-dialog";
```

- [ ] **Step 2: Replace the Tasks section header**

Find this block (around line 482–488):

```tsx
      {/* Tasks */}
      <section className="rounded-sm border border-border bg-card p-6">
        <SectionHeader
          icon={CheckSquare}
          title="Tâches"
          count={project.tasks.length}
        />
```

Replace with:

```tsx
      {/* Tasks */}
      <section className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-primary/70 shrink-0" />
            <h2 className="font-heading text-base font-700 tracking-wide uppercase text-foreground">
              Tâches
            </h2>
            <span className="ml-1 text-xs text-muted-foreground tabular-nums">
              ({project.tasks.length})
            </span>
          </div>
          <AddTasksDialog projectId={project.id} />
        </div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "projets"
```

Expected: no output.

- [ ] **Step 4: Start dev server and manually test the golden path**

```bash
npm run dev
```

Open a project detail page. Verify:
1. "+ Ajouter" button appears in the Tasks section header
2. Clicking it opens the dialog with one input focused
3. Typing a title and pressing Enter adds a second input
4. The "×" appears on each line when there are 2+ lines
5. Clicking "×" removes that line
6. "Ajouter une tâche" link adds a line
7. Submit button shows count of non-empty tasks
8. Submitting closes the modal, shows toast, and the new tasks appear in the list

- [ ] **Step 5: Commit**

```bash
git add app/(bureau)/projets/[id]/page.tsx
git commit -m "feat: integrate AddTasksDialog into project detail tasks section"
```
