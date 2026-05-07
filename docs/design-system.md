# Design System — BTP×AI

Référence pour toutes les implémentations UI/UX. Les valeurs ci-dessous sont extraites de `app/globals.css` et des composants existants.

---

## 1. Identité visuelle

**Thème :** Dark industriel — acier froid + ambre arc-de-soudure  
**Espace colorimétrique :** OKLCh (perceptuellement uniforme)  
**Langue :** Français partout dans l'interface  
**Coins :** Nets et angulaires (`--radius: 0.25rem` = 4px), pas de `rounded-lg` ou `rounded-full` sauf exceptions documentées  
**Densité :** Haute sur desktop (bureau), minimale sur mobile (terrain)

**Principes :**
- Fond très sombre, texte quasi-blanc, accent ambre vif
- Labels en majuscules avec `tracking-wider` systématiquement
- Pas de `border-radius` généreux — l'esthétique métallerie exige des bords francs
- Couleurs dynamiques via `style={{ color: "oklch(...)" }}` pour les accents par entité

---

## 2. Tokens de design

### Couleurs (variables CSS)

```css
/* Surfaces */
--background:        oklch(0.135 0.008 258)   /* fond principal */
--card:              oklch(0.17  0.008 258)   /* cartes, popovers */
--sidebar:           oklch(0.105 0.008 258)   /* sidebar (plus foncé) */

/* Texte */
--foreground:        oklch(0.92  0.012 78)    /* texte principal */
--card-foreground:   oklch(0.92  0.012 78)
--muted-foreground:  oklch(0.58  0.008 258)   /* texte secondaire */

/* Primaire — ambre arc-de-soudure */
--primary:           oklch(0.69  0.168 47)
--primary-foreground: oklch(0.11  0.008 258)  /* texte sur fond primaire */

/* Secondaire — acier sombre */
--secondary:         oklch(0.23  0.012 258)
--secondary-foreground: oklch(0.92 0.012 78)

/* Muted / Accent */
--muted:             oklch(0.21  0.01  258)
--accent:            oklch(0.25  0.012 258)
--accent-foreground: oklch(0.92  0.012 78)

/* Sémantique */
--destructive:       oklch(0.62  0.22  25)    /* rouge alerte */
--border:            oklch(0.29  0.012 258)
--input:             oklch(0.23  0.012 258)
--ring:              oklch(0.69  0.168 47)    /* focus ring = primaire */

/* Sidebar */
--sidebar-foreground:         oklch(0.92  0.012 78)
--sidebar-primary:            oklch(0.69  0.168 47)
--sidebar-primary-foreground: oklch(0.11  0.008 258)
--sidebar-accent:             oklch(0.19  0.01  258)
--sidebar-accent-foreground:  oklch(0.92  0.012 78)
--sidebar-border:             oklch(0.22  0.012 258)
--sidebar-ring:               oklch(0.69  0.168 47)

/* Graphiques (5 couleurs) */
--chart-1: oklch(0.69 0.168 47)   /* ambre */
--chart-2: oklch(0.62 0.12  210)  /* bleu */
--chart-3: oklch(0.58 0.1   150)  /* cyan */
--chart-4: oklch(0.74 0.13  65)   /* jaune-vert */
--chart-5: oklch(0.55 0.008 258)  /* gris */
```

**Couleurs d'accent dynamiques (hors variables, usage inline) :**

| Usage | Valeur OKLCh |
|---|---|
| Devis / ambre | `oklch(0.69 0.168 47)` |
| Projets / bleu | `oklch(0.62 0.12 210)` |
| Messagerie / violet | `oklch(0.65 0.15 280)` |
| Revenus / vert | `oklch(0.60 0.14 145)` |
| Matériaux / orange | `oklch(0.70 0.18 55)` |
| Alertes actives / rouge | `oklch(0.62 0.22 25)` |
| Badge alerte nav | `oklch(0.55 0.22 25)` |

