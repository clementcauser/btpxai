# CLAUDE.md — btpxai

Fichier de contexte pour Claude Code. À placer à la racine du projet.

---

## Projet

Système agentique pour une petite entreprise de métallerie familiale. L'objectif est d'automatiser les tâches répétitives, de gérer les devis et commandes, et d'améliorer la communication client. Ce projet sert de cas concret avant une commercialisation vers d'autres PME.

**Repo GitHub** : `clementcauser/btpxai`  
**Déploiement** : Vercel (preview sur chaque PR, production sur `main`)

---

## Stack technique

| Couche           | Outil                           |
| ---------------- | ------------------------------- |
| Framework        | Next.js 15 (App Router)         |
| Langage          | TypeScript (strict mode)        |
| Base de données  | Supabase (Postgres managé)      |
| Auth             | Supabase Auth                   |
| UI               | Shadcn/ui + Tailwind CSS        |
| IA               | Anthropic API via Vercel AI SDK |
| Tests unitaires  | Vitest + Testing Library        |
| Tests E2E        | Cypress                         |
| Intégrations     | Gmail API, Google Sheets API    |
| Storage fichiers | Supabase Storage                |
| Realtime         | Supabase Realtime               |

> Pas de Prisma. On utilise le client Supabase directement avec les types auto-générés.

---

## Structure du projet

```
app/                        # App Router Next.js
  (auth)/                   # Routes publiques (login)
  (admin)/                  # Routes rôle admin uniquement
    admin/
      entreprises/          # Liste des workspaces (CRUD)
      utilisateurs/         # Liste des utilisateurs (CRUD)
  (bureau)/                 # Routes rôle bureau (admin N'A PAS accès)
    dashboard/
    devis/
    clients/
    inbox/
    parametres/
  (terrain)/                # Routes rôle ouvrier
    terrain/
  api/                      # API Routes
    admin/
      workspaces/           # CRUD workspaces (admin uniquement)
      users/                # CRUD utilisateurs (admin uniquement)
    agents/
      devis/
      email/
    terrain/

components/
  admin/                    # Composants du dashboard admin
    admin-sidebar.tsx       # Navigation latérale admin
    workspaces-list.tsx     # Liste + modales CRUD entreprises
    users-list.tsx          # Liste + modales CRUD utilisateurs
  layout/                   # Sidebar, navigation, layouts
  ui/                       # Composants Shadcn/ui

lib/
  supabase/
    server.ts               # Client Supabase (Server Components)
    client.ts               # Client Supabase (Client Components)
  quotes.ts                 # CRUD devis
  clients.ts                # CRUD clients
  gmail.ts                  # Gmail API
  sheets.ts                 # Google Sheets API
  agents/
    devis.ts                # Logique agent génération devis
    email.ts                # Logique agent classification email

types/
  supabase.ts               # Types auto-générés (supabase gen types)
  index.ts                  # Types métier (Quote, QuoteItem, etc.)

agents/                     # Prompts et logique agentique

scripts/
  seed-admin.ts             # Création du premier admin (utilise env vars)

docs/
  schema.md                 # Documentation du schéma BDD
```

---

## Base de données (Supabase)

### Tables principales

```sql
clients         -- id, name, email, phone, address, created_at
projects        -- id, client_id, title, description, status, created_at
quotes          -- id, project_id, status, total_ht, tva_rate, notes, validity_days, reference, created_at, sent_at
quote_items     -- id, quote_id, label, quantity, unit_price, unit
tasks           -- id, project_id, title, status, assigned_to, due_date
project_steps   -- id, project_id, label, order, completed_at, completed_by
terrain_notes   -- id, project_id, user_id, transcription, audio_url, created_at
terrain_photos  -- id, project_id, user_id, photo_url, lat, lng, created_at
materiaux_requests -- id, project_id, user_id, label, quantity, urgency, status, created_at
```

### Règles

