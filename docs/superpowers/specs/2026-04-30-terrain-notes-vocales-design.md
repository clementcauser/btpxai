# Terrain — Notes Vocales

**Date:** 2026-04-30  
**Branch:** 22-terrain-notes-vocales  
**Status:** Approved

---

## Objectif

Permettre aux ouvriers d'enregistrer des notes vocales horodatées sur un chantier. La transcription est faite dans le navigateur via Web Speech API (chemin principal) ou côté serveur via OpenAI Whisper (fallback). L'audio original est conservé dans Supabase Storage. Le bureau peut consulter les notes dans la fiche client.

---

## 1. Base de données

Nouvelle migration Supabase créant la table `terrain_notes` (déjà documentée dans `docs/schema.md`, pas encore appliquée).

```sql
create table terrain_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  transcription text,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table terrain_notes enable row level security;
```

**RLS policies :**
- `ouvrier` : INSERT propres lignes, SELECT propres lignes
- `bureau` + `admin` : SELECT toutes les lignes

**Bucket Supabase Storage :** `terrain-audio` (privé, accès via URL signée)

---

## 2. API Routes

### `POST /api/terrain/notes`

- **Content-Type :** `multipart/form-data`
- **Champs :**
  - `project_id` (string, requis)
  - `transcription` (string, optionnel — présent si Web Speech a fonctionné)
  - `audio` (File, optionnel — présent si fallback MediaRecorder)

**Logique serveur :**
1. Valider les inputs avec Zod
2. Récupérer `user_id` depuis la session Supabase
3. Si `audio` présent et pas de `transcription` :
   - Upload du fichier dans le bucket `terrain-audio` (path : `{project_id}/{uuid}.webm`)
   - Appel OpenAI Whisper `POST /v1/audio/transcriptions` (model: `whisper-1`, language: `fr`)
   - Récupérer l'URL publique/signée du fichier uploadé
4. Insérer une ligne dans `terrain_notes`
5. Retourner la note sauvegardée en JSON

### `GET /api/terrain/notes?project_id=xxx`

- Retourne toutes les notes du projet, triées par `created_at DESC`
- Utilisé par la vue bureau (fetch côté serveur)

---

## 3. Composant `NotesTab`

Fichier : `components/terrain/notes-tab.tsx` (existe déjà, à mettre à jour)

**États UI :** `idle` → `recording` → `uploading` (fallback uniquement) → note dans la liste

**Chemin principal (Web Speech disponible) :**
1. Chargement : fetch `GET /api/terrain/notes?project_id` pour afficher les notes existantes
2. Après `recognition.onresult` : POST `{ project_id, transcription }` → remplacer la note locale par la note retournée par l'API

**Chemin fallback (Web Speech absent) :**
1. Détecter l'absence de `SpeechRecognition` au montage
2. Afficher le bouton "Enregistrer un fichier audio" (même style que le bouton principal)
3. Utiliser `MediaRecorder` API pour enregistrer
4. À l'arrêt : POST `multipart/form-data` avec blob audio + `project_id`
5. Afficher un spinner "Transcription en cours…" pendant l'appel Whisper
6. La note apparaît dans la liste une fois la réponse reçue

---

## 4. Vue bureau — Fiche client

Fichier : `app/(bureau)/clients/[id]/page.tsx` (existe déjà, à étendre)

Sous chaque projet listé dans la fiche client, ajouter une section "Notes vocales" :
- Fetch server-side via Supabase : `terrain_notes` WHERE `project_id = project.id`
- Affichage : timestamp (date + heure), texte de transcription, bouton lecture audio si `audio_url` présent (`<audio>` HTML natif)
- Section collapsible si > 3 notes (pour ne pas surcharger la page)

---

## Critères d'acceptation

- Transcription disponible en moins de 5 secondes (Web Speech)
- Audio original conservé dans Supabase Storage
- Notes visibles côté bureau avec horodatage
- Fallback Whisper fonctionnel quand Web Speech indisponible

---

## Variables d'environnement requises

```env
OPENAI_API_KEY=   # pour Whisper (fallback uniquement)
```

---

## Tests

- **Vitest** : `POST /api/terrain/notes` avec et sans audio (mock Whisper + Supabase)
- **Cypress** : flow complet — enregistrement note vocale sur `/terrain/[projectId]` → vérification apparition dans la liste
