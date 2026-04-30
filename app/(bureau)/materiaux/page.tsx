import type { Metadata } from "next"
import { supabaseService } from "@/lib/supabase/service"
import { getAllMateriauxRequests } from "@/lib/terrain-materiaux"
import MateriauxDashboard from "@/components/bureau/materiaux-dashboard"

export const metadata: Metadata = {
  title: "Matériaux — BTP×AI",
}

export default async function MateriauxPage() {
  let initialRequests: Awaited<ReturnType<typeof getAllMateriauxRequests>> = []

  try {
    initialRequests = await getAllMateriauxRequests(supabaseService)
  } catch {
    // Page still renders — client will receive empty list and realtime will populate
  }

  return <MateriauxDashboard initialRequests={initialRequests} />
}
