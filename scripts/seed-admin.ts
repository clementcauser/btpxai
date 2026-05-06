// Script one-shot pour créer les utilisateurs admin et superadmin.
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

  // --- Admin ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin"

  if (!adminEmail || !adminPassword) {
    throw new Error("SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD sont requis")
  }

  const { data: adminData, error: adminError } = await supabaseService.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { name: adminName, role: "admin" },
  })

  if (adminError) {
    if (adminError.message.includes("already registered")) {
      console.log("Utilisateur admin déjà existant, skip.")
    } else {
      throw adminError
    }
  } else {
    console.log("Utilisateur admin créé :", adminData.user?.id)
  }

  // --- Superadmin ---
  const superEmail = process.env.SEED_SUPERADMIN_EMAIL
  const superPassword = process.env.SEED_SUPERADMIN_PASSWORD
  const superName = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin"

  if (!superEmail || !superPassword) {
    console.warn("SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD non définis, skip superadmin.")
    process.exit(0)
  }

  const { data: superData, error: superError } = await supabaseService.auth.admin.createUser({
    email: superEmail,
    password: superPassword,
    email_confirm: true,
    user_metadata: { name: superName, role: "super_admin" },
  })

  if (superError) {
    if (superError.message.includes("already registered")) {
      console.log("Utilisateur superadmin déjà existant, skip.")
    } else {
      throw superError
    }
  } else {
    console.log("Utilisateur superadmin créé :", superData.user?.id)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error("Erreur :", err)
  process.exit(1)
})