### Rayon de bordure

```css
--radius:    0.25rem   /* base = 4px */
--radius-sm: calc(var(--radius) * 0.6)   /* ~2.4px */
--radius-md: calc(var(--radius) * 0.8)   /* ~3.2px */
--radius-lg: var(--radius)               /* 4px */
--radius-xl: calc(var(--radius) * 1.4)   /* ~5.6px */
--radius-2xl: calc(var(--radius) * 1.8)  /* ~7.2px */
--radius-3xl: calc(var(--radius) * 2.2)  /* ~8.8px */
--radius-4xl: calc(var(--radius) * 2.6)  /* ~10.4px — badges pill */
```

Utiliser `rounded-sm` (`rounded-[var(--radius-lg)]`) comme défaut sur les éléments métier. Les cartes utilisent `rounded-xl` (shadcn). Les badges utilisent `rounded-4xl` (pill).

### Typographie

| Variable | Police | Usage |
|---|---|---|
| `--font-heading` / `font-heading` | Barlow Condensed (400–700) | Titres, valeurs métriques, brand |
| `--font-sans` / `font-sans` | DM Sans | Corps de texte, UI générale |
| `--font-mono` / `font-mono` | Geist Mono | Code, valeurs techniques |

Chargement dans `app/layout.tsx` via `next/font/google`.

### Animations

```css
fadeSlideIn   /* opacity 0→1 + translateY 8px→0. Durée: 0.35s ease */
forgePulse    /* glow pulsant ambre (box-shadow). Usage: éléments actifs */
forgeBar      /* progression 0→95%. Usage: barres de chargement */
zapFlicker    /* scintillement opacity+scale. Usage: icônes IA en cours */
sparkOrbit    /* rotation orbitale. Usage: effets spéciaux */
alertPulse    /* glow pulsant rouge. Durée: 2.4s ease infinite */
slideUp       /* translateY 100%→0 + opacity. Usage: modales bottom-sheet */
```

Stagger sur listes de cartes : `animationDelay: ${index * 0.06}s`

---

## 3. Typographie

### Patterns de texte standards

```tsx
/* Titre de page */
<h1 className="font-heading text-4xl font-bold tracking-wide uppercase leading-none">

/* Titre de section (h2) */
<h2 className="font-heading text-2xl font-semibold tracking-wide uppercase">

/* Label de section (au-dessus d'un titre ou d'une section) */
<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
  Indicateurs
</span>
<div className="flex-1 h-px bg-border" />  {/* ligne séparatrice */}

/* Breadcrumb / meta info */
<span className="text-[11px] text-muted-foreground tracking-widest uppercase">
  {dateLabel}
</span>

/* Titre de carte (CardTitle) */
<div className="font-heading text-base leading-snug font-medium">

/* Description */
<p className="text-sm text-muted-foreground">

/* Petit texte de détail */
<p className="text-xs text-muted-foreground">

/* Très petit texte (label champ, meta) */
<span className="text-[10px] font-medium uppercase tracking-[0.1em]">

/* Label de formulaire (composant Label) */
<Label />  {/* text-xs font-medium uppercase tracking-wider text-muted-foreground */}

/* Valeur numérique métrique */
<p className="font-heading font-bold leading-none tracking-tight"
   style={{ fontSize: value.length > 8 ? "1.6rem" : "2.25rem" }}>
```

---

## 4. Composants UI

Tous les composants sont dans `components/ui/`. Ils utilisent `@base-ui/react` comme primitive headless, CVA pour les variants, et `cn()` pour la composition de classes.

### Button

