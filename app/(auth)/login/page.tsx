import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Connexion — btpxai",
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Connexion</h1>
      <LoginForm />
    </div>
  )
}
