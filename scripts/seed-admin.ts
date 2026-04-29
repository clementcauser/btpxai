// Script one-shot pour créer le premier utilisateur admin.
// Usage : npx tsx scripts/seed-admin.ts
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
  // Import dynamique APRÈS que les vars sont en place
  const { supabaseService } = await import("../lib/supabase/service");

  const { data, error } = await supabaseService.auth.admin.createUser({
    email: "admin@btpxai.fr",
    password: "123qweASD!!!",
    email_confirm: true,
    user_metadata: { name: "Admin", role: "admin" },
  });

  if (error) throw error;
  console.log("Utilisateur admin créé :", data.user?.id);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
