# Fonctionnalités de l'application BTP×AI

Application agentique pour une entreprise de métallerie. Elle couvre la gestion des devis, des clients, de la communication, et du suivi terrain — avec une automatisation IA intégrée.

## Rôles

| Rôle | Description |
|------|-------------|
| **Administrateur** | Accès total : toutes les fonctionnalités bureau + paramétrage système |
| **Bureau** | Gestion des devis, clients, boîte de réception et suivi chantiers |
| **Ouvrier** | Interface terrain mobile : notes, photos, matériaux, avancement |

---

## Rôle : Bureau

### Tableau de bord

- Vue synthétique des indicateurs clés (KPIs)
  - Devis en attente de réponse
  - Projets actifs
  - Emails non traités
  - Revenus de la semaine
  - Demandes de matériaux en attente
  - Alertes terrain ouvertes
- Rafraîchissement automatique des métriques

### Gestion des clients

- Liste des clients avec recherche et pagination
- Création, modification et suppression d'un client
- Fiche client détaillée avec historique des devis et projets associés

### Gestion des devis

- Liste des devis avec recherche, filtres par statut (brouillon / envoyé / accepté / refusé / expiré) et filtre par date
- Création d'un devis assistée par IA à partir d'un brief textuel
- Éditeur de devis : lignes de prestation (libellé, quantité, prix unitaire, unité), taux de TVA (0 % / 10 % / 20 %), durée de validité (15 à 60 jours)
- Prévisualisation et téléchargement PDF
- Envoi du devis par email au client (avec PDF en pièce jointe)
- Duplication d'un devis existant
- Archivage d'un devis
- Configuration des relances par devis

### Boîte de réception (Inbox)

- Liste des emails Gmail avec classification automatique par IA
  - Catégories : demande de devis / suivi commande / question / autre
  - Statuts : à traiter / en cours / répondu / archivé
- Lecture complète d'un email
- Rédaction et envoi d'une réponse directement depuis l'application
- Brouillon de réponse généré par IA
- Extraction automatique de bon de commande depuis un email
- Confirmation et enregistrement d'un bon de commande extrait
- Résumé IA du contexte client (historique des échanges, devis, projets)
- Liaison manuelle d'un email à un client existant
- Archivage d'un email

### Suivi des matériaux

- Vue d'ensemble des demandes de matériaux envoyées depuis les chantiers
- Progression du statut : en attente → commandé → livré
- Filtre par urgence, projet ou statut

### Suivi des alertes terrain

- Fil des signalements de problèmes envoyés par les ouvriers
- Progression du statut : ouvert → en cours → résolu
- Consultation des photos jointes et du niveau d'urgence

---

## Rôle : Ouvrier (Terrain)

Interface optimisée pour une utilisation sur chantier (mobile, grandes zones de tap, faible connectivité).

### Liste des chantiers

- Vue en cartes des projets actifs et planifiés

### Fiche chantier

Chaque chantier est accessible via 5 onglets :

#### Notes vocales

- Enregistrement vocal en temps réel avec transcription automatique (Web Speech API, langue fr-FR)
- Possibilité d'uploader un fichier audio
- Historique des notes du chantier

#### Photos

- Capture directe depuis la caméra de l'appareil
- Géolocalisation automatique (latitude / longitude)
- Galerie des photos du chantier avec date et heure

#### Demandes de matériaux

- Formulaire de demande : libellé, quantité, niveau d'urgence (faible / normal / urgent), commentaire, photo
- Liste en temps réel des demandes et leur statut (notification instantanée au bureau via Supabase Realtime)

#### Avancement

- Checklist d'étapes du chantier
- Marquage des étapes comme terminées avec horodatage
- Synchronisation en temps réel avec le bureau

#### Signalement de problème

- Création d'une alerte avec description, niveau d'urgence (faible / élevé / critique) et photo
- Notification immédiate au bureau

---

## Rôle : Administrateur

L'administrateur dispose de toutes les fonctionnalités du rôle Bureau, plus les paramètres système suivants.

### Paramètres de l'entreprise

- Modification des informations de l'entreprise (nom, adresse, SIRET)
- Upload du logo (utilisé sur les devis PDF)

### Connexion Gmail

- Connexion au compte Gmail via OAuth2
- Révocation de l'accès Gmail

### Gestion des utilisateurs

- Liste des membres du workspace
- Invitation d'un nouvel utilisateur par email
- Modification du rôle d'un utilisateur (admin / bureau / ouvrier)
- Suppression d'un utilisateur

### Accusés de réception automatiques

- Activation / désactivation des accusés de réception automatiques
- Configuration du délai et du template de réponse automatique

### Relances automatiques des devis

- Configuration des relances à J+7, J+14 et relance paiement

### Synchronisation Google Sheets

- Configuration de la feuille Google Sheets cible
- Déclenchement manuel d'une synchronisation

### Rapport hebdomadaire

- Configuration de la liste des destinataires du rapport hebdomadaire

### Conditions générales de vente (CGV)

- Édition du template CGV affiché sur les devis PDF

---

## Automatisations (Cron Jobs)

Tâches planifiées exécutées automatiquement, sans intervention utilisateur.

| Fréquence | Nom | Description |
|-----------|-----|-------------|
| `*/2 * * * *` (toutes les 2 min) | **Accusés de réception emails** | Détecte les nouveaux emails entrants des clients (fenêtre glissante de 10 min), vérifie si un accusé a déjà été envoyé récemment, et envoie une réponse automatique si l'option est activée dans les paramètres du workspace. |
| `0 8 * * *` (tous les jours à 8h) | **Relances devis** | Envoie les emails de relance pour les devis en attente selon les échéances configurées : J+7, J+14, et relance paiement. |
| `0 8 * * 1` (lundi à 8h) | **Rapport hebdomadaire** | Génère un résumé IA des métriques de la semaine écoulée (devis, projets, revenus, alertes) et l'envoie par email aux destinataires configurés. |
| `0 6 * * *` (tous les jours à 6h) | **Synchronisation Google Sheets** | Exporte l'ensemble des données de l'application (clients, projets, devis) vers la feuille Google Sheets configurée par workspace. |
