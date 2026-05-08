// Script one-shot pour créer l'utilisateur superadmin.
// Usage : npx tsx scripts/seed-admin.ts
import { readFileSync } from "fs"
import { resolve } from "path"

// Charge .env.local avant toute évaluation de lib/env (qui valide au chargement).
try {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim()
    }
  }
} catch {
  // .env.local absent — les vars doivent être dans l'environnement
}

async function main() {
  const { supabaseService } = await import("../lib/supabase/service")

  const superEmail = process.env.SEED_SUPERADMIN_EMAIL
  const superPassword = process.env.SEED_SUPERADMIN_PASSWORD
  const superName = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin"

  if (!superEmail || !superPassword) {
    throw new Error("SEED_SUPERADMIN_EMAIL et SEED_SUPERADMIN_PASSWORD sont requis")
  }

  const { data, error } = await supabaseService.auth.admin.createUser({
    email: superEmail,
    password: superPassword,
    email_confirm: true,
    user_metadata: { name: superName, role: "super_admin" },
  })

  if (error) {
    if (error.message.includes("already registered")) {
      console.log("Utilisateur superadmin déjà existant, skip.")
    } else {
      throw error
    }
  } else {
    console.log("Utilisateur superadmin créé :", data.user?.id)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error("Erreur :", err)
  process.exit(1)
})
