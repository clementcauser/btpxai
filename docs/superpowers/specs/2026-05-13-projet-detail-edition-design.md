# Design — Page /projets/[id] : édition et gestion des membres

**Date :** 2026-05-13  
**Statut :** Approuvé

---

## Contexte

La page de détail d'un projet (`/projets/[id]`) est actuellement en lecture seule. L'utilisateur ne peut pas modifier les informations du projet ni gérer facilement les membres. Ce design ajoute trois interactions :

1. Un bouton **"Modifier"** pour éditer le titre, la description et le statut via un panneau latéral
2. Un **badge statut cliquable** pour changer rapidement le statut sans ouvrir le formulaire complet
3. Un bouton **"Gérer"** dans la section membres pour ajouter/retirer des membres du projet via une modale

---

## Architecture

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `app/api/projets/[id]/route.ts` | Route PATCH pour mettre à jour titre, description, statut |
| `components/projets/project-edit-sheet.tsx` | Sheet latéral avec formulaire d'édition |
| `components/projets/project-status-badge.tsx` | Badge statut interactif (click → select) |
| `components/projets/project-members-dialog.tsx` | Modale de gestion des membres avec recherche |
| `components/ui/sheet.tsx` | Composant Sheet (à installer via shadcn) |

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `app/(bureau)/projets/[id]/page.tsx` | Intègre les 3 nouveaux composants |
| `components/projets/project-members-manager.tsx` | Remplacé par `ProjectMembersDialog` |

---

## Fonctionnalité 1 — Bouton "Modifier" + Sheet latéral

### Déclencheur
Bouton "Modifier" (icône crayon) en haut à droite de la carte header du projet.

### Comportement
- Ouvre un Sheet depuis la droite (composant shadcn `Sheet`)
- La page reste visible en arrière-plan
- Formulaire avec 3 champs : **Titre** (Input, requis), **Description** (Textarea, optionnel), **Statut** (Select)
- Validation avec `react-hook-form` + `zod`
- Soumission : `PATCH /api/projets/[id]`
- Succès : fermer le sheet + `router.refresh()` + toast "Projet mis à jour"
- Erreur : toast d'erreur, sheet reste ouvert

### Composant `ProjectEditSheet`
```
Props: projectId, initialTitle, initialDescription, initialStatus
État local: open (boolean)
```

---

## Fonctionnalité 2 — Badge statut cliquable

### Déclencheur
Clic sur le badge statut (ex. "En cours") dans le header du projet. Le badge affiche une petite flèche ↓ pour indiquer qu'il est interactif.

### Comportement
- Au clic : le badge se transforme en `<select>` natif (ou Select shadcn) avec les 4 statuts
- Sélection d'une valeur : appel `PATCH /api/projets/[id]` avec le nouveau statut
- Mise à jour optimiste de l'UI
- Succès : `router.refresh()` + toast discret
- Clic en dehors ou Escape : annule et revient au badge

### Composant `ProjectStatusBadge`
```
Props: projectId, initialStatus
État local: status (ProjectStatus), isEditing (boolean)
```

---

## Fonctionnalité 3 — Bouton "Gérer" + modale membres

### Déclencheur
Bouton "Gérer" (icône settings) dans le header de la section Membres.

### Comportement
Le Dialog contient :
1. **Input de recherche** en haut — filtre par nom ou email (local, sans API)
2. **Section "Dans ce projet"** (fond bleu, label + compteur) — membres actuels avec bouton `−` rouge pour retirer
3. **Séparateur**
4. **Section "Autres membres du workspace"** — membres non assignés avec bouton `+` bleu pour ajouter
5. Les actions +/− sont des appels API optimistes (même endpoints existants : `POST` et `DELETE /api/projets/[id]/members`)
6. Pas de fermeture de la modale après chaque action — l'utilisateur peut enchaîner plusieurs ajouts/retraits
7. `router.refresh()` à la fermeture de la modale pour mettre à jour l'affichage

### Composant `ProjectMembersDialog`
```
Props: projectId, members (ProjectMember[]), workspaceMembers (WorkspaceMemberWithUser[])
État local: open, search, localMembers (liste optimiste)
```

---

## Route API — `PATCH /api/projets/[id]/route.ts`

```ts
// Schéma Zod
z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
})
```

- Auth requise (Supabase `getUser()`)
- Met à jour uniquement les champs fournis (partial update)
- Retourne le projet mis à jour
- Erreurs : 401 non auth, 400 validation, 500 DB error

---

## Intégration dans la page

La page `/projets/[id]/page.tsx` reste un Server Component. Les 3 nouveaux composants sont des Client Components qui reçoivent leurs données initiales en props.

**Header** : ajouter `ProjectEditSheet` (bouton + sheet) et remplacer le badge statut statique par `ProjectStatusBadge`.

**Section membres** : remplacer `ProjectMembersManager` par `ProjectMembersDialog` (qui conserve l'affichage des pills de membres actuels + ajoute le bouton "Gérer").

---

## Installation requise

```bash
npx shadcn@latest add sheet
```

---

## Vérification

1. Cliquer "Modifier" → sheet s'ouvre avec les valeurs actuelles pré-remplies
2. Modifier le titre → sauvegarder → le titre se met à jour sur la page
3. Cliquer le badge statut → select apparaît → changer → badge mis à jour
4. Cliquer "Gérer" → modale s'ouvre avec les 2 sections
5. Rechercher "pierre" → filtrage en temps réel
6. Cliquer + sur un utilisateur → il passe dans la section "Dans ce projet"
7. Cliquer − → il retourne dans "Autres membres"
8. Fermer la modale → `router.refresh()` met à jour les pills et le compteur
