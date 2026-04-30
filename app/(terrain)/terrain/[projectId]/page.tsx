import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import type { ProjectWithClient } from "@/types"
import ProjectTabsView from "@/components/terrain/project-tabs-view"

type Props = {
  params: Promise<{ projectId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
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
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(id, name)")
    .eq("id", projectId)
    .single()

  if (!project) notFound()

  return <ProjectTabsView project={project as ProjectWithClient} />
}
