import { Pool } from "pg";
import dotenv from "dotenv";
import { loadStore, saveStore } from "./local-db";

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "recruitment_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 1500,
};

export const pool = new Pool(dbConfig);
let postgresConnected: boolean | null = null;

export async function isPostgresAvailable(): Promise<boolean> {
  if (postgresConnected !== null) return postgresConnected;
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    postgresConnected = true;
    console.log("[DB] Connected to PostgreSQL successfully");
    return true;
  } catch (err) {
    postgresConnected = false;
    console.log("[DB] PostgreSQL not reachable. Active storage: Persistent Local Storage (data/recruitment_store.json)");
    return false;
  }
}

export async function query(text: string, params?: unknown[]): Promise<unknown> {
  const isPg = await isPostgresAvailable();
  if (isPg) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`[DB-PG] Executed query in ${duration}ms: ${text.substring(0, 60)}...`);
      return res.rows;
    } catch (error) {
      console.warn("[DB-PG] Query failed, falling back to local storage:", error);
    }
  }

  // Fallback to local storage query emulation
  return executeLocalFallback(text, params);
}

function executeLocalFallback(text: string, params: unknown[] = []): unknown[] {
  const store = loadStore();
  const lower = text.toLowerCase().trim();

  // SELECT user_profiles
  if (lower.includes("from user_profiles")) {
    return store.user_profiles;
  }

  // SELECT job_offers
  if (lower.includes("from job_offers")) {
    if (lower.includes("where offer_id = $1")) {
      const offerId = params[0];
      return store.job_offers.filter((j) => j.offer_id === offerId);
    }
    return store.job_offers;
  }

  // SELECT applications
  if (lower.includes("from applications")) {
    if (lower.includes("where id = $1")) {
      const id = Number(params[0]);
      return store.applications.filter((a) => a.id === id);
    }
    return store.applications;
  }

  // SELECT email_logs
  if (lower.includes("from email_logs")) {
    return store.email_logs;
  }

  // SELECT performance_metrics
  if (lower.includes("from performance_metrics")) {
    return store.performance_metrics;
  }

  // SELECT agent_config
  if (lower.includes("from agent_config")) {
    return Object.entries(store.agent_config).map(([config_key, config_value]) => ({
      config_key,
      config_value
    }));
  }

  // SELECT COUNT queries for stats
  if (lower.includes("count(*) as count from job_offers")) {
    return [{ count: store.job_offers.length }];
  }
  if (lower.includes("count(*) as count from applications where email_sent = true")) {
    return [{ count: store.applications.filter((a) => a.email_sent).length }];
  }
  if (lower.includes("count(*) as count from applications where response_received = true")) {
    return [{ count: store.applications.filter((a) => a.response_received).length }];
  }
  if (lower.includes("count(*) as count from applications")) {
    return [{ count: store.applications.length }];
  }
  if (lower.includes("avg(match_score) as avg from job_offers")) {
    const scores = store.job_offers.map((j) => Number(j.match_score) || 0).filter((s) => s > 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return [{ avg: avg.toFixed(1) }];
  }

  // INSERT INTO job_offers
  if (lower.startsWith("insert into job_offers")) {
    const [offer_id, source_url, company_name, job_title, location, rh_name, rh_email, rh_linkedin, tech_stack, match_score, status, description, posted_date] = params;
    const existingIndex = store.job_offers.findIndex((j) => j.offer_id === offer_id);
    const offerRecord = {
      id: existingIndex >= 0 ? store.job_offers[existingIndex].id : store.job_offers.length + 1,
      offer_id,
      source_url,
      company_name,
      job_title,
      location,
      rh_contact_name: rh_name || null,
      rh_contact_email: rh_email || null,
      rh_contact_linkedin: rh_linkedin || null,
      tech_stack: typeof tech_stack === "string" ? JSON.parse(tech_stack) : (tech_stack || []),
      match_score: Number(match_score) || 0,
      status: status || "PENDING",
      description: description || "",
      posted_date: posted_date || new Date().toISOString(),
      created_at: existingIndex >= 0 ? store.job_offers[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      store.job_offers[existingIndex] = { ...store.job_offers[existingIndex], ...offerRecord };
    } else {
      store.job_offers.unshift(offerRecord);
    }
    saveStore(store);
    return [offerRecord];
  }

  // INSERT INTO applications
  if (lower.startsWith("insert into applications")) {
    const [offer_id, cv_path, cover_letter, email_subject, email_body, email_sent, email_sent_at, match_score] = params;
    const offer = store.job_offers.find((j) => j.offer_id === offer_id);
    const appRecord = {
      id: store.applications.length + 1,
      offer_id,
      company_name: offer?.company_name || "N/A",
      job_title: offer?.job_title || "N/A",
      cv_path: cv_path || null,
      cover_letter: cover_letter || null,
      email_subject: email_subject || null,
      email_body: email_body || null,
      email_sent: Boolean(email_sent),
      email_sent_at: email_sent_at || (email_sent ? new Date().toISOString() : null),
      email_status: email_sent ? "sent" : "pending",
      response_received: false,
      response_date: null,
      interview_scheduled: false,
      match_score: match_score ? Number(match_score) : offer?.match_score || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.applications.unshift(appRecord);
    saveStore(store);
    return [appRecord];
  }

  // INSERT INTO user_profiles
  if (lower.startsWith("insert into user_profiles")) {
    const [profile_id, full_name, languages, core_competencies, experience_years, cv_template_fr, cv_template_en] = params;
    const profRecord = {
      id: 1,
      profile_id,
      full_name,
      languages: typeof languages === "string" ? JSON.parse(languages) : languages,
      core_competencies: typeof core_competencies === "string" ? JSON.parse(core_competencies) : core_competencies,
      experience_years: Number(experience_years) || 0,
      cv_template_fr,
      cv_template_en,
      updated_at: new Date().toISOString()
    };
    store.user_profiles = [profRecord];
    saveStore(store);
    return [profRecord];
  }

  // INSERT / UPDATE agent_config
  if (lower.startsWith("insert into agent_config")) {
    const [key, value] = params;
    if (key) {
      store.agent_config[String(key)] = String(value);
      saveStore(store);
    }
    return [];
  }

  return [];
}

export async function initDB(): Promise<void> {
  const isPg = await isPostgresAvailable();
  if (!isPg) {
    loadStore();
    console.log("[DB] Local store initialized with persistent data");
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        profile_id VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(200),
        languages JSONB DEFAULT '[]',
        core_competencies JSONB DEFAULT '[]',
        experience_years INTEGER DEFAULT 0,
        cv_template_fr TEXT,
        cv_template_en TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_offers (
        id SERIAL PRIMARY KEY,
        offer_id VARCHAR(200) UNIQUE NOT NULL,
        source_url TEXT,
        company_name VARCHAR(200),
        job_title VARCHAR(200),
        location VARCHAR(200),
        rh_contact_name VARCHAR(200),
        rh_contact_email VARCHAR(200),
        rh_contact_linkedin TEXT,
        tech_stack JSONB DEFAULT '[]',
        match_score DECIMAL(5,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'PENDING',
        description TEXT,
        posted_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        offer_id VARCHAR(200) REFERENCES job_offers(offer_id),
        cv_path TEXT,
        cover_letter TEXT,
        email_subject TEXT,
        email_body TEXT,
        email_sent BOOLEAN DEFAULT FALSE,
        email_sent_at TIMESTAMP,
        email_status VARCHAR(50) DEFAULT 'pending',
        response_received BOOLEAN DEFAULT FALSE,
        response_date TIMESTAMP,
        interview_scheduled BOOLEAN DEFAULT FALSE,
        match_score DECIMAL(5,2),
        ab_variant VARCHAR(10) DEFAULT 'A',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        application_id INTEGER,
        recipient_email VARCHAR(200),
        recipient_name VARCHAR(200),
        subject TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        total_applications INTEGER DEFAULT 0,
        emails_sent INTEGER DEFAULT 0,
        responses_received INTEGER DEFAULT 0,
        interviews_scheduled INTEGER DEFAULT 0,
        average_match_score DECIMAL(5,2) DEFAULT 0,
        email_open_rate DECIMAL(5,2) DEFAULT 0,
        email_click_rate DECIMAL(5,2) DEFAULT 0,
        bounce_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_config (
        id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("[DB] PostgreSQL tables verified / initialized successfully");
  } catch (err) {
    console.warn("[DB] PostgreSQL table init failed, defaulting to local store:", err);
    postgresConnected = false;
  }
}

export async function getPool() {
  return pool;
}

export async function closeDB(): Promise<void> {
  if (postgresConnected) {
    await pool.end();
  }
}
