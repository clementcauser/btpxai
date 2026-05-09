# Design — Informations entreprise dynamiques dans le PDF devis et les emails

**Date :** 2026-05-09  
**Statut :** Approuvé

---

## Objectif

Remplacer toutes les occurrences hardcodées de "BTP × AI Métallerie" (nom, adresse, téléphone, email, SIRET, TVA) par des données dynamiques tirées des paramètres workspace. Rendre la liste des conditions générales du devis configurable depuis l'interface.

---

## Stockage

### Nouveaux champs `workspace_settings` (clé-valeur — pas de migration SQL)

| Clé | Description | Exemple |
|---|---|---|
| `company_phone` | Téléphone | `01 23 45 67 89` |
| `company_email` | Email de contact | `contact@entreprise.fr` |
| `company_tva` | N° TVA intracommunautaire | `FR12 123456789` |
| `quote_conditions` | JSON `string[]` — liste des conditions générales | `["Acompte 30%...", "..."]` |

Les champs existants `company_name`, `company_address`, `company_siret` restent inchangés.

La clé `default_cgv` (textarea libre) est abandonnée — remplacée par `quote_conditions`.

### Type partagé

```ts
// lib/settings.ts
export type CompanyInfo = {
  name: string
  address: string
  phone: string
  email: string
  siret: string
  tva: string
}
```

### Nouvelle fonction helper

```ts
// lib/settings.ts
export async function getCompanyInfo(workspaceId: string): Promise<CompanyInfo>
```

Wrap de `getMultipleSettings` sur les 6 clés company. Valeurs manquantes → chaîne vide.

---

## Paramètres — onglet Entreprise

### `CompanySection` (modifié)

Ajout de 3 champs dans le formulaire `react-hook-form` :
- Téléphone (`company_phone`)
- Email de contact (`company_email`)
- N° TVA intracommunautaire (`company_tva`, `font-mono`)

Schéma Zod mis à jour. Route `POST /api/parametres/company` mise à jour.

### `CgvSection` (supprimé)

Remplacé par `QuoteConditionsSection`.

### `QuoteConditionsSection` (nouveau)

Composant `"use client"` utilisant `react-hook-form` + `useFieldArray`.

**UX :**
- Titre de section : "Conditions générales du devis"  
- Sous-titre explicatif : _"Chaque ligne correspond à une condition affichée dans le PDF du devis."_
- Liste numérotée de champs `<Input>` (un par condition)
- Bouton `×` pour supprimer une ligne
- Bouton "+ Ajouter une condition" en bas de liste
- Bouton "Sauvegarder" → `PATCH /api/parametres/settings` avec `key: "quote_conditions"`, `value: JSON.stringify(conditions)`

Données initiales : parse JSON de `settings.quote_conditions ?? "[]"`. Si vide, afficher un champ vide par défaut pour guider l'utilisateur.

---

## PDF (`QuotePDFDocument`)

### Props

```ts
interface Props {
  quote: QuoteWithContext
  company: CompanyInfo
  conditions: string[]
}
```

### Changements

- Supprimer la constante `COMPANY` hardcodée
- Utiliser `company.name`, `company.address`, `company.phone`, `company.email`, `company.siret`, `company.tva` partout (header, footer, signature, `<Document author>`)
- Section "Conditions générales" : rendue depuis `conditions[]`. Si vide → section masquée.

---

## Route PDF (`/api/devis/[id]/pdf`)

```ts
const [company, conditionsRaw] = await Promise.all([
  getCompanyInfo(workspaceId),
  getAppSetting(workspaceId, "quote_conditions"),
])
const conditions: string[] = JSON.parse(conditionsRaw ?? "[]")
```

Récupérer `workspaceId` via `requireWorkspace(user.id)`.

---

## Templates email & routes

### Templates (`lib/email/quote.ts`, `reminder.ts`, `weekly-report.ts`)

Chaque template accepte `company: CompanyInfo` en paramètre. Les strings hardcodées ("BTP × AI Métallerie", SIRET, email) sont remplacées par les champs `company.*`.

### Routes API

Les 3 routes qui appellent ces templates font un `getCompanyInfo(workspaceId)` avant l'envoi :
- `app/api/devis/[id]/send/route.ts`
- `app/api/cron/quote-reminders/route.ts`
- `app/api/cron/weekly-report/route.ts`

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `lib/settings.ts` | + `CompanyInfo` type + `getCompanyInfo()` |
| `components/devis/quote-pdf-document.tsx` | refactor props, remove COMPANY constant |
| `app/api/devis/[id]/pdf/route.ts` | fetch company + conditions |
| `components/parametres/company-section.tsx` | + 3 champs (phone, email, tva) |
| `app/api/parametres/company/route.ts` | + 3 champs dans schema Zod |
| `app/(bureau)/parametres/page.tsx` | + nouveaux SETTINGS_KEYS |
| `components/parametres/settings-shell.tsx` | swap CgvSection → QuoteConditionsSection |
| `components/parametres/quote-conditions-section.tsx` | **nouveau** |
| `lib/email/quote.ts` | accept `company: CompanyInfo` param |
| `lib/email/reminder.ts` | accept `company: CompanyInfo` param |
| `lib/email/weekly-report.ts` | accept `company: CompanyInfo` param |
| `app/api/devis/[id]/send/route.ts` | fetch company, pass to template |
| `app/api/cron/quote-reminders/route.ts` | fetch company, pass to template |
| `app/api/cron/weekly-report/route.ts` | fetch company, pass to template |

---

## Hors scope

- Internationalisation des templates email
- Modification des tests Cypress existants (hors périmètre de ce ticket)
- Rendre le nom d'entreprise dynamique dans les métadonnées `<title>` des pages Next.js
