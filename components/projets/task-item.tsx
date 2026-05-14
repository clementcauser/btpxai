import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatusBadge } from "@/components/projets/task-status-badge";
import { TaskItemActions } from "@/components/projets/task-item-actions";
import { UserChip } from "@/components/projets/user-chip";
import type { TaskStatus } from "@/types";

interface Member {
  id: string;
  name: string;
}

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    status: string;
    assigned_to: string | null;
    due_date: string | null;
    assignee?: { name: string } | null;
  };
  projectId: string;
  members: Member[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TaskItem({ task, projectId, members }: TaskItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-sm border border-border bg-muted/10 text-sm">
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-foreground",
            task.status === "done" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </span>
        {task.assignee && (
          <span className="ml-2">
            <UserChip name={task.assignee.name} />
          </span>
        )}
        {task.due_date && (
          <span className="ml-3 text-xs text-muted-foreground">
            <Calendar className="size-3 inline mr-1 -mt-0.5" />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
      <TaskStatusBadge
        taskId={task.id}
        projectId={projectId}
        initialStatus={task.status as TaskStatus}
      />
      <TaskItemActions
        taskId={task.id}
        projectId={projectId}
        initialTitle={task.title}
        initialAssignedTo={task.assigned_to}
        initialDueDate={task.due_date}
        members={members}
      />
    </div>
  );
}