- RLS activé sur toutes les tables
- Policies par rôle : `admin`, `bureau`, `ouvrier`
- Toujours utiliser le client server-side dans les Server Components et API routes
- Toujours utiliser le client client-side dans les Client Components
- Les types doivent être régénérés après chaque modification du schéma : `supabase gen types typescript --local > types/supabase.ts`

---

## Authentification (Supabase Auth)

### Rôles

- `admin` — dashboard admin uniquement (`/admin/*`), gestion des workspaces et utilisateurs plateforme. **N'a PAS accès aux pages bureau ou terrain.**
- `bureau` — devis, clients, inbox, dashboard (`/dashboard`, `/devis`, etc.)
- `ouvrier` — interface terrain uniquement (`/terrain`)

Le rôle est stocké dans `user.user_metadata.role`. Pour l'assigner, utiliser le dashboard Supabase ou le service role client : `supabaseService.auth.admin.updateUserById(id, { user_metadata: { role: 'bureau' } })`.

### Routing par rôle (middleware)

| Rôle    | Pages autorisées          | Redirection si autre page      |
| ------- | ------------------------- | ------------------------------ |
| admin   | `/admin/*`                | → `/admin` (depuis bureau/terrain) |
| bureau  | `/dashboard`, `/devis`, etc. | → `/profil`               |
| ouvrier | `/terrain/*`              | → `/profil`                    |

- Connexion admin : redirigé vers `/admin` (pas `/dashboard`)
- Connexion bureau/ouvrier : redirigé vers `/dashboard` ou `/terrain`

### Règles

- Le middleware Next.js protège les routes par rôle via `supabase.auth.getUser()`
- Côté server : `getUser()` et `getUserRole()` depuis `lib/supabase/server.ts`
- Côté client : `createClient()` depuis `lib/supabase/client.ts` puis `supabase.auth.signInWithPassword()` / `signOut()`
- Ne jamais exposer le `SERVICE_ROLE_KEY` côté client

---

## Dashboard Admin (`/admin`)

Espace réservé exclusivement au rôle `admin`. Séparé des routes bureau et terrain.

### Pages

- **`/admin/entreprises`** — Liste de tous les workspaces (CRUD complet)
  - Créer un workspace (nom + slug)
  - Modifier un workspace
  - Supprimer un workspace
- **`/admin/utilisateurs`** — Liste de tous les utilisateurs Supabase Auth (CRUD complet)
  - Créer un utilisateur (email, nom, rôle, mot de passe optionnel)
  - Modifier un utilisateur (email, nom, rôle)
  - Supprimer un utilisateur (avec protection : impossible de supprimer son propre compte)

### API Routes admin

- `GET /api/admin/workspaces` — liste des workspaces
- `POST /api/admin/workspaces` — créer un workspace
- `PATCH /api/admin/workspaces/[id]` — modifier un workspace
- `DELETE /api/admin/workspaces/[id]` — supprimer un workspace
- `GET /api/admin/users` — liste des utilisateurs
- `POST /api/admin/users` — créer un utilisateur
- `PATCH /api/admin/users/[id]` — modifier un utilisateur
- `DELETE /api/admin/users/[id]` — supprimer un utilisateur

Toutes ces routes vérifient `role === "admin"` avant d'agir (via `requireAdmin()`).

### Script seed admin

```bash
# Variables requises :
SEED_ADMIN_EMAIL=admin@exemple.com \
SEED_ADMIN_PASSWORD=motdepasse123 \
SEED_ADMIN_NAME="Admin" \
npx tsx scripts/seed-admin.ts
```

---

## Agents IA

### Agent Devis

- **Route** : `POST /api/agents/devis/generate`
- **Input** : brief texte du client (description travaux, matériaux, délai)
- **Output** : `{ items: QuoteItem[], notes: string }`
- Utiliser `generateObject` du Vercel AI SDK avec un schéma Zod
- Modèle : `claude-sonnet-4-5` (ou dernière version disponible)

### Agent Email

- **Classification** : `POST /api/agents/email/classify`
- **Draft réponse** : `POST /api/agents/email/draft`
- Catégories : `demande_devis`, `suivi_commande`, `question`, `autre`

