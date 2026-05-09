# Dynamic Company Info in PDF & Emails — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded "BTP × AI Métallerie" occurrences with dynamic workspace settings data, and make the conditions générales in the devis PDF configurable.

**Architecture:** A shared `CompanyInfo` type + `getCompanyInfo()` helper in `lib/settings.ts` is the single source of truth. All PDF and email generation functions accept `company: CompanyInfo` as a parameter. Conditions générales are stored as a JSON string array under the key `quote_conditions` in `workspace_settings`.

**Tech Stack:** Next.js App Router, TypeScript strict, `react-hook-form` + `useFieldArray`, `@react-pdf/renderer`, Resend, Supabase key-value settings store.

---

## File Map

| File | Action |
|---|---|
| `lib/settings.ts` | Add `CompanyInfo` type + `getCompanyInfo()` helper |
| `components/parametres/company-section.tsx` | Add phone, email, TVA fields |
| `app/api/parametres/company/route.ts` | Add new fields to Zod schema + save logic |
| `components/parametres/quote-conditions-section.tsx` | **New** — FieldArray UI for conditions générales |
| `components/parametres/settings-shell.tsx` | Swap `CgvSection` → `QuoteConditionsSection` |
| `app/(bureau)/parametres/page.tsx` | Add new keys to `SETTINGS_KEYS` |
| `components/devis/quote-pdf-document.tsx` | Accept `company` + `conditions` props, remove `COMPANY` constant |
| `app/api/devis/[id]/pdf/route.ts` | Fetch company + conditions, pass to PDF |
| `app/api/devis/[id]/send/route.ts` | Fetch company, pass to PDF render + email template |
| `lib/email/quote.ts` | Accept `company: CompanyInfo` param |
| `lib/email/reminder.ts` | Accept `company: CompanyInfo` param |
| `lib/email/weekly-report.ts` | Accept `company: CompanyInfo` param |
| `app/api/cron/quote-reminders/route.ts` | Fetch company per workspace, pass to email |
| `app/api/cron/weekly-report/route.ts` | Fetch company per workspace, pass to email |
| `tests/unit/weekly-report.test.ts` | Update test that checks for hardcoded company name |

---

## Task 1 — Add `CompanyInfo` type and `getCompanyInfo()` to `lib/settings.ts`

**Files:**
- Modify: `lib/settings.ts`

This is the foundation. All other tasks depend on this type and function.

- [ ] **Step 1: Add type and function**

Open `lib/settings.ts` and append the following after the existing exports:

```ts
export type CompanyInfo = {
  name: string
  address: string
  phone: string
  email: string
  siret: string
  tva: string
}

const COMPANY_KEYS = [
  "company_name",
  "company_address",
  "company_phone",
  "company_email",
  "company_siret",
  "company_tva",
] as const

export async function getCompanyInfo(workspaceId: string): Promise<CompanyInfo> {
  const s = await getMultipleSettings(workspaceId, [...COMPANY_KEYS])
  return {
    name: s.company_name ?? "",
    address: s.company_address ?? "",
    phone: s.company_phone ?? "",
    email: s.company_email ?? "",
    siret: s.company_siret ?? "",
    tva: s.company_tva ?? "",
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/settings.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/settings.ts
git commit -m "feat: add CompanyInfo type and getCompanyInfo helper"
```

---

## Task 2 — Add phone, email, TVA fields to `CompanySection`

**Files:**
- Modify: `components/parametres/company-section.tsx`
- Modify: `app/api/parametres/company/route.ts`

- [ ] **Step 1: Update the Zod schema in `company-section.tsx`**

Replace the schema at the top of the file:

```ts
const schema = z.object({
  company_name: z.string().max(200),
  company_address: z.string().max(500),
  company_siret: z.string().max(20),
  company_phone: z.string().max(30),
  company_email: z.string().max(200),
  company_tva: z.string().max(30),
})
```

- [ ] **Step 2: Add the new fields to `defaultValues`**

Replace the `defaultValues` block in `useForm`:

