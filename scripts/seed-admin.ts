// Script one-shot pour créer le premier utilisateur admin.
// Usage : npx tsx scripts/seed-admin.ts
//
// Variables d'environnement requises (dans .env.local ou dans l'environnement) :
//   SEED_ADMIN_EMAIL    — email du compte admin à créer
//   SEED_ADMIN_PASSWORD — mot de passe (min. 8 caractères)
//   SEED_ADMIN_NAME     — nom affiché (optionnel, défaut : "Admin")
import { readFileSync } from "fs";
import { resolve } from "path";

// Charge .env.local avant toute évaluation de lib/env (qui valide au chargement).
try {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch {
  // .env.local absent — les vars doivent être dans l'environnement
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email) {
    console.error("Erreur : SEED_ADMIN_EMAIL est requis.");
    process.exit(1);
  }
  if (!password) {
    console.error("Erreur : SEED_ADMIN_PASSWORD est requis.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Erreur : SEED_ADMIN_PASSWORD doit contenir au moins 8 caractères.");
    process.exit(1);
  }

  // Import dynamique APRÈS que les vars sont en place
  const { supabaseService } = await import("../lib/supabase/service");

  const { data, error } = await supabaseService.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "admin" },
  });

  if (error) throw error;
  console.log(`Utilisateur admin créé : ${data.user?.id} (${email})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
