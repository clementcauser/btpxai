# Schéma de base de données

Base de données Supabase (Postgres). RLS activé sur toutes les tables.

## Enums

| Nom | Valeurs |
|-----|---------|
| `project_status` | `planned`, `in_progress`, `completed`, `cancelled` |
| `quote_status` | `draft`, `sent`, `accepted`, `rejected`, `expired` |
| `task_status` | `todo`, `in_progress`, `done`, `blocked` |

---

## Tables

### `clients`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `email` | `text` | — |
| `phone` | `text` | — |
| `address` | `text` | — |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

---

### `projects`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `client_id` | `uuid` | NOT NULL, FK → `clients.id` ON DELETE RESTRICT |
| `title` | `text` | NOT NULL |
| `description` | `text` | — |
| `status` | `project_status` | NOT NULL, default `planned` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

---

### `quotes`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `project_id` | `uuid` | NOT NULL, FK → `projects.id` ON DELETE CASCADE |
| `status` | `quote_status` | NOT NULL, default `draft` |
| `total_ht` | `numeric(10,2)` | NOT NULL, default `0` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `sent_at` | `timestamptz` | — |

---

### `quote_items`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `quote_id` | `uuid` | NOT NULL, FK → `quotes.id` ON DELETE CASCADE |
| `label` | `text` | NOT NULL |
| `quantity` | `numeric(10,2)` | NOT NULL |
| `unit_price` | `numeric(10,2)` | NOT NULL |
| `unit` | `text` | — |

---

### `tasks`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | `uuid` | PK |
| `project_id` | `uuid` | NOT NULL, FK → `projects.id` ON DELETE CASCADE |
| `title` | `text` | NOT NULL |
| `status` | `task_status` | NOT NULL, default `todo` |
| `assigned_to` | `uuid` | FK → `auth.users.id` ON DELETE SET NULL |
| `due_date` | `date` | — |

---

## Relations

```
clients
  └── projects (client_id → clients.id, RESTRICT)
        └── quotes (project_id → projects.id, CASCADE)
        │     └── quote_items (quote_id → quotes.id, CASCADE)
        └── tasks (project_id → projects.id, CASCADE)
```

---

## RLS & Policies

RLS activé sur toutes les tables. Les policies actuelles accordent un accès complet à tout utilisateur authentifié (`auth.uid() IS NOT NULL`).

> **TODO** : Affiner les policies par rôle (`admin`, `bureau`, `ouvrier`) dans une migration dédiée `20260427000003_rls_role_based_policies.sql` une fois Better-Auth intégré.

---

## Régénérer les types TypeScript

Après toute modification du schéma :

```bash
npx supabase gen types typescript --linked > types/supabase.ts
```
