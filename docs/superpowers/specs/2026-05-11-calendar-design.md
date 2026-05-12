# Calendrier d'entreprise — Design Spec

**Date :** 2026-05-11  
**Statut :** Approuvé

---

## Contexte

L'entreprise de métallerie gère des chantiers, des RDV clients, des livraisons et des interventions terrain impliquant plusieurs ouvriers. Aujourd'hui il n'existe aucun outil dans l'application pour planifier et visualiser ces événements. Les utilisateurs bureau et admin ont besoin d'une vue d'ensemble du planning de l'entreprise, et les ouvriers ont besoin de voir uniquement les événements qui les concernent.

---

## Fonctionnalités

### Événements

Un événement comprend :
- **Titre** (obligatoire)
- **Date** (obligatoire)
- **Heure de début** (obligatoire, `timestamptz`)
- **Heure de fin** (obligatoire, `timestamptz`)
- **Type** (obligatoire, lié à `calendar_event_types`)
- **Ouvriers assignés** (1 ou plusieurs, table de jointure)
- **Description** (optionnel, textarea)

### Vues

Trois vues disponibles via des boutons toggle :
- **Mois** : grille 7 colonnes, étiquettes colorées par type avec titre tronqué, `+N autres` si overflow
- **Semaine** : 7 colonnes avec créneaux horaires, événements positionnés selon durée
- **Jour** : colonne unique, timeline heure par heure

Navigation via boutons `←` / `→` pour aller au mois/semaine/jour précédent ou suivant. Bouton `Aujourd'hui` pour revenir à la date courante.

### Permissions

| Rôle | Accès | Filtre |
|------|-------|--------|
| `admin`, `bureau` | Tous les événements du workspace | Peut filtrer par ouvrier |
| `ouvrier` | Uniquement les événements où il est assigné | Aucun filtre |

### Types d'événements

Configurables par les admins depuis les paramètres (`/parametres` → section "Types d'événements"). Chaque type a un label et une couleur hex.

**Presets fournis à la création du workspace :**
1. Chantier / Travaux
2. Rendez-vous client
3. Visite pré-chantier
4. Livraison matériaux
5. Réunion d'équipe
6. Formation / Sécurité
7. Réception de chantier
8. Permanence / Astreinte
9. Administratif

Les admins peuvent ajouter de nouveaux types, renommer ou supprimer (suppression bloquée si des événements utilisent le type).

---

## Architecture

### Schéma base de données

```sql
-- Types d'événements configurables par workspace
CREATE TABLE calendar_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label text NOT NULL,
  color text NOT NULL,          -- couleur hex ex: "#6366f1"
  is_preset boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Événements du calendrier
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  event_type_id uuid REFERENCES calendar_event_types(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Ouvriers assignés à un événement (N-N)
CREATE TABLE calendar_event_assignees (
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);
```

**RLS :**
- `bureau`/`admin` : voient tous les événements du workspace
- `ouvrier` : voient uniquement les événements où `user_id` apparaît dans `calendar_event_assignees`
- Création/modification/suppression : `bureau` et `admin` uniquement

### Routes Next.js

```
app/(bureau)/calendrier/page.tsx                    — calendrier bureau/admin
app/(terrain)/terrain/calendrier/page.tsx           — calendrier ouvrier (filtré)
app/(bureau)/parametres/                            — section types ajoutée ici
app/api/calendar/events/route.ts                    — GET, POST
app/api/calendar/events/[id]/route.ts               — PUT, DELETE
app/api/calendar/event-types/route.ts               — GET, POST
app/api/calendar/event-types/[id]/route.ts          — PUT, DELETE
```

### Composants

```
components/calendrier/
  calendar-grid.tsx           — grille principale (mois/semaine/jour), reçoit events[]
  calendar-header.tsx         — navigation ← → + toggle Mois/Sem/Jour + bouton Aujourd'hui
  calendar-event-chip.tsx     — étiquette colorée dans la grille (titre tronqué, type color)
  calendar-filters.tsx        — filtre par ouvrier (bureau/admin uniquement)
  event-dialog.tsx            — modale Dialog création/édition événement
  event-type-badge.tsx        — badge coloré avec label du type
```

