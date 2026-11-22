import { query } from "../db/index";
import { loadStore, saveStore } from "../db/local-db";

type DBRow = Record<string, unknown>;

export async function getJobs(): Promise<DBRow[]> {
  try {
    const rows = (await query(
      "SELECT * FROM job_offers ORDER BY created_at DESC LIMIT 100"
    )) as DBRow[];
    return rows;
  } catch {
    return loadStore().job_offers;
  }
}

export async function getJobById(offerId: string): Promise<DBRow | null> {
  try {
    const rows = (await query(
      "SELECT * FROM job_offers WHERE offer_id = $1",
      [offerId]
    )) as DBRow[];
    if (rows && rows.length > 0 && rows[0]) return rows[0];
  } catch {
    // fallback
  }
  const store = loadStore();
  const found = store.job_offers.find((j) => j.offer_id === offerId);
  return found || null;
}

export async function getApplications(): Promise<DBRow[]> {
  try {
    const rows = (await query(
      `SELECT a.*, j.company_name, j.job_title, j.location 
       FROM applications a 
       LEFT JOIN job_offers j ON a.offer_id = j.offer_id 
       ORDER BY a.created_at DESC LIMIT 100`
    )) as DBRow[];
    return rows;
  } catch {
    return loadStore().applications;
  }
}

export async function getApplicationById(id: number): Promise<DBRow | null> {
  try {
    const rows = (await query(
      "SELECT * FROM applications WHERE id = $1",
      [id]
    )) as DBRow[];
    if (rows && rows.length > 0 && rows[0]) return rows[0];
  } catch {
    // fallback
  }
  const store = loadStore();
  const found = store.applications.find((a) => a.id === id);
  return found || null;
}

export async function getEmailLogs(): Promise<DBRow[]> {
  try {
    const rows = (await query(
      "SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 100"
    )) as DBRow[];
    return rows;
  } catch {
    return loadStore().email_logs;
  }
}

export async function getMetrics(): Promise<DBRow[]> {
  try {
    const rows = (await query(
      "SELECT * FROM performance_metrics ORDER BY date DESC LIMIT 30"
    )) as DBRow[];
    return rows;
  } catch {
    return loadStore().performance_metrics;
  }
}

export async function getAgentConfig(): Promise<DBRow[]> {
  try {
    const rows = (await query("SELECT * FROM agent_config")) as DBRow[];
    return rows;
  } catch {
    const store = loadStore();
    return Object.entries(store.agent_config).map(([config_key, config_value]) => ({
      config_key,
      config_value
    }));
  }
}

export async function updateAgentConfig(key: string, value: string): Promise<void> {
  const store = loadStore();
  store.agent_config[key] = value;
  saveStore(store);

  try {
    await query(
      `INSERT INTO agent_config (config_key, config_value, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (config_key) DO UPDATE SET 
         config_value = EXCLUDED.config_value, 
         updated_at = NOW()`,
      [key, value]
    );
  } catch {
    // Store already updated
  }
}

export async function getProfile(): Promise<DBRow | null> {
  try {
    const rows = (await query(
      "SELECT * FROM user_profiles WHERE profile_id = 'user_master' LIMIT 1"
    )) as DBRow[];
    if (rows && rows.length > 0 && rows[0]) return rows[0];
  } catch {
    // fallback
  }
  const store = loadStore();
  const profile = store.user_profiles[0];
  return profile || null;
}

export async function getDashboardStats(): Promise<{
  totalJobs: number;
  totalApplications: number;
  emailsSent: number;
  responsesReceived: number;
  averageMatchScore: string;
}> {
  const store = loadStore();
  const totalJobs = store.job_offers.length;
  const totalApplications = store.applications.length;
  const emailsSent = store.applications.filter((a) => a.email_sent).length;
  const responsesReceived = store.applications.filter((a) => a.response_received).length;
  
  const scores = store.job_offers.map((j) => Number(j.match_score) || 0).filter((s) => s > 0);
  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "0";

  return {
    totalJobs,
    totalApplications,
    emailsSent,
    responsesReceived,
    averageMatchScore: avg
  };
}

export async function getInterviewPreps(): Promise<any[]> {
  const store = loadStore();
  return store.interview_preps || [];
}

export async function saveInterviewPrep(prep: any): Promise<void> {
  const store = loadStore();
  const id = (store.interview_preps?.length || 0) + 1;
  store.interview_preps = store.interview_preps || [];
  store.interview_preps.unshift({ id, ...prep, created_at: new Date().toISOString() });
  saveStore(store);
}

export async function getLinkedInOutreach(): Promise<any[]> {
  const store = loadStore();
  return store.linkedin_outreach || [];
}

export async function saveLinkedInOutreach(outreach: any): Promise<void> {
  const store = loadStore();
  const id = (store.linkedin_outreach?.length || 0) + 1;
  store.linkedin_outreach = store.linkedin_outreach || [];
  store.linkedin_outreach.unshift({ id, ...outreach, created_at: new Date().toISOString() });
  saveStore(store);
}
