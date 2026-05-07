import Link from "next/link"
import { Mail } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function GmailConnectionBanner() {
  return (
    <div className="rounded-sm border border-dashed border-border bg-muted/30 p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="size-12 rounded-sm bg-primary/10 flex items-center justify-center">
          <Mail className="size-6 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="font-medium text-foreground">Aucune boîte mail connectée</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Connectez la boîte Gmail de l'entreprise pour accéder à vos emails.
        </p>
      </div>
      <Link href="/parametres" className={buttonVariants({ variant: "default" })}>
        Configurer dans les paramètres
      </Link>
    </div>
  )
}
