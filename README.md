# 🚀 AgencyGetJobs — Autonomous Multi-Agent Recruitment Engine

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer_Stealth-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)
![IMAP / SMTP](https://img.shields.io/badge/IMAP%20%2F%20SMTP-Gmail_RFC822-EA4335?style=for-the-badge&logo=gmail&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Plateforme SaaS Multi-Agents Autonome d'Intelligence RH, Scraping Temps Réel & Postulation Automatisée Haute Délivrabilité.**

[Fonctionnalités](#-fonctionnalités-clés) • [Architecture](#-architecture-multi-agents-mas) • [Dashboard SaaS](#-interface-dashboard-saas) • [Installation](#-installation--démarrage-rapide) • [Délivrabilité](#-deliverability-shield)

</div>

---

## 📌 Présentation du Projet

**AgencyGetJobs** est une solution SaaS autonome orchestrée par une architecture d'agents d'intelligence artificielle interconnectés (Stateful Multi-Agent System). 

Conçu pour éliminer le travail répétitif de recherche d'emploi et de candidature, le système gère de bout en bout le pipeline de recrutement : de la veille active d'offres ciblées à l'extraction de contacts RH vérifiés, jusqu'à la personnalisation chirurgicale des candidatures (CV et lettres de motivation rédigés selon un protocole anti-détection IA) et le suivi direct de la boîte de réception Gmail via IMAP.

---

## 🤖 Architecture Multi-Agents (MAS)

Le moteur fonctionne grâce à 4 agents spécialisés et coordonnés en temps réel :

```mermaid
flowchart TD
    CV["📄 Profil Utilisateur & CV Master (FR / EN)"] --> A1["🧠 Agent 1: Orchestrateur & Profile Master"]
    
    subgraph S1["Cycle Autonome 30s & Lead Intelligence"]
        A1 -->|Brief de Recherche Dynamique| A2["🔍 Agent 2: Lead Scraping & Intelligence"]
        A2 -->|LinkedIn Live (sortBy=DD) + RemoteOK| RAW["📦 Offres d'emploi temps réel"]
        RAW -->|Filtres Villes & Déduplication| A1
    end

    subgraph S2["Évaluation & Decision Gate"]
        A1 -->|Algorithme de Scoring Hybride| SCORE["🎯 Match Score (0 - 100%)"]
        SCORE -->|Marrakech (+25 pts) / Casablanca (+22 pts)| GATE{"Decision Gate >= 75%"}
    end

    subgraph S3["Génération Adaptative & Outreach"]
        GATE -->|Validé| A3["✍️ Agent 3: Adaptive Human-Writer"]
        A3 -->|Protocole Anti-Détection IA| DOCS["📄 CV PDF sur-mesure + Email percutant"]
        DOCS --> SHIELD["🛡️ Deliverability Shield (Warm-up & Jitter)"]
        SHIELD --> SMTP["📤 Dispatch Gmail SMTP"]
    end

    subgraph S4["Surveillance Boîte RH & Détection d'Entretiens"]
        GMAIL["📬 Gmail Boîte de Réception"] -->|Sync IMAP Sécurisée| A4["📬 Agent 4: Recruiter Inbox & Sentiment"]
        A4 -->|Filtrage Spam & Scoring| INBOX["🎯 Détection d'Entretiens & Tests Techniques"]
        INBOX --> DRAFT["💬 Génération automatique de réponses IA"]
    end
```

### 1. 🧠 Agent 1 : Orchestrator & Profile Master
* **Ingestion dynamique :** Parse vos CVs PDF réels (`cv_fr.pdf` et `cv_en.pdf`) pour extraire compétences, séniorité et réalisations clés.
* **Algorithme de Match Score (0-100%) :** Évalue la pertinence de chaque offre scrapée en pondérant la stack technique, l'expérience et la géographie.
* **Surpondération Géographique Ciblée :** Bonus immédiat pour **Marrakech** (+25 pts) et **Casablanca** (+22 pts) pour privilégier les opportunités régionales à fort potentiel.
* **Decision Gate (≥ 75%) :** Filtre strictement les opportunités sous le seuil pour préserver le temps et la réputation de l'utilisateur.

### 2. 🔍 Agent 2 : Scraping & Lead Intelligence Agent
* **LinkedIn Live Guest Scraping :** Extraction des annonces en direct sans compte ni friction reCAPTCHA, avec le paramètre `sortBy=DD` pour toujours capter les annonces les plus fraîches publiées dans les dernières 24h.
* **Boucle Autonome 30s :** Cycle continu configurable exécutant un scraping complet, suivi d'une pause de 30 secondes (`30s off`) avant répétition.
* **Résolution de Contacts RH :** Détection automatique des recruteurs et emails RH vérifiés pour les grands comptes et scaleups (Orange Business, SQLI, Cegid, Capgemini, The Flex, etc.).

### 3. ✍️ Agent 3 : Adaptive Human-Writer Agent
* **Protocole Anti-AI Detector :** Stylométrie naturelle humaine, storytelling personnalisé, accroches axées sur les résultats chiffrés et absence d'en-têtes redondants.
* **CV Tailoring & Moteur PDF :** Réordonnancement dynamique des projets et mots-clés techniques sur trame bilingue (Français & Anglais).
* **A/B Testing Natif :** Génération de 2 variantes d'emails d'approche (Alignement technique vs. Résolution de problèmes).

### 4. 📬 Agent 4 : Inbox Intelligence & Sentiment Agent
* **Surveillance IMAP en temps réel :** Connexion directe et sécurisée à `imap.gmail.com:993` via mot de passe d'application.
* **Détection d'Entretiens (Zero Fake Data) :** Analyse sémantique des réponses recruteurs pour isoler les convocations en entretien (ex: *YO HR Consultancy / Micro1 AI Interview*), les tests techniques et les demandes de prétentions salariales.
* **Générateur de Réponses 1-Click :** Rédaction de réponses adaptées proposant immédiatement des créneaux horaires concrets.

---

## 🛡️ Deliverability Shield & Protection Anti-Bounce

Pour protéger l'adresse Gmail de l'utilisateur et garantir une réputation d'expéditeur maximale (0% bounce rate) :
* ❌ **Zéro devinette d'adresses :** Interdiction stricte d'envoyer des emails automatiques à des adresses non certifiées (ex: `careers@...` non validé).
* 🌐 **Fallback URL Officielle :** Si aucun contact direct certifié n'existe, l'offre bascule en mode *Candidature directe ATS / LinkedIn*.
* ⏱️ **Jitter Humain Aléatoire :** Délai de 1 000 à 3 000 ms entre les requêtes pour émuler un comportement humain authentique.
* 📊 **Warm-Up Quota :** Plafond strict de 15 à 20 candidatures par jour avec monitoring d'envoi.

---

## 💻 Interface Dashboard SaaS

Le tableau de bord propose une interface Next.js 15 moderne avec Tailwind CSS :

* 🎯 **Hero Spotlight :** Alerte en tête de page mettant en avant l'entretien le plus proche et prioritaire avec bouton d'action direct (ex: Passer l'évaluation Micro1).
* 🔄 **Contrôleur de Boucle 30s :** Badge d'état dynamique (`🟢 Active` / `⏸️ En Pause`), compteur de cycles achevés et déclencheur de cycle immédiat.
* 📍 **Filtres Géographiques Dédiés :** Tri instantané (`⭐ Marrakech & Casablanca`, `🏙️ Marrakech`, `🏢 Casablanca`, `🌐 Remote`).
* 📋 **Mode HITL (Human-in-the-Loop) :** Prévisualisation, édition en direct du CV et de la lettre de motivation avant approbation finale de l'envoi.

---

## 🛠️ Stack Technique

| Domaine | Technologies |
| :--- | :--- |
| **Framework Web** | Next.js 15 (App Router, Turbopack, React 19) |
| **Styling & UI** | Tailwind CSS 3, Lucide Icons, Headless UI |
| **Langage** | TypeScript 5 (Mode Strict & Typage rigoureux) |
| **Scraping** | Puppeteer Stealth, Fetch API Native, Parser HTML |
| **Messagerie & Mail** | Nodemailer (SMTP:465), ImapFlow (IMAP:993), Mailparser |
| **Base de Données** | PostgreSQL (pg) avec fallback automatique sur Store JSON local (`data/`) |
| **Traitement Documents** | PDF-Lib, PDF-Parse, Moteur HTML-to-PDF |

---

## 🚀 Installation & Démarrage Rapide

### 1. Cloner le projet
```bash
git clone https://github.com/AnasLabzar/AgencyGetJobs.git
cd AgencyGetJobs
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
Créez un fichier `.env` à la racine (copiez `.env.example`) :
```env
# Authentification Gmail (Utiliser un Mot de passe d'application)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_d_application

IMAP_HOST=imap.gmail.com
IMAP_PORT=993

# Base de données PostgreSQL (Optionnelle - Fallback local automatique)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitment_engine

# Clé OpenAI (Optionnelle)
OPENAI_API_KEY=
```

> 💡 **Remarque :** Le mot de passe d'application Gmail s'obtient sur : *Google Account > Sécurité > Mots de passe des applications*.

### 4. Lancer l'application

Pour lancer le Dashboard SaaS :
```bash
npm run dev:web
```
L'interface est accessible sur [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

Pour compiler pour la production :
```bash
npm run build:web
npm run start:web
```

---

## 📂 Structure du Répertoire

```text
AgencyGetJobs/
├── public/                 # CVs de référence (PDFs FR & EN) et assets
├── src/
│   ├── agents/             # Moteurs des 4 agents autonomes
│   │   ├── orchestrator.ts       # Agent 1 : Chef d'orchestre & Boucle 30s
│   │   ├── scraping-agent.ts     # Agent 2 : Scraping LinkedIn & RemoteOK
│   │   ├── writer-agent.ts       # Agent 3 : Rédaction personnalisée & Anti-AI
│   │   ├── inbox-agent.ts        # Agent 4 : Surveillance IMAP & Entretiens
│   │   └── performance-agent.ts  # Métriques, warm-up et tracking
│   ├── app/                # Next.js App Router (Pages & API Routes)
│   │   ├── api/                  # Endpoints (scraper/loop, inbox, jobs, apply)
│   │   └── dashboard/            # Pages du Dashboard SaaS
│   ├── db/                 # Connecteur PostgreSQL & Local JSON fallback
│   └── services/           # Services SMTP, IMAP et Deliverability Shield
├── data/                   # Magasin local persistant de données
├── .env.example            # Gabarit des variables d'environnement
├── README.md               # Documentation officielle du projet
└── tsconfig.json           # Configuration TypeScript
```

---

## 👤 Auteur & Crédits

Conçu et développé par **Anas Labzar**  
*Développeur Full-Stack & Automatisation Systèmes Multi-Agents IA*  
LinkedIn : [linkedin.com/in/anas-labzar](https://linkedin.com/in/anas-labzar) • Email : [principeanas80@gmail.com](mailto:principeanas80@gmail.com)

---

## 📄 Licence

Ce projet est sous licence MIT — vous êtes libre de l'utiliser, le modifier et le distribuer.
