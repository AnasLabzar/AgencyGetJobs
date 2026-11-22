/// ============================================================
/// Schema: Job Offer Intel
/// ============================================================
export interface JobOfferIntel {
  offer_id: string
  source_url: string
  company_name: string
  job_title: string
  location: string
  rh_contact: {
    name: string
    email: string
    linkedin_profile?: string
    is_verified?: boolean
    channel_recommended?: "EMAIL" | "DIRECT_URL" | "LINKEDIN"
  }
  tech_stack_required: string[]
  match_score: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  created_at: string
}

/// ============================================================
/// Schema: User Master Profile
/// ============================================================
export interface UserMasterProfile {
  profile_id: string
  full_name: string
  languages: string[]
  core_competencies: string[]
  experience_years: number
  cv_templates: {
    fr_pdf: string
    en_pdf: string
  }
}

/// ============================================================
/// Schema: Target Search Brief
/// ============================================================
export interface SearchBrief {
  profile_id: string
  keywords: string[]
  target_platforms: string[]
  experience_filters: {
    min_years: number
    max_years: number
    required_roles: string[]
  }
  geographic_preferences: {
    locations: string[]
    remote_ok: boolean
    mobility: string
  }
  salary_expectations?: {
    min: number
    max: number
    currency: string
  }
}

/// ============================================================
/// Schema: Scoring Result
/// ============================================================
export interface ScoringResult {
  offer_id: string
  match_score: number // 0-100
  criteria_breakdown: {
    skills_match: number
    experience_match: number
    location_match: number
    seniority_match: number
  }
  recommendations: string[]
}

/// ============================================================
/// Schema: Agent Dispatch Brief
/// ============================================================
export interface AgentDispatchBrief {
  search_brief: SearchBrief
  matched_offer: JobOfferIntel
  approval_status: "APPROVE" | "REJECT" | "REVIEW"
  dispatch_instructions: {
    agent2_tasks: string[]
    agent3_tasks: string[]
    writer_focus_areas: string[]
  }
}