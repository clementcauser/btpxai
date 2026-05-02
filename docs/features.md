# Fonctionnalités de l'application BTP×AI

> Document de référence listant l'ensemble des fonctionnalités implémentées, organisées par rôle utilisateur.

---

## Sommaire

- [Authentification & Accès](#authentification--accès)
- [Rôle Admin](#rôle-admin)
- [Rôle Bureau](#rôle-bureau)
- [Rôle Ouvrier (Terrain)](#rôle-ouvrier-terrain)
- [Tâches automatiques (Cron Jobs)](#tâches-automatiques-cron-jobs)

---

## Authentification & Accès

Géré via Supabase Auth avec routage par rôle dans le middleware Next.js.

| Fonctionnalité | Détail |
|---|---|
| Connexion par email/mot de passe | Page `/login` avec validation Zod |
| Session persistante | Cookies HTTP-only via Supabase SSR |
| Routage par rôle | Middleware Next.js — redirection automatique selon le rôle |
| Protection des routes API | Vérification du rôle côté serveur sur chaque route sensible |

### Redirections par rôle

| Rôle | Pages autorisées | Redirection si hors périmètre |
|---|---|---|
| `admin` | `/admin/*` | → `/admin` |
| `bureau` | `/dashboard`, `/devis`, `/clients`, `/inbox`, `/alertes`, `/materiaux`, `/parametres` | → `/profil` |
| `ouvrier` | `/terrain/*` | → `/profil` |

---

## Rôle Admin

Espace réservé à la gestion de la plateforme. L'admin n'a **pas** accès aux pages bureau ou terrain.

### Gestion des entreprises (`/admin/entreprises`)

- Lister tous les workspaces (entreprises clientes)
- Créer un workspace (nom + slug unique)
- Modifier les informations d'un workspace
- Supprimer un workspace

### Gestion des utilisateurs (`/admin/utilisateurs`)

- Lister tous les utilisateurs de la plateforme (tous workspaces confondus)
- Créer un utilisateur (email, nom, rôle, mot de passe optionnel)
- Modifier un utilisateur (email, nom, rôle)
- Supprimer un utilisateur — protection : impossible de supprimer son propre compte
- Attribution des rôles : `admin`, `bureau`, `ouvrier`

---

## Rôle Bureau

Interface de gestion quotidienne pour les employés de bureau.

### Dashboard (`/dashboard`)

- Indicateurs clés en temps réel :
  - Nombre de devis en attente
  - Nombre de projets actifs
  - Emails non traités
  - Chiffre d'affaires de la semaine
  - Demandes de matériaux en attente
  - Alertes terrain ouvertes
- Rafraîchissement automatique toutes les 5 minutes
- Raccourcis rapides : nouveau devis, accès inbox, ajout client

### Gestion des devis (`/devis`)

**Liste des devis**
- Afficher tous les devis avec leur statut (`brouillon`, `envoyé`, `accepté`, `refusé`, `expiré`)
- Recherche et filtrage
- Actions groupées : dupliquer, supprimer, changer le statut

**Création d'un devis (`/devis/nouveau`)**
- Saisie d'un brief en texte libre → génération automatique par IA
- Agent IA (Claude Sonnet 4.6) :
  - Analyse le brief en français
  - Génère les lignes de devis (main-d'œuvre + matériaux)
  - Applique des tarifs cohérents avec le marché français
  - Ajoute des notes sur les conditions et la validité
- Sélection du projet et du client associés
- Calcul automatique des totaux HT/TTC et du taux de TVA

**Éditeur de devis (`/devis/[id]/preview`)**
- Modification des lignes (libellé, quantité, unité, prix unitaire)
- Ajustement du taux de TVA
- Ajout de notes
- Calcul en temps réel
- Aperçu et génération PDF
- Envoi par email au client

**Actions sur un devis**
- Envoyer par email (génération PDF via React PDF + envoi via Resend)
- Dupliquer (copie avec toutes les lignes)
- Consulter l'historique des relances
- Relancer manuellement
- Exporter en PDF avec logo entreprise

### Gestion des clients (`/clients`)

**Liste des clients**
- Recherche par nom ou email
- Filtrage par statut
- Création, modification, suppression

**Fiche client (`/clients/[id]`)**
- Informations complètes (email, téléphone, adresse)
- Historique des projets
- Historique des devis avec statuts
- Chiffre d'affaires par client
- Notes vocales et photos de chantier associées
- Liste de contrôle des étapes de projet

### Boîte de réception emails (`/inbox`)

**Lecture des emails**
- Connexion à la boîte Gmail via OAuth2
- Affichage des 50 derniers emails

**Classification automatique par IA (Claude Sonnet 4.6)**
- Catégories : `demande_devis`, `suivi_commande`, `question`, `autre`
- Score de confiance et explication du raisonnement

**Gestion des emails**
- Mise à jour manuelle du statut : À traiter, En cours, Répondu, Archivé
- Association à un client

**Résumé client par IA (`/api/agents/email/client-summary`)**
- Contexte client généré par IA
- Historique des emails et des devis
- Chiffre d'affaires et historique relationnel

**Rédaction de réponse par IA (`/api/agents/email/draft`)**
- Suggestion de réponse professionnelle contextualisée
- Adapté à la catégorie de l'email et au nom du client
- Ton aligné sur les guidelines de l'entreprise

**Envoi de réponse**
- Envoi via l'API Gmail connectée

### Gestion des matériaux (`/materiaux`)

- Tableau de bord des demandes de matériaux créées par les ouvriers
- Filtrage par urgence (`normal`, `urgent`, `critique`)
- Regroupement par projet
- Photos jointes
- Suivi du statut (`en attente`, `livré`, `partiel`)
- Mises à jour en temps réel via Supabase Realtime

### Alertes terrain (`/alertes`)

- Fil des problèmes signalés depuis le terrain
- Filtrage par statut (`ouvert`, `pris_en_charge`, `résolu`) et par urgence
- Description du problème + photo jointe
- Projet et ouvrier associés
- Mises à jour en temps réel via Supabase Realtime
- Notification email au bureau à chaque nouvelle alerte

### Paramètres (`/parametres`)

**Informations entreprise**
- Nom, adresse, SIRET
- Upload du logo

**Connexion Gmail**
- Authentification OAuth2
- Connexion et déconnexion

**Accusés de réception automatiques**
- Activation/désactivation
- Personnalisation du sujet et du corps du message

**Synchronisation Google Sheets**
- Export des devis, projets, clients, matériaux, alertes
- Suivi de la date de dernière synchronisation

**Relances devis**
- Configuration des relances automatiques (J+7, J+14)
- Relances de paiement

**Rapport hebdomadaire**
- Configuration des destinataires
- Activation/désactivation de l'envoi automatique

**CGV**
- Stockage et gestion du modèle de conditions générales de vente

**Invitation d'utilisateurs**
- Inviter un nouvel utilisateur `bureau` ou `ouvrier` dans le workspace

### Profil (`/profil`)

- Affichage de l'email et du rôle de l'utilisateur connecté

---

## Rôle Ouvrier (Terrain)

Interface mobile-first, optimisée pour une utilisation sur chantier. Conçue pour des conditions difficiles (faible connectivité, mains occupées).

> Contraintes UX : boutons ≥ 48 px, max 3 actions par écran, testé sur viewport 375 px.

### Liste des projets (`/terrain`)

- Afficher les projets en cours affectés à l'ouvrier
- Filtrage par statut (`planifié`, `en cours`, `terminé`, `annulé`)
- Nom du client et description du projet
- Indicateur visuel du statut actif

### Détail d'un projet (`/terrain/[projectId]`)

Interface à onglets avec 5 sections :

**Onglet Notes (mémos vocaux)**
- Enregistrement audio directement sur le chantier
- Transcription automatique (Whisper OpenAI, français)
- Stockage de l'audio dans Supabase Storage
- Saisie manuelle possible en complément

**Onglet Photos**
- Prise de photo via la caméra arrière du téléphone (`capture="environment"`)
- Coordonnées GPS optionnelles (lat/lng)
- Stockage dans Supabase Storage
- Galerie chronologique avec miniatures et indicateur GPS

**Onglet Matériaux**
- Créer une demande de matériaux : libellé, quantité, urgence, commentaire
- Joindre une photo du besoin ou de l'emplacement
- La demande apparaît en temps réel dans le tableau de bord bureau

**Onglet Avancement**
- Liste de contrôle des étapes du projet (définies par le bureau)
- Cocher les étapes réalisées
- Suivi de l'avancement global du chantier

**Onglet Problème**
- Signaler un problème ou incident de sécurité
- Niveau d'urgence : `faible`, `élevé`, `critique`
- Description libre (max 1 000 caractères)
- Photo jointe en preuve
- Notification email immédiate au bureau avec lien direct

**Bouton d'alerte rapide (persistant)**
- Bouton flottant accessible depuis toutes les pages terrain
- Pré-rempli avec le projet en cours
- Accès en un tap pour les situations d'urgence

---

## Tâches automatiques (Cron Jobs)

Toutes les routes cron requièrent un header `Authorization: Bearer {CRON_SECRET}`.

### Accusés de réception automatiques (`/api/cron/email-acknowledgment`)

- **Déclenchement** : périodique (configuré sur Vercel)
- **Fonction** : envoie automatiquement un accusé de réception aux nouveaux emails entrants
- Traitement par workspace
- Respect du paramètre d'activation par workspace
- Vérification des doublons (pas de double envoi)
- Gestion des indisponibilités Gmail
- Sujet et corps personnalisables dans les paramètres

### Relances de devis (`/api/cron/quote-reminders`)

- **Déclenchement** : périodique (configuré sur Vercel)
- **Types de relances** :
  - Relance J+7 après envoi du devis
  - Relance J+14 après envoi du devis
  - Relance de paiement
- Recherche des devis éligibles selon statut et date d'envoi
- Envoi via Resend
- Journalisation de chaque relance envoyée
- Respect de la configuration par workspace
- Ignore les clients sans adresse email

### Synchronisation Google Sheets (`/api/cron/sheets-sync`)

- **Déclenchement** : périodique (configuré sur Vercel)
- **Données exportées** : devis, projets, clients, matériaux, alertes
- Mise à jour de la date de dernière synchronisation
- Par workspace
- Gestion des erreurs sans interruption des autres workspaces

### Rapport hebdomadaire (`/api/cron/weekly-report`)

- **Déclenchement** : hebdomadaire (typiquement le lundi à 8h)
- **Contenu du rapport** :
  - Nombre de devis créés / envoyés / acceptés
  - Chiffre d'affaires de la semaine
  - Projets actifs
  - Alertes terrain
- **Synthèse IA (Claude Sonnet 4.6)** :
  - Résumé exécutif de la semaine
  - Analyse des performances
  - Mise en avant des indicateurs clés
- Email HTML formaté avec branding envoyé aux destinataires configurés via Resend
- Par workspace
