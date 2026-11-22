import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "recruitment_store.json");

export interface RecruiterInboxMessage {
  id: string;
  uid: number;
  sender_name: string;
  sender_email: string;
  company_name: string;
  subject: string;
  date: string;
  is_unread: boolean;
  category: "INTERVIEW_INVITATION" | "POSITIVE_INTEREST" | "TECHNICAL_TEST" | "INFORMATION_REQUEST" | "REJECTION" | "IMPORTANT_UNREAD" | "GENERAL";
  importance_score: number;
  urgency_badge: "URGENT_INTERVIEW" | "ACTION_REQUIRED" | "FOLLOW_UP_NEEDED" | "INFO_ONLY";
  summary: string;
  body_snippet: string;
  full_body?: string;
  suggested_action: string;
  draft_reply: string;
  matched_application_id?: number | undefined;
  is_replied?: boolean | undefined;
  replied_at?: string | undefined;
}

export interface LocalStore {
  user_profiles: any[];
  job_offers: any[];
  applications: any[];
  email_logs: any[];
  performance_metrics: any[];
  agent_config: Record<string, string>;
  interview_preps: any[];
  linkedin_outreach: any[];
  inbox_messages?: RecruiterInboxMessage[];
}

const DEFAULT_STORE: LocalStore = {
  user_profiles: [
    {
      id: 1,
      profile_id: "user_master",
      full_name: "ANAS LABZAR",
      languages: ["FR", "EN", "AR"],
      core_competencies: [
        "Full-Stack Development (Next.js, React, Node.js, TypeScript)",
        "Digital Marketing & Brand Strategy",
        "Technical Project Management & AI Automation"
      ],
      experience_years: 4,
      cv_template_fr: "public/pdf/cv Anas Labzar - Fr (1).pdf",
      cv_template_en: "public/pdf/CV EN CANADIEN _ ANAS LABZAR.pdf",
      updated_at: new Date().toISOString()
    }
  ],
  job_offers: [
    {
      id: 1,
      offer_id: "job_li_4410563242",
      source_url: "https://ma.linkedin.com/jobs/view/d%C3%A9veloppeur-fullstack-symfony-vue-js-senior-casablanca-rabat-at-sqli-4410563242",
      company_name: "SQLI",
      job_title: "Développeur Fullstack Web & Cloud Senior",
      location: "Casablanca & Rabat, Maroc",
      rh_contact_name: "Recrutement SQLI Maroc",
      rh_contact_email: "recrutement-maroc@sqli.com",
      rh_contact_linkedin: "https://www.linkedin.com/company/sqli",
      tech_stack: ["Next.js", "React", "Node.js", "TypeScript", "PostgreSQL"],
      match_score: 91,
      status: "APPROVED",
      description: "Conception et déploiement d'architectures web robustes et évolutives pour des clients internationaux.",
      posted_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      offer_id: "job_li_4470881021",
      source_url: "https://ma.linkedin.com/jobs/view/ds-d%C3%A9veloppeur-fullstack-java-angular-confirm%C3%A9-at-orange-business-4470881021",
      company_name: "Orange Business",
      job_title: "Développeur Fullstack Web Confirmé",
      location: "Casablanca-Settat, Maroc",
      rh_contact_name: "Talent Acquisition Orange Business",
      rh_contact_email: "recrutement.obs@orange.com",
      rh_contact_linkedin: "https://www.linkedin.com/company/orange-business-services",
      tech_stack: ["React", "TypeScript", "Node.js", "REST API", "Docker"],
      match_score: 88,
      status: "APPROVED",
      description: "Intégration d'applications métier complexes au sein de l'écosystème Orange Business Maroc.",
      posted_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      offer_id: "job_li_4486460023",
      source_url: "https://ma.linkedin.com/jobs/view/d%C3%A9veloppeur-confirm%C3%A9-fullstack-net-react-f-h-complaince-at-cegid-4486460023",
      company_name: "Cegid",
      job_title: "Développeur Confirmé Fullstack React / Cloud",
      location: "Casablanca, Maroc",
      rh_contact_name: "Recrutement Cegid Maroc",
      rh_contact_email: "recrutement@cegid.com",
      rh_contact_linkedin: "https://www.linkedin.com/company/cegid",
      tech_stack: ["React", "TypeScript", "Next.js", "PostgreSQL", "Tailwind CSS"],
      match_score: 86,
      status: "APPROVED",
      description: "Développement de solutions SaaS innovantes pour la gestion et le pilotage d'entreprise.",
      posted_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      offer_id: "job_li_4470915961",
      source_url: "https://ma.linkedin.com/jobs/view/product-engineer-at-the-flex-4470915961",
      company_name: "The Flex",
      job_title: "Product Engineer (Next.js / TypeScript)",
      location: "Casablanca / Hybride",
      rh_contact_name: "Hiring Team The Flex",
      rh_contact_email: "careers@theflex.ma",
      rh_contact_linkedin: "https://www.linkedin.com/company/theflex",
      tech_stack: ["Next.js", "TypeScript", "Node.js", "Tailwind CSS"],
      match_score: 93,
      status: "APPROVED",
      description: "Création de parcours utilisateurs fluides et performants avec Next.js App Router.",
      posted_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 5,
      offer_id: "job_li_4488865855",
      source_url: "https://fr.linkedin.com/jobs/view/senior-software-engineer-at-filiz-4488865855",
      company_name: "Filiz",
      job_title: "Senior Full-Stack Engineer (Next.js / Node.js)",
      location: "Paris / Remote",
      rh_contact_name: "Talent Team Filiz",
      rh_contact_email: "recrutement@filiz.fr",
      rh_contact_linkedin: "https://www.linkedin.com/company/filiz",
      tech_stack: ["Next.js", "TypeScript", "Node.js", "PostgreSQL"],
      match_score: 94,
      status: "APPROVED",
      description: "Développement de la plateforme SaaS cœur avec architecture moderne et scalabilité accrue.",
      posted_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  applications: [
    {
      id: 1,
      offer_id: "job_li_4410563242",
      company_name: "SQLI",
      job_title: "Développeur Fullstack Web & Cloud Senior",
      cv_path: "public/pdf/cv Anas Labzar - Fr (1).pdf",
      cover_letter: "Candidature personnalisée pour le poste de Développeur Fullstack Senior chez SQLI Maroc.",
      email_subject: "Candidature - Développeur Fullstack Senior chez SQLI Maroc",
      email_body: "Bonjour l'équipe Recrutement SQLI,\n\nJ'ai suivi avec beaucoup d'attention vos récentes réalisations chez SQLI et votre recherche d'un Développeur Fullstack...",
      email_sent: true,
      email_sent_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      email_status: "sent",
      response_received: true,
      response_date: new Date(Date.now() - 86400000).toISOString(),
      interview_scheduled: true,
      match_score: 91,
      ab_variant: "A",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 2,
      offer_id: "job_li_4470881021",
      company_name: "Orange Business",
      job_title: "Développeur Fullstack Web Confirmé",
      cv_path: "public/pdf/cv Anas Labzar - Fr (1).pdf",
      cover_letter: "Candidature personnalisée pour le poste de Développeur Fullstack chez Orange Business Maroc.",
      email_subject: "Candidature - Développeur Fullstack chez Orange Business",
      email_body: "Bonjour,\n\nVotre offre pour le poste de Développeur Fullstack a immédiatement retenu mon attention...",
      email_sent: true,
      email_sent_at: new Date(Date.now() - 86400000).toISOString(),
      email_status: "sent",
      response_received: false,
      response_date: null,
      interview_scheduled: false,
      match_score: 88,
      ab_variant: "B",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  email_logs: [
    {
      id: 1,
      application_id: 1,
      recipient_email: "recrutement-maroc@sqli.com",
      recipient_name: "Recrutement SQLI Maroc",
      subject: "Candidature - Développeur Fullstack Senior chez SQLI Maroc",
      status: "sent",
      error_message: null,
      sent_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 2,
      application_id: 2,
      recipient_email: "recrutement.obs@orange.com",
      recipient_name: "Talent Acquisition Orange Business",
      subject: "Candidature - Développeur Fullstack chez Orange Business",
      status: "sent",
      error_message: null,
      sent_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  performance_metrics: [
    {
      id: 1,
      date: new Date().toISOString().split("T")[0],
      total_applications: 2,
      emails_sent: 2,
      responses_received: 1,
      interviews_scheduled: 1,
      average_match_score: 89.5,
      email_open_rate: 100,
      email_click_rate: 50,
      bounce_rate: 0,
      created_at: new Date().toISOString()
    }
  ],
  agent_config: {
    autonomous_mode: "false",
    match_score_threshold: "75",
    max_applications_per_day: "20",
    scraping_interval_minutes: "60",
    warmup_enabled: "true",
    ab_testing_enabled: "true",
    preferred_cv_language: "AUTO",
    hitl_approval_mode: "true"
  },
  interview_preps: [
    {
      id: 1,
      application_id: 1,
      company_name: "SQLI",
      job_title: "Développeur Fullstack Web & Cloud Senior",
      candidate_name: "ANAS LABZAR",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      prep_content: {
        company_summary: "Groupe européen leader dans les services digitaux et le conseil e-commerce, implanté solidement à Casablanca et Rabat.",
        tech_stack: ["Next.js", "React", "Node.js", "TypeScript", "PostgreSQL"],
        technical_questions: [
          {
            question: "Comment concevez-vous l'intégration continue et le déploiement d'une application Next.js/Node.js multi-environnements ?",
            expected_answer: "GitHub Actions / GitLab CI, tests automatisés, images Docker optimisées multi-stage et orchestration cloud.",
            candidate_hook: "Citer vos 4 années d'expérience dans les pipelines automatisés et le monitoring de performance."
          }
        ],
        behavioral_questions: [
          {
            question: "Comment gérez-vous la coordination avec des équipes distribuées entre la France et le Maroc ?",
            framework: "STAR (Situation, Task, Action, Result)",
            candidate_hook: "Mettre en avant votre rigueur de communication asynchrone et votre sens du livrable."
          }
        ],
        questions_to_ask_interviewer: [
          "Quels sont les principaux challenges d'architecture cloud sur les nouveaux projets de SQLI Maroc ?",
          "Quelle est la répartition typique entre la conception de nouvelles features et la maintenance évolutive ?"
        ]
      }
    }
  ],
  linkedin_outreach: [],
  inbox_messages: []
};

export function loadStore(): LocalStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_FILE)) {
    saveStore(DEFAULT_STORE);
    return DEFAULT_STORE;
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STORE,
      ...parsed,
      agent_config: { ...DEFAULT_STORE.agent_config, ...(parsed.agent_config || {}) },
      inbox_messages: Array.isArray(parsed.inbox_messages) ? parsed.inbox_messages : []
    };
  } catch (e) {
    console.error("[LOCAL_DB] Error parsing store file, resetting to defaults:", e);
    saveStore(DEFAULT_STORE);
    return DEFAULT_STORE;
  }
}

export function saveStore(store: LocalStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}