```tsx
import { Button } from "@/components/ui/button"

// Variants de style
<Button variant="default">    {/* bg-primary text-primary-foreground */}
<Button variant="outline">    {/* border + bg-background */}
<Button variant="secondary">  {/* bg-secondary */}
<Button variant="ghost">      {/* transparent, hover:bg-muted */}
<Button variant="destructive">{/* bg-destructive/10 text-destructive */}
<Button variant="link">       {/* text-primary underline-offset-4 */}

// Variants de taille
<Button size="xs">      {/* h-6, text-xs */}
<Button size="sm">      {/* h-7 */}
<Button size="default"> {/* h-8 */}
<Button size="lg">      {/* h-9 */}
<Button size="icon">    {/* size-8, carré */}
<Button size="icon-xs"> {/* size-6 */}
<Button size="icon-sm"> {/* size-7 */}
<Button size="icon-lg"> {/* size-9 */}
```

**Attention terrain :** Ne jamais utiliser les tailles `xs`, `sm`, ou `icon` sur l'interface terrain — les boutons doivent avoir un minimum de 48px de hauteur (utiliser inline `style={{ minHeight: "48px" }}`).

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card"

// Size par défaut
<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
    <CardDescription>Description</CardDescription>
    <CardAction><Button size="sm" /></CardAction>
  </CardHeader>
  <CardContent>Contenu</CardContent>
  <CardFooter>Pied</CardFooter>
</Card>

// Size compacte
<Card size="sm">...</Card>
```

Style de base : `rounded-xl bg-card py-4 text-sm ring-1 ring-foreground/10`  
CardFooter : `bg-muted/50 border-t`

### Badge

```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="default">    {/* bg-primary */}
<Badge variant="secondary">
<Badge variant="destructive">
<Badge variant="outline">
<Badge variant="ghost">

// Usage courant pour les rôles :
<Badge variant="outline" className="border-primary/40 text-primary uppercase tracking-wider text-[10px]">
  Admin
</Badge>
```

Forme pill : `rounded-4xl h-5 px-2 py-0.5`

### Input / Textarea

```tsx
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

<div className="space-y-1.5">
  <Label htmlFor="field">Libellé du champ</Label>
  <Input id="field" placeholder="Placeholder..." />
</div>
```

Height input : `h-8`. Focus ring : `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`.

### Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild><Button>Ouvrir</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titre</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* contenu */}
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
      <Button>Confirmer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

`DialogTitle` : `font-heading text-base leading-none font-medium`

### Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
```

### Autres composants

| Composant | Import | Notes |
|---|---|---|
| `Avatar` | `@/components/ui/avatar` | `AvatarImage` + `AvatarFallback` |
| `Separator` | `@/components/ui/separator` | Orientations `horizontal` / `vertical` |
| `Tooltip` | `@/components/ui/tooltip` | `TooltipProvider` dans `app/layout.tsx` (delay 300ms) |
| `Sonner` (toast) | `import { toast } from "sonner"` | Positionné bottom-right dans le layout |

---

## 5. Layouts

### Bureau (desktop)

**Structure générale :**

```
┌─────────────┬───────────────────────────────────────────┐
│  Sidebar    │  <main> max-w-7xl mx-auto                  │
│  w-56       │  px-4 sm:px-6 py-6 lg:py-8                │
│  fixed      │                                            │
│  inset-y-0  │  <div className="space-y-8">               │
│  left-0     │    <header> ... </header>                  │
│  z-40       │    <section> ... </section>                │
│             │  </div>                                    │
└─────────────┴───────────────────────────────────────────┘
```

**Pattern de header de page :**

```tsx
<header>
  {/* Breadcrumb */}
  <div className="flex items-center gap-2 mb-1">
    <IconName className="size-3.5 text-muted-foreground" />
    <span className="text-xs text-muted-foreground tracking-wider uppercase">
      Nom de la section
    </span>
  </div>
  {/* Titre + action */}
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-wide uppercase">
        Titre de la page
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Description courte avec métriques clés.
      </p>
    </div>
    <Button>Action principale</Button>
  </div>
  <div className="mt-4 h-px bg-border" />
</header>
```

**Pattern de section avec label :**

