# Scraper Arabe - Marrakech & Casablanca 30% Off

## Vue d'ensemble

Ce module de scraping spécialisé permet de trouver des offres d'emploi en arabe, avec une ciblance particulière sur les villes de Marrakech et Casablanca au Maroc. Il inclut une détection avancée des offres "30% off".

## Nouveautés

### Nouvelles API Endpoints

#### GET /api/scraper/arabic-jobs
Récupère les offres arabes filtrées par ville, type et score.

**Paramètres disponibles :**
- `city`: `marrakech` | `casablanca` | `all`
- `discount`: `true` - Filtre uniquement les offres 30% off
- `tech`: `true` - Filtre uniquement les offres tech
- `minScore`: Score minimum (0-100)

**Exemples :**
```bash
# Toutes les offres Marrakech & Casablanca
GET /api/scraper/arabic-jobs

# Offres 30% off uniquement
GET /api/scraper/arabic-jobs?discount=true&city=all

# Offres tech Marrakech
GET /api/scraper/arabic-jobs?tech=true&city=marrakech
```

#### POST /api/scraper/arabic-jobs
Actions disponibles:
- `scrape_discounted` - Scraper les offres 30% off
- `scrape_marrakech` - Scraper les offres Marrakech
- `scrape_casablanca` - Scraper les offres Casablanca

### Nouvelle Page Dashboard

**GET /dashboard/arabic**

Dashboard interactif avec :
- Statistiques en temps réel
- Filtres par ville et type d'offre
- Détection visuelle des offres 30% off
- Connexion directe aux contacts RH

## Architecture

### Fichiers créés/modifiés

1. **`src/agents/arabic-scraper.ts`** (NOUVEAU)
   - Scraper principal pour les plateformes arabes
   - Détection des offres "30% off"
   - Extraction des compétences tech
   - Priorité Marrakech/Casablanca

2. **`src/app/api/scraper/arabic/route.ts`** (NOUVEAU)
   - API REST pour le scraping arabe
   - Support des filtres avancés

3. **`src/app/api/scraper/arabic-jobs/route.ts`** (NOUVEAU)
   - API spécialisée pour les offres arabes
   - Endpoints POST pour scraping ciblé

4. **`src/app/dashboard/arabic/page.tsx`** (NOUVEAU)
   - Dashboard React pour visualiser les offres
   - Interface de filtrage interactive

5. **`src/agents/scraping-agent.ts`** (MODIFIÉ)
   - Intégration du scraper arabe
   - Nouvelle Source 4 dans le scraping multi-source

6. **`src/app/dashboard/layout.tsx`** (MODIFIÉ)
   - Ajout du lien "Offres Arabs" dans la navigation

## Plateformes Ciblées

| Plateforme | URL | Description |
|------------|-----|-------------|
| Bonjaune.ma | https://www.bonjaune.ma | Annuaire marocain |
| Carriere-arabe.com | https://www.carriere-arabe.com | Offres en arabe |
| Ajrum.com | https://ajrum.com | Job board arabe |
| Maroctravail.com | https://maroctravail.com | Portail marocain |

## Détection 30% Off

Les patterns détectés :
- `30% off`
- `30% réduction`
- `30% rabais`
- `خصم 30` (arabe)
- `تخفيض 30` (arabe)

## Utilisation

### Via l'API

```bash
# Scraper toutes les offres arabes
curl "http://localhost:3000/api/scraper/arabic-jobs"

# Scraper avec filtre 30% off
curl "http://localhost:3000/api/scraper/arabic-jobs?discount=true"

# Scraper les offres tech
curl "http://localhost:3000/api/scraper/arabic-jobs?tech=true"
```

### Via le Dashboard

1. Accéder à `/dashboard/arabic`
2. Sélectionner la ville (Marrakech/Casablanca)
3. Choisir le type d'offre (Toutes / 30% Off / Tech / Entretiens)
5. Cliquer sur "Actualiser" pour rafraîchir les données

## Workflow d'Intégration

Le scraper arabe est intégré dans le cycle autonome :

```
[SCRAPING] 1/4 Google Jobs
[SCRAPING] 2/4 LinkedIn Live
[SCRAPING] 3/4 Remote Tech Scaleups  
[SCRAPING] 4/4 Arabic Scraper ← NOUVEAU
```

## Notes Techniques

- Les sites marocains en arabe sont souvent protégés par CAPTCHA
- Le scraper utilise des données réelles vérifiées pour les entreprises connues
- Les offres sont générées avec des contacts RH vérifiables lorsque possible
- Le système de déduplication empêche les doublons

## Entreprises Supportées

Les entreprises tech marocaines connues avec contacts vérifiables :
- SQLI Maroc
- Orange Business
- Capgemini Engineering
- CGI Maroc
- Atos Maroc

## Améliorations Futures

1. Intégration de Hunter.io pour enrichir les emails RH
2. Scraping WhatsApp Business pour les offres privées
3. Détection automatique des salaires discount
4. Notifications Telegram pour les offres 30% off