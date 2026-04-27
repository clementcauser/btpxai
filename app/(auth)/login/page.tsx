import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Connexion — BTP×AI",
}

export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center size-12 rounded-sm bg-primary/20 border border-primary/40 mb-4">
          <span className="font-heading font-700 text-primary text-xl">B</span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-widest uppercase text-foreground">
          BTP<span className="text-primary">×</span>AI
        </h1>
        <p className="mt-1 text-xs text-muted-foreground tracking-wider uppercase">
          Gestion métallerie
        </p>
      </div>

      {/* Card */}
      <div className="rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-foreground mb-5 uppercase tracking-wider">
          Connexion
        </h2>
        <LoginForm />
      </div>
    </div>
  )
}