```tsx
<section>
  <div className="flex items-center gap-3 mb-5">
    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
      Nom de la section
    </span>
    <div className="flex-1 h-px bg-border" />
  </div>
  {/* contenu */}
</section>
```

**Grille de cartes métriques :**

```tsx
<div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
  {items.map((item, i) => (
    <div
      key={item.label}
      className="relative flex flex-col gap-3 rounded-sm border border-border bg-card p-5 overflow-hidden transition-colors"
      style={{
        borderLeftColor: item.accentColor,
        borderLeftWidth: "3px",
        animation: "fadeSlideIn 0.35s ease both",
        animationDelay: `${i * 0.06}s`,
      }}
    >
      {/* Label + icône dans carré coloré */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ color: "oklch(0.55 0.008 258)" }}>
          {item.label}
        </span>
        <div className="size-7 rounded-sm flex items-center justify-center shrink-0"
             style={{ background: item.iconBg }}>
          <item.icon className="size-3.5" style={{ color: item.iconColor }} />
        </div>
      </div>

      {/* Valeur numérique */}
      <p className="font-heading font-bold leading-none tracking-tight"
         style={{ fontSize: "2.25rem", color: "oklch(0.92 0.012 78)" }}>
        {item.value}
      </p>

      {/* Description */}
      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.008 258)" }}>
        {item.description}
      </p>
    </div>
  ))}
</div>
```

**Carte action rapide (lien) :**

```tsx
<Link href="/route"
  className="group flex items-start gap-3 rounded-sm border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary/5">
  <div className="size-8 rounded-sm bg-muted flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/15">
    <IconName className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
  </div>
  <div className="min-w-0">
    <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
      Libellé
    </p>
    <p className="text-xs text-muted-foreground mt-0.5">Description</p>
  </div>
</Link>
```

**Sidebar (`components/layout/sidebar.tsx`) :**

- Fond : `bg-sidebar` (`oklch(0.105 0.008 258)`)
- Largeur : `w-56` (224px), `fixed inset-y-0 left-0 z-40`
- Item actif : `text-primary bg-primary/10` + barre gauche `before:w-0.5 before:bg-primary`
- Item inactif : `text-sidebar-foreground/60 hover:bg-sidebar-accent`
- Item alerte avec badge : `text-red-400/90 hover:text-red-300 hover:bg-red-950/30`
- Badge alerte : `rounded-full min-w-[18px] h-[18px]`, `background: oklch(0.55 0.22 25)`, animation `alertPulse 2.4s ease infinite`

### Terrain (mobile)

**Contraintes impératives :**

- Boutons minimum `48px` de hauteur (utiliser `style={{ minHeight: "48px" }}`)
- Navigation bottom fixe : `64px` de hauteur
- Maximum 3 actions visibles par écran
- Pas de tableaux, pas de menus déroulants complexes
- Viewport cible : 375px

**Structure de page terrain :**

```tsx
<div className="min-h-screen bg-background flex flex-col">
  {/* Header sticky */}
  <header className="sticky top-0 z-10 border-b border-border bg-background">
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Bouton retour — 44×44px minimum */}
      <button style={{ width: "44px", height: "44px" }}
              className="flex items-center justify-center rounded-sm border border-border">
        <ArrowLeft className="size-5" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-heading text-lg font-bold uppercase tracking-wide truncate">
          Titre
        </h1>
      </div>
    </div>
  </header>

  {/* Contenu principal */}
  <main style={{ paddingBottom: "80px" }}>
    {/* contenu des onglets */}
  </main>

  {/* Navigation bottom fixe */}
  <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background"
       style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
    <div className="grid grid-cols-5" style={{ minHeight: "64px" }}>
      {tabs.map((tab) => (
        <button key={tab.id}
          style={{ minHeight: "64px" }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors",
            active === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          )}
          onClick={() => setActive(tab.id)}
        >
          <tab.icon className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  </nav>
</div>
```

**Bouton d'action pleine largeur (terrain) :**

