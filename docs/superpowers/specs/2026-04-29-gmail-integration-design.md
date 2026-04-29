# Gmail Integration — Design Spec

**Date :** 2026-04-29  
**Branche :** `15-email-connexion-gmail-api`  
**Périmètre :** Connexion OAuth2 Gmail API, `lib/gmail.ts`, page Inbox, tests Vitest

---

## Contexte

L'application doit accéder à la boîte mail de l'entreprise via Gmail API. Il s'agit d'**une seule boîte partagée** (ex. `contact@entreprise.fr`), pas d'un accès par utilisateur. Les rôles `admin` et `bureau` peuvent connecter/déconnecter la boîte. La connexion se gère depuis la page `/parametres`.

---

## Base de données

Nouvelle table `gmail_connections` :

```sql
CREATE TABLE gmail_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

- Une seule ligne autorisée (vérification applicative à l'upsert)
- RLS : lecture/écriture pour `admin` et `bureau` uniquement
- Pas de FK utilisateur — ressource d'entreprise

---

## Flow OAuth2

### Connexion

1. Clic "Connecter Gmail" sur `/parametres` → `GET /api/gmail/auth`
2. Redirect vers Google consent screen — scopes : `gmail.readonly`, `gmail.send`, `gmail.modify`
3. Callback Google → `GET /api/gmail/callback?code=...`
4. Échange du code → `access_token` + `refresh_token`, upsert dans `gmail_connections`
5. Redirect vers `/parametres?gmail=connected`

### Déconnexion

- `DELETE /api/gmail/auth` → supprime la ligne en base, révoque le token côté Google

### Refresh automatique

- Dans `lib/gmail.ts`, helper `getValidAccessToken()` vérifie `expires_at` avant chaque appel
- Si expiré : appel Google `/oauth2/v4/token`, mise à jour de `access_token` et `expires_at` en base
- Toutes les fonctions publiques passent par ce helper — jamais d'accès direct aux tokens

---

## `lib/gmail.ts`

### Types

```ts
interface EmailSummary {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  isRead: boolean
}

interface EmailDetail extends EmailSummary {
  body: string  // HTML ou texte brut
}
```

### Fonctions publiques

```ts
listEmails(options?: { maxResults?: number; query?: string }): Promise<EmailSummary[]>
getEmail(id: string): Promise<EmailDetail>
sendEmail(to: string, subject: string, body: string, replyToMessageId?: string): Promise<void>
markAsRead(id: string): Promise<void>
```

### Helper interne

```ts
getValidAccessToken(): Promise<string>
// Lit gmail_connections, rafraîchit si expiré, retourne un access_token valide
```

---

## API Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/gmail/auth` | Démarre le flow OAuth2 (redirect Google) |
| `GET` | `/api/gmail/callback` | Reçoit le code, stocke les tokens |
| `DELETE` | `/api/gmail/auth` | Déconnecte la boîte |

Les routes vérifient que l'utilisateur est connecté avec le rôle `admin` ou `bureau` via Better-Auth.

---

## Page Inbox (`/inbox`)

### Layout

- **Desktop** : deux colonnes (liste à gauche, détail à droite)
- **Mobile** : une colonne (liste d'abord, détail en vue séparée)

### Liste des emails

- Chargée en RSC via `listEmails({ maxResults: 50 })`
- Chaque item : expéditeur, objet, snippet, date, badge "non lu"
- Clic → charge le détail + appelle `markAsRead`

### Détail email

- Corps HTML affiché dans un `<iframe>` sandboxé (`sandbox="allow-same-origin"`) ou texte brut
- Bouton "Répondre" → formulaire inline (destinataire pré-rempli, objet avec `Re:`)
- Envoi via `sendEmail` avec `replyToMessageId`

### État non-connecté

- Si aucune ligne dans `gmail_connections` → bannière informative avec lien vers `/parametres`

### Composants

- `InboxLayout` (Server Component) — chargement initial de la liste
- `EmailList` (Client Component) — sélection, état actif
- `EmailDetail` (Client Component) — affichage détail, formulaire réponse
- `GmailConnectionBanner` — affiché si non connecté

---

## Page Paramètres (`/parametres`)

Ajout d'une section "Boîte mail" :

- **État connecté** : email connecté + date connexion + bouton "Déconnecter"
- **État non-connecté** : bouton "Connecter Gmail"

---

## Tests Vitest

Fichier : `lib/gmail.test.ts`

| Fonction | Cas testés |
|----------|-----------|
| `getValidAccessToken` | Token valide (pas de refresh), token expiré (refresh + update base) |
| `listEmails` | Construction requête, mapping `EmailSummary`, liste vide |
| `getEmail` | Parsing body HTML, parsing texte brut |
| `sendEmail` | Encodage base64url RFC 2822, avec et sans `replyToMessageId` |
| `markAsRead` | Appel PATCH avec `{ removeLabelIds: ['UNREAD'] }` |

Mocks : client Supabase via `vi.mock`, `fetch` global pour les appels Google API.

---

## Variables d'environnement

Déjà présentes dans `lib/env.ts` :
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Aucune variable supplémentaire nécessaire. L'URL de callback est construite depuis `NEXT_PUBLIC_APP_URL`.