### Lib / CRUD

```
lib/calendar.ts
  getEvents(supabase, workspaceId, filters)       — avec filtre période + ouvrier
  getEvent(supabase, id)
  createEvent(supabase, workspaceId, input)
  updateEvent(supabase, id, input)
  deleteEvent(supabase, id)

lib/calendar-event-types.ts
  getEventTypes(supabase, workspaceId)
  createEventType(supabase, workspaceId, input)
  updateEventType(supabase, id, input)
  deleteEventType(supabase, id)                   — erreur si type utilisé
  seedDefaultEventTypes(supabase, workspaceId)    — appelé à la création workspace
```

---

## UI / UX

### Affichage des événements (vue mois)

- Étiquettes colorées avec titre visible directement dans chaque case-jour
- La couleur de bordure gauche et du fond correspond au type d'événement
- Si plus de 3 événements sur un jour : afficher les 2 premiers + `+N autres` cliquable
- Clic sur une étiquette → ouvre la modale en mode édition
- Clic sur une case vide → ouvre la modale en mode création (date pré-remplie)

### Navigation

```
[← ] [ Mai 2025 ] [ →]    [Aujourd'hui]       [Mois] [Semaine] [Jour]
```

### Filtre par ouvrier (bureau/admin)

Chips cliquables avec avatar + prénom. Sélection multiple. "Tous" par défaut. Quand plusieurs ouvriers sont sélectionnés, le filtre est inclusif (OR) : affiche les événements où **au moins un** des ouvriers sélectionnés est assigné.

### Modale création/édition

Champs dans l'ordre :
1. Titre (input text, autofocus)
2. Date (date picker)
3. Heure début / Heure fin (côte à côte)
4. Type (select avec aperçu couleur)
5. Ouvriers assignés (combobox multi-select avec avatars)
6. Description (textarea, optionnel)

Actions : `Annuler` + `Créer` (ou `Enregistrer` en édition). En mode édition, bouton `Supprimer` en rouge en bas à gauche.

### Sidebar

Nouvelle entrée `Calendrier` avec icône `CalendarDays` ajoutée dans `components/layout/sidebar-nav.tsx`, entre "Matériaux" et "Alertes".

### Vue ouvrier

Route `/terrain/calendrier` — même interface mais :
- Filtre par ouvrier masqué
- Seuls les événements assignés à l'utilisateur connecté s'affichent
- Création d'événements désactivée (lecture seule)

---

## Paramètres — Types d'événements

Nouvelle section dans `/parametres` :
- Liste des types avec couleur et label
- Bouton `+ Ajouter un type` → mini-formulaire inline (label + color picker)
- Bouton édition et suppression par ligne
- Suppression bloquée avec message d'erreur si des événements utilisent ce type

---

## Tests

### Vitest (unitaires — `lib/calendar.ts`)
- `getEvents` filtre correctement par workspace et par ouvrier
- `createEvent` valide les champs obligatoires
- `deleteEventType` lève une erreur si le type est utilisé

### Cypress (E2E)
- Bureau : créer un événement → vérifier qu'il apparaît dans la grille mensuelle
- Bureau : filtrer par ouvrier → seuls les événements de cet ouvrier s'affichent
- Ouvrier : se connecter → ne voit que ses événements assignés, pas de bouton créer
- Navigation : cliquer `→` passe au mois suivant, `←` revient en arrière
- Admin : ajouter un type d'événement dans les paramètres → disponible dans la modale

---

## Dépendances

| Outil | Usage | Statut |
|-------|-------|--------|
| `date-fns` | Manipulation dates, navigation mois/semaine/jour | Déjà installé |
| `shadcn/ui Dialog` | Modale création/édition | Déjà disponible |
| `shadcn/ui Select` | Sélection type d'événement | Déjà disponible |
| `shadcn/ui Command` | Multi-select ouvriers | Déjà disponible |
| `shadcn/ui Popover` | Date picker, color picker | Déjà disponible |

Pas de librairie calendrier externe — implémentation custom avec Tailwind CSS.