```ts
defaultValues: {
  company_name: initialSettings.company_name ?? "",
  company_address: initialSettings.company_address ?? "",
  company_siret: initialSettings.company_siret ?? "",
  company_phone: initialSettings.company_phone ?? "",
  company_email: initialSettings.company_email ?? "",
  company_tva: initialSettings.company_tva ?? "",
},
```

- [ ] **Step 3: Add 3 new form fields in the JSX**

After the SIRET `<div>` block (before the submit button div), add:

```tsx
{/* Téléphone */}
<div className="space-y-1.5">
  <Label htmlFor="company_phone" className="text-xs tracking-wider uppercase text-muted-foreground">
    Téléphone
  </Label>
  <Input
    id="company_phone"
    data-testid="company-phone-input"
    placeholder="01 23 45 67 89"
    {...register("company_phone")}
  />
  {errors.company_phone && (
    <p className="text-xs text-destructive">{errors.company_phone.message}</p>
  )}
</div>

{/* Email de contact */}
<div className="space-y-1.5">
  <Label htmlFor="company_email" className="text-xs tracking-wider uppercase text-muted-foreground">
    Email de contact
  </Label>
  <Input
    id="company_email"
    data-testid="company-email-input"
    type="email"
    placeholder="contact@entreprise.fr"
    {...register("company_email")}
  />
  {errors.company_email && (
    <p className="text-xs text-destructive">{errors.company_email.message}</p>
  )}
</div>

{/* N° TVA */}
<div className="space-y-1.5">
  <Label htmlFor="company_tva" className="text-xs tracking-wider uppercase text-muted-foreground">
    N° TVA intracommunautaire
  </Label>
  <Input
    id="company_tva"
    data-testid="company-tva-input"
    placeholder="FR12 123456789"
    className="font-mono"
    {...register("company_tva")}
  />
  {errors.company_tva && (
    <p className="text-xs text-destructive">{errors.company_tva.message}</p>
  )}
</div>
```

- [ ] **Step 4: Update the API route `app/api/parametres/company/route.ts`**

Replace the `COMPANY_KEYS` array and `bodySchema`:

```ts
const COMPANY_KEYS = [
  "company_name",
  "company_address",
  "company_siret",
  "company_logo_url",
  "company_phone",
  "company_email",
  "company_tva",
]

const bodySchema = z.object({
  company_name: z.string().max(200),
  company_address: z.string().max(500),
  company_siret: z.string().max(20),
  company_phone: z.string().max(30),
  company_email: z.string().max(200),
  company_tva: z.string().max(30),
})
```

Replace the `POST` save block (the `await Promise.all([...])` call):

```ts
const { company_name, company_address, company_siret, company_phone, company_email, company_tva } = parsed.data
await Promise.all([
  setAppSetting(workspaceId, "company_name", company_name),
  setAppSetting(workspaceId, "company_address", company_address),
  setAppSetting(workspaceId, "company_siret", company_siret),
  setAppSetting(workspaceId, "company_phone", company_phone),
  setAppSetting(workspaceId, "company_email", company_email),
  setAppSetting(workspaceId, "company_tva", company_tva),
])
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/parametres/company-section.tsx app/api/parametres/company/route.ts
git commit -m "feat: add phone, email, TVA fields to company settings"
```

---

## Task 3 — Create `QuoteConditionsSection` component

**Files:**
- Create: `components/parametres/quote-conditions-section.tsx`

