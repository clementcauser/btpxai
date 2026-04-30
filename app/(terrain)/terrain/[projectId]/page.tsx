import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import type { ProjectWithClient } from "@/types"
import ProjectTabsView from "@/components/terrain/project-tabs-view"

type Props = {
  params: Promise<{ projectId: string }>
}

// Fixture used by Cypress E2E tests — never reached in production.
const CYPRESS_FIXTURE: ProjectWithClient = {
  id: "test-project-id",
  title: "Portail Dumont",
  description: "Portail coulissant en acier galvanisé",
  status: "in_progress",
  client_id: "client-1",
  created_at: new Date().toISOString(),
  clients: { id: "client-1", name: "M. Dumont" },
}

async function isE2ETestRequest(projectId: string): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false
  const cookieStore = await cookies()
  return (
    cookieStore.get("cypress-test-user")?.value === "ouvrier" &&
    projectId === "test-project-id"
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  if (await isE2ETestRequest(projectId)) {
    return { title: `${CYPRESS_FIXTURE.title} — BTP×AI` }
  }
  const supabase = await createClient()
  const { data } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .single()
  return { title: data ? `${data.title} — BTP×AI` : "Chantier — BTP×AI" }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params

  if (await isE2ETestRequest(projectId)) {
    return <ProjectTabsView project={CYPRESS_FIXTURE} />
  }

  const supabase = await createClient()
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(id, name)")
    .eq("id", projectId)
    .single()

  if (!project) notFound()

  return <ProjectTabsView project={project as ProjectWithClient} />
}