### Règles générales IA

- Toujours valider le structured output avec Zod avant de persister en base
- Gérer les timeouts (max 30s) et les erreurs de l'API Anthropic
- Ne jamais exposer la clé API Anthropic côté client

---

## Interface Terrain (rôle ouvrier)

L'interface terrain est une priorité UX critique. Les ouvriers l'utilisent sur chantier, souvent dans de mauvaises conditions.

### Contraintes UI impératives

- Boutons minimum `48px` de hauteur
- Pas de tableaux, pas de menus déroulants complexes
- Maximum 3 actions par écran
- Testé sur viewport 375px (Cypress)
- Fonctionne en faible connectivité (éviter les dépendances réseau bloquantes)

### Fonctionnalités

- Notes vocales (Web Speech API → transcription)
- Upload photos (caméra directe via `capture="environment"`)
- Demande de matériaux → notification Supabase Realtime au bureau
- Check-list avancement chantier
- Signalement de problème → alerte immédiate bureau

---

## Intégrations externes

### Gmail API

- OAuth2 avec stockage des tokens dans Supabase
- Refresh automatique des tokens
- Fonctions dans `lib/gmail.ts` : `listEmails`, `getEmail`, `sendEmail`, `markAsRead`

### Google Sheets API

- Sync quotidienne via Vercel Cron
- Source de vérité : l'application (pas le Sheet)
- Fonctions dans `lib/sheets.ts`

### Resend (emails transactionnels)

- Envoi devis PDF en pièce jointe
- Accusés de réception automatiques
- Relances (J+7, J+14)
- Rapport hebdomadaire (lundi 8h via Vercel Cron)

---

## Tests

### Vitest (tests unitaires)

```bash
npm run test
```

- Tester toutes les fonctions CRUD de `lib/`
- Tester le parsing des réponses IA
- Mocker les appels Gmail et Sheets

### Cypress (tests E2E)

```bash
npm run test:e2e
```

- Flow devis complet : brief → génération → édition → envoi email
- Flow inbox : réception → classification → réponse
- Flow terrain : note vocale + photo + signalement problème
- Flow admin settings : invitation utilisateur + changement de rôle (parametres)
- **Flow admin dashboard** (`cypress/e2e/admin-dashboard.cy.ts`) :
  - Accès et redirections par rôle (admin/bureau/ouvrier)
  - Redirection admin hors bureau/terrain → `/admin`
  - CRUD entreprises (workspaces) avec API mockée
  - CRUD utilisateurs avec API mockée
- CI GitHub Actions sur chaque PR

---

## Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Google (Gmail + Sheets)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=

# Seed admin (script scripts/seed-admin.ts uniquement)
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=
```

---

## Conventions de code

- **Pas de `any`** — TypeScript strict partout
- **Server Components par défaut** — `"use client"` uniquement si nécessaire
- **Pas de `<form>` HTML natif** — utiliser `react-hook-form` + `zod`
- **Nommage** : `camelCase` pour les variables/fonctions, `PascalCase` pour les composants et types
- **API Routes** : toujours valider les inputs avec Zod avant traitement
- **Erreurs** : toujours wrapper les appels Supabase et Anthropic dans un try/catch
- **Commits** : format conventionnel — `feat:`, `fix:`, `chore:`, `test:`

---

## Roadmap (phases)

| Phase | Contenu                                              | Durée estimée |
| ----- | ---------------------------------------------------- | ------------- |
| 1     | Fondations (setup, auth, DB, UI, tests)              | 2–3 semaines  |
| 2     | Agent Devis & Commandes                              | 3–4 semaines  |
| 3     | Agent Communication Client (Gmail, inbox, relances)  | 2–3 semaines  |
| 4     | Agent Terrain (vocal, photos, matériaux, avancement) | 3–4 semaines  |
| 5     | Tâches répétitives (dashboard, rapports, Sheets)     | 2–3 semaines  |

Les tickets détaillés sont dans GitHub Issues, organisés par milestone.