This component replaces the old `CgvSection` (textarea). It uses `useFieldArray` to let the user manage a numbered list of conditions générales. Each item maps to one bullet point in the PDF.

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { FileText, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FormValues = {
  conditions: { text: string }[]
}

type Props = {
  initialConditions: string[]
}

export function QuoteConditionsSection({ initialConditions }: Props) {
  const { control, register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      conditions: initialConditions.length > 0
        ? initialConditions.map((text) => ({ text }))
        : [{ text: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" })
  const [saved, setSaved] = useState(false)

  async function onSubmit(data: FormValues) {
    const conditions = data.conditions.map((c) => c.text).filter(Boolean)
    const res = await fetch("/api/parametres/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "quote_conditions", value: JSON.stringify(conditions) }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <FileText className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Conditions générales du devis
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Chaque ligne correspond à une condition affichée dans le PDF du devis.
          1 ligne = 1 condition générale.
        </p>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                {index + 1}.
              </span>
              <Input
                {...register(`conditions.${index}.text`)}
                placeholder={`Condition ${index + 1}…`}
                className="text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => append({ text: "" })}
        >
          <Plus className="size-3.5" />
          Ajouter une condition
        </Button>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            Sauvegarder
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-primary animate-in fade-in duration-200">
              <CheckCircle2 className="size-3.5" />
              Sauvegardé
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
```

> **Note:** Add `import { useState } from "react"` at the top — it's used for `saved` state.

Full import block for the file:

```tsx
"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { FileText, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/parametres/quote-conditions-section.tsx
git commit -m "feat: add QuoteConditionsSection with field array UI"
```

---

## Task 4 — Wire `QuoteConditionsSection` into `SettingsShell` and update the page

**Files:**
- Modify: `components/parametres/settings-shell.tsx`
- Modify: `app/(bureau)/parametres/page.tsx`

- [ ] **Step 1: Update `settings-shell.tsx`**

Replace the `CgvSection` import with `QuoteConditionsSection`:

```ts
// Remove:
import { CgvSection } from "./cgv-section"
// Add:
import { QuoteConditionsSection } from "./quote-conditions-section"
```

In the `entreprise` tab content, replace `<CgvSection initialCgv={settings.default_cgv ?? ""} />` with:

```tsx
<QuoteConditionsSection
  initialConditions={(() => {
    try {
      const parsed: unknown = JSON.parse(settings.quote_conditions ?? "[]")
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch {
      return []
    }
  })()}
/>
```

- [ ] **Step 2: Update `SETTINGS_KEYS` in `app/(bureau)/parametres/page.tsx`**

Replace the existing `SETTINGS_KEYS` array:

```ts
const SETTINGS_KEYS = [
  "company_name",
  "company_address",
  "company_siret",
  "company_logo_url",
  "company_phone",
  "company_email",
  "company_tva",
  "weekly_report_recipients",
  "weekly_report_enabled",
  "auto_reminders_enabled",
  "reminder_delay_j7",
  "reminder_delay_j14",
  "quote_conditions",
  "sheets_spreadsheet_url",
]
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Delete the now-unused `CgvSection` file**

```bash
rm components/parametres/cgv-section.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/parametres/settings-shell.tsx app/(bureau)/parametres/page.tsx
git rm components/parametres/cgv-section.tsx
git commit -m "feat: wire QuoteConditionsSection into settings UI, remove CgvSection"
```

---

## Task 5 — Refactor `QuotePDFDocument` to accept dynamic company + conditions

**Files:**
- Modify: `components/devis/quote-pdf-document.tsx`

- [ ] **Step 1: Update imports and Props interface**

At the top of the file, add the import for `CompanyInfo`:

```ts
import type { QuoteWithContext } from "@/types"
import type { CompanyInfo } from "@/lib/settings"
```

Replace the entire `COMPANY` constant block:

```ts
// DELETE this block entirely:
const COMPANY = {
  name: "BTP × AI Métallerie",
  address: "12 rue de la Forge, 75001 Paris",
  phone: "01 23 45 67 89",
  email: "contact@btpxai.fr",
  siret: "123 456 789 00010",
  tva_intracommunautaire: "FR12 123456789",
}
```

Replace the `Props` interface and component signature:

```ts
interface Props {
  quote: QuoteWithContext
  company: CompanyInfo
  conditions: string[]
}

export function QuotePDFDocument({ quote, company, conditions }: Props) {
```

- [ ] **Step 2: Replace all `COMPANY.*` references in the JSX**

Use the table below to find and replace each occurrence:

| Old | New |
|---|---|
| `COMPANY.name` | `company.name` |
| `COMPANY.address` | `company.address` |
| `COMPANY.phone` | `company.phone` |
| `COMPANY.email` | `company.email` |
| `COMPANY.siret` | `company.siret` |
| `COMPANY.tva_intracommunautaire` | `company.tva` |

There are 5 places in the header block, the signature block, the footer, and the `<Document>` author prop.

- [ ] **Step 3: Replace the hardcoded conditions array**

Find the "Conditions générales" section (currently contains a hardcoded array). Replace with:

```tsx
{/* ── Conditions générales ────────────────────────────────────── */}
{conditions.length > 0 && (
  <View style={s.conditionsSection}>
    <Text style={s.notesLabel}>Conditions générales</Text>
    {conditions.map((cond, i) => (
      <View key={i} style={s.conditionsRow}>
        <Text style={s.conditionsBullet}>—</Text>
        <Text style={s.conditionsText}>{cond}</Text>
      </View>
    ))}
  </View>
)}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors in the PDF route and send route (they don't pass `company` yet — that's fine, fixed in next tasks).

- [ ] **Step 5: Commit**

```bash
git add components/devis/quote-pdf-document.tsx
git commit -m "feat: make QuotePDFDocument accept dynamic company and conditions props"
```

---

## Task 6 — Update the PDF API route to fetch and pass company data

**Files:**
- Modify: `app/api/devis/[id]/pdf/route.ts`

- [ ] **Step 1: Add imports**

Add to the import block:

```ts
import { requireWorkspace } from "@/lib/workspaces"
import { getCompanyInfo, getAppSetting } from "@/lib/settings"
```

- [ ] **Step 2: Fetch company info and conditions before rendering**

After `const supabase = await createClient()` and before the quote fetch, add:

```ts
const { workspaceId } = await requireWorkspace(user.id)

const [company, conditionsRaw] = await Promise.all([
  getCompanyInfo(workspaceId),
  getAppSetting(workspaceId, "quote_conditions"),
])
const conditions: string[] = (() => {
  try {
    const parsed: unknown = JSON.parse(conditionsRaw ?? "[]")
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
})()
```

- [ ] **Step 3: Pass props to `QuotePDFDocument`**

Replace:

```ts
const element = React.createElement(QuotePDFDocument, { quote }) as any
```

With:

```ts
const element = React.createElement(QuotePDFDocument, { quote, company, conditions }) as any
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors from this file.

- [ ] **Step 5: Commit**

```bash
git add app/api/devis/[id]/pdf/route.ts
git commit -m "feat: fetch dynamic company info in PDF generation route"
```

---

## Task 7 — Update the devis send route

**Files:**
- Modify: `app/api/devis/[id]/send/route.ts`

The send route also renders the PDF and sends the email. Both need the company info.

- [ ] **Step 1: Add imports**

Add to the import block:

```ts
import { requireWorkspace } from "@/lib/workspaces"
import { getCompanyInfo, getAppSetting } from "@/lib/settings"
```

- [ ] **Step 2: Fetch company + conditions before PDF render**

After `const supabase = await createClient()`, add:

```ts
const { workspaceId } = await requireWorkspace(user.id)

const [company, conditionsRaw] = await Promise.all([
  getCompanyInfo(workspaceId),
  getAppSetting(workspaceId, "quote_conditions"),
])
const conditions: string[] = (() => {
  try {
    const parsed: unknown = JSON.parse(conditionsRaw ?? "[]")
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
})()
```

- [ ] **Step 3: Pass props to `QuotePDFDocument`**

Replace:

```ts
const element = React.createElement(QuotePDFDocument, { quote }) as any
```

With:

```ts
const element = React.createElement(QuotePDFDocument, { quote, company, conditions }) as any
```

- [ ] **Step 4: Pass company to the email builder and update the `from` field**

Replace:

```ts
from: "BTP × AI Métallerie <devis@btpxai.fr>",
subject: buildQuoteEmailSubject(quote),
html: buildQuoteEmailHtml(quote),
```

With:

```ts
from: `${company.name || "Devis"} <devis@btpxai.fr>`,
subject: buildQuoteEmailSubject(quote, company),
html: buildQuoteEmailHtml(quote, company),
```

- [ ] **Step 5: Type-check** (will show errors in email functions — that's expected, fixed in Task 8)

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/devis/[id]/send/route.ts
git commit -m "feat: pass dynamic company info to devis send route"
```

---

## Task 8 — Update email templates to accept `company: CompanyInfo`

**Files:**
- Modify: `lib/email/quote.ts`
- Modify: `lib/email/reminder.ts`
- Modify: `lib/email/weekly-report.ts`

### `lib/email/quote.ts`

- [ ] **Step 1: Add import**

```ts
import type { CompanyInfo } from "@/lib/settings"
```

- [ ] **Step 2: Update `buildQuoteEmailSubject`**

```ts
export function buildQuoteEmailSubject(quote: QuoteWithContext, company: CompanyInfo): string {
  const ref = quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
  return `Votre devis ${ref} — ${company.name}`
}
```

- [ ] **Step 3: Update `buildQuoteEmailHtml`**

```ts
export function buildQuoteEmailHtml(quote: QuoteWithContext, company: CompanyInfo): string {
```

Inside the HTML template, replace all hardcoded strings:

| Old | New |
|---|---|
| `BTP × AI Métallerie` (header `<p>`) | `${company.name}` |
| `12 rue de la Forge, 75001 Paris · 01 23 45 67 89` | `${company.address}${company.phone ? ` · ${company.phone}` : ""}` |
| `L'équipe BTP × AI Métallerie` | `L'équipe ${company.name}` |
| `BTP × AI Métallerie · SIRET 123 456 789 00010 · contact@btpxai.fr` | `${company.name}${company.siret ? ` · SIRET ${company.siret}` : ""}${company.email ? ` · ${company.email}` : ""}` |

### `lib/email/reminder.ts`

- [ ] **Step 4: Add import**

```ts
import type { CompanyInfo } from "@/lib/settings"
```

- [ ] **Step 5: Update `buildReminderSubject`** — subject doesn't use the company name, no change needed.

- [ ] **Step 6: Update `buildReminderHtml`**

```ts
export function buildReminderHtml(
  quote: QuoteWithContext,
  type: ReminderType,
  company: CompanyInfo,
): string {
```

Inside the HTML template, apply the same replacements as quote.ts:

| Old | New |
|---|---|
| `BTP × AI Métallerie` (header) | `${company.name}` |
| `12 rue de la Forge, 75001 Paris · 01 23 45 67 89` | `${company.address}${company.phone ? ` · ${company.phone}` : ""}` |
| `L'équipe BTP × AI Métallerie` | `L'équipe ${company.name}` |
| `BTP × AI Métallerie · SIRET 123 456 789 00010 · contact@btpxai.fr` | `${company.name}${company.siret ? ` · SIRET ${company.siret}` : ""}${company.email ? ` · ${company.email}` : ""}` |

### `lib/email/weekly-report.ts`

- [ ] **Step 7: Add import**

```ts
import type { CompanyInfo } from "@/lib/settings"
```

- [ ] **Step 8: Update `buildWeeklyReportHtml`**

```ts
export function buildWeeklyReportHtml(
  data: WeeklyReportData,
  narrative: WeeklyReportNarrative,
  company: CompanyInfo,
): string {
```

Apply the same header and footer replacements:

| Old | New |
|---|---|
| `BTP × AI Métallerie` (header) | `${company.name}` |
| `12 rue de la Forge, 75001 Paris · 01 23 45 67 89` | `${company.address}${company.phone ? ` · ${company.phone}` : ""}` |
| `BTP × AI Métallerie · SIRET 123 456 789 00010 · contact@btpxai.fr` | `${company.name}${company.siret ? ` · SIRET ${company.siret}` : ""}${company.email ? ` · ${company.email}` : ""}` |

- [ ] **Step 9: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors in cron routes (they call the functions without the new param — fixed in next tasks).

- [ ] **Step 10: Commit**

```bash
git add lib/email/quote.ts lib/email/reminder.ts lib/email/weekly-report.ts
git commit -m "feat: pass company info to email templates"
```

---

## Task 9 — Update the quote-reminders cron route

**Files:**
- Modify: `app/api/cron/quote-reminders/route.ts`

- [ ] **Step 1: Add import**

```ts
import { getCompanyInfo } from "@/lib/settings"
```

- [ ] **Step 2: Update `processWorkspace` signature and body**

```ts
async function processWorkspace(workspaceId: string, resend: Resend): Promise<Result[]> {
  const company = await getCompanyInfo(workspaceId)
  // ... existing code unchanged above the quotes loop ...
```

Inside the `for (const quote of quotes)` loop, replace:

```ts
from: "BTP × AI Métallerie <devis@btpxai.fr>",
subject: buildReminderSubject(quote, type),
html: buildReminderHtml(quote, type),
```

With:

```ts
from: `${company.name || "Devis"} <devis@btpxai.fr>`,
subject: buildReminderSubject(quote, type),
html: buildReminderHtml(quote, type, company),
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors from this file.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/quote-reminders/route.ts
git commit -m "feat: use dynamic company info in reminder cron emails"
```

---

## Task 10 — Update the weekly-report cron route

**Files:**
- Modify: `app/api/cron/weekly-report/route.ts`

- [ ] **Step 1: Add import**

```ts
import { getCompanyInfo } from "@/lib/settings"
```

- [ ] **Step 2: Update `processWorkspace`**

Add `getCompanyInfo` at the top of `processWorkspace`:

```ts
async function processWorkspace(workspaceId: string): Promise<WorkspaceResult> {
  const company = await getCompanyInfo(workspaceId)
  // ... rest of existing code ...
```

In the `resend.emails.send(...)` call, replace:

```ts
from: "BTP × AI Métallerie <rapport@btpxai.fr>",
html: buildWeeklyReportHtml(data, narrative),
```

With:

```ts
from: `${company.name || "Rapport"} <rapport@btpxai.fr>`,
html: buildWeeklyReportHtml(data, narrative, company),
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors anywhere.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/weekly-report/route.ts
git commit -m "feat: use dynamic company info in weekly report cron emails"
```

---

## Task 11 — Fix the broken unit test

**Files:**
- Modify: `tests/unit/weekly-report.test.ts`

The test at line 349 checks for the hardcoded string `"BTP × AI Métallerie"`. Since `buildWeeklyReportHtml` now requires a `company` param, the test must pass a mock company.

- [ ] **Step 1: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern=weekly-report
```

Expected: FAIL — either type error or the assertion fails.

- [ ] **Step 2: Update the test**

Find all calls to `buildWeeklyReportHtml(data, narrative)` in the test file and add a third argument:

```ts
const mockCompany = {
  name: "Acier Forge SAS",
  address: "12 rue de la Forge, 75001 Paris",
  phone: "01 23 45 67 89",
  email: "contact@acierforge.fr",
  siret: "123 456 789 00010",
  tva: "FR12 123456789",
}
```

Define `mockCompany` once at the top of the `describe` block (or at module level), then replace all `buildWeeklyReportHtml(data, narrative)` calls with `buildWeeklyReportHtml(data, narrative, mockCompany)`.

Update the branding test:

```ts
it("includes company branding", () => {
  const html = buildWeeklyReportHtml(data, narrative, mockCompany)
  expect(html).toContain("Acier Forge SAS")
})
```

- [ ] **Step 3: Run the test to confirm it passes**

```bash
npm test -- --testPathPattern=weekly-report
```

Expected: PASS — all tests in the file pass.

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/weekly-report.test.ts
git commit -m "test: update weekly-report test for dynamic company param"
```

---

## Task 12 — Final type-check and verification

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run all unit tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 3: Verify the settings UI renders**

```bash
npm run dev
```

Navigate to `/parametres` → tab "Entreprise". Verify:
- CompanySection has 6 fields (nom, adresse, SIRET, téléphone, email, TVA)
- The "Conditions générales du devis" section shows numbered text inputs
- "+ Ajouter une condition" button adds a new row
- The old "Conditions générales de vente par défaut" textarea is gone

- [ ] **Step 4: Verify the PDF renders**

Generate a PDF from a devis. Verify:
- Header shows workspace name (or empty if not set) instead of "BTP × AI Métallerie"
- Conditions générales section is hidden if none are configured, or shows the list

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -p
git commit -m "chore: final cleanup for dynamic company info feature"
```
