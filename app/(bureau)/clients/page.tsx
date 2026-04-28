import type { Metadata } from "next"
import { Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getClients } from "@/lib/clients"
import { ClientsTable } from "@/components/clients/clients-table"

export const metadata: Metadata = {
  title: "Clients — BTP×AI",
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const clients = await getClients(supabase).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Gestion
          </span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
          Clients
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clients.length} client{clients.length !== 1 ? "s" : ""} · carnet d&apos;adresses et historique devis
        </p>
      </div>

      <ClientsTable clients={clients} />
    </div>
  )
}
