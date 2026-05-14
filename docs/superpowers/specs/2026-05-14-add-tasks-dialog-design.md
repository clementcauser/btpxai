# Design — Modale d'ajout de tâches

**Date :** 2026-05-14  
**Contexte :** Page de détail projet (`/projets/[id]`), section Tâches

---

## Objectif

Permettre à l'utilisateur d'ajouter rapidement une série de tâches à un projet depuis la page de détail, sans quitter la page.

---

## Composants

### 1. `AddTasksDialog` — `components/projets/add-tasks-dialog.tsx`

Composant client (`"use client"`).

**Props :**
```ts
interface AddTasksDialogProps {
  projectId: string
}
```

**État interne :**
- `open: boolean` — contrôle le Dialog
- `tasks: string[]` — liste des titres en cours de saisie (initialisée à `[""]`)
- `isPending: boolean` — état de chargement pendant le submit

**Comportement :**
- À l'ouverture : reset à `[""]`, focus automatique sur le premier champ
- `Enter` dans un champ : ajoute une nouvelle ligne vide et focus dessus
- `×` sur une ligne : supprime cette ligne (bouton masqué si une seule ligne reste)
- `+ Ajouter une tâche` : bouton en bas qui ajoute une ligne vide
- Submit : filtre les lignes vides, appelle `POST /api/projets/[id]/tasks`, ferme la modale, `router.refresh()` dans `startTransition`
- Si toutes les lignes sont vides : le bouton Submit est désactivé
- Erreur : toast.error ; succès : toast.success avec le nombre de tâches ajoutées

---

### 2. Route API — `app/api/projets/[id]/tasks/route.ts`

**`POST /api/projets/[id]/tasks`**

Body attendu :
```ts
{ titles: string[] }
```

Validation zod :
```ts
z.object({
  titles: z.array(z.string().min(1).max(500)).min(1).max(50)
})
```

Logique :
1. `getUser()` → 401 si absent
2. `getUserRole()` → 403 si `ouvrier`
3. `requireWorkspace(user.id)` → récupère `workspaceId`
4. Bulk insert dans `tasks` : `{ project_id, workspace_id, title, status: "todo" }`
5. Retourne `{ tasks: [...] }` avec status 201

---

### 3. Intégration — `app/(bureau)/projets/[id]/page.tsx`

Dans le header de la section Tâches, remplacer le `<SectionHeader>` seul par un `flex` avec `SectionHeader` + `<AddTasksDialog projectId={project.id} />`.

---

## Contraintes

- Pas de champs `assigned_to` ni `due_date` dans ce formulaire (ajout rapide uniquement)
- `status` par défaut à `"todo"` pour toutes les tâches créées
- Maximum 50 tâches par soumission (limite zod côté API)
- Le composant est purement additif — aucune modification du rendu serveur existant
