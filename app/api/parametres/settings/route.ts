import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUserRole } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspaces";
import { setAppSetting } from "@/lib/settings";

const bodySchema = z.object({
  key: z.enum([
    "weekly_report_recipients",
    "weekly_report_enabled",
    "auto_reminders_enabled",
    "reminder_delay_j7",
    "reminder_delay_j14",
    "default_cgv",
    "sheets_spreadsheet_url",
  ]),
  value: z.string(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = getUserRole(user);
  if (role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { workspaceId } = await requireWorkspace(user.id);
  await setAppSetting(workspaceId, parsed.data.key, parsed.data.value);

  return NextResponse.json({ ok: true });
}