```tsx
<button
  style={{ minHeight: "56px" }}
  className="w-full flex items-center justify-center gap-2 rounded-sm bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider active:scale-[0.98] transition-transform"
>
  <IconName className="size-5" />
  Libellé action
</button>
```

---

## 6. États interactifs

Pattern cohérent sur tous les composants :

```tsx
// Focus clavier
focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50

// Invalide (formulaires)
aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20

// Désactivé
disabled:pointer-events-none disabled:opacity-50

// Pression tactile / clic
active:not-aria-[haspopup]:translate-y-px   // desktop (leger décalage vertical)
active:scale-[0.98]                          // mobile (compression légère)

// Étendu (dropdowns, accordéons)
aria-expanded:bg-muted aria-expanded:text-foreground

// Transitions
transition-colors    // pour les changements de couleur
transition-all       // pour les transformations + couleurs
```

---

## 7. Variants par rôle

Badges de rôle dans la sidebar (`components/layout/sidebar-user.tsx`) :

```tsx
// admin
className="text-primary border-primary/40"

// bureau
className="text-sky-400 border-sky-400/40"

// ouvrier
className="text-emerald-400 border-emerald-400/40"
```

Utilisation type :

```tsx
<Badge variant="outline" className={cn(
  "uppercase tracking-wider text-[10px] px-2 py-1",
  role === "admin"   && "text-primary border-primary/40",
  role === "bureau"  && "text-sky-400 border-sky-400/40",
  role === "ouvrier" && "text-emerald-400 border-emerald-400/40",
)}>
  {roleLabel}
</Badge>
```

---

## 8. Conventions d'implémentation

### Utilitaires

```tsx
import { cn } from "@/lib/utils"   // tailwind-merge + clsx
```

### Variants de composants

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const myVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", outline: "..." },
    size: { default: "...", sm: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
})
```

### Couleurs dynamiques

Utiliser `style={{ color: "oklch(...)" }}` pour les couleurs liées à une entité ou un état calculé. Ne pas créer de classes Tailwind arbitraires pour des valeurs oklch dynamiques.

```tsx
// Bon
<div style={{ borderLeftColor: accentColor, borderLeftWidth: "3px" }} />

// Mauvais
<div className={`border-l-[${accentColor}]`} />
```

### Formulaires

Toujours utiliser `react-hook-form` + `zod`. Jamais de `<form>` HTML natif avec état local.

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
```

### Icônes

Bibliothèque unique : `lucide-react`. Taille standard `size-4` (16px) dans les boutons et nav. `size-3.5` dans les icônes de cartes métriques. `size-5` sur l'interface terrain.

### Toasts

```tsx
import { toast } from "sonner"

toast.success("Action réalisée")
toast.error("Une erreur est survenue")
toast.loading("En cours...")
```

### `data-testid`

Ajouter `data-testid="..."` sur tous les éléments interactifs testés en E2E Cypress. Convention kebab-case, préfixe par page ou composant : `data-testid="alert-banner"`, `data-testid="alert-badge"`.

### Accessibilité

- Toujours un `aria-label` sur les boutons icon-only
- `aria-invalid` sur les inputs en erreur (géré automatiquement par `react-hook-form` + shadcn)
- `role="alert"` sur les messages d'erreur critiques

---

## 9. Dépendances clés

| Package | Usage |
|---|---|
| `@base-ui/react` | Primitives headless (Button, Input, Dialog) |
| `class-variance-authority` | Variants type-safe (CVA) |
| `lucide-react` | Icônes |
| `sonner` | Toasts (positionné bottom-right dans layout) |
| `react-hook-form` + `@hookform/resolvers` | Tous les formulaires |
| `zod` | Validation schémas |
| `tailwindcss` v4 | CSS via `@tailwindcss/postcss` |
| `tw-animate-css` | Utilitaires d'animation Tailwind |
| `next-themes` | Provider de thème |
