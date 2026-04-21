import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.PUBLIC_SUPABASE_URL
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing — set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export type LeadMagnetAsset = 'field_guide' | 'self_assessment'
export type RevenueRange = '5-10' | '10-25' | '25-50' | 'under-5' | 'over-50'
export type AssessmentBand = 'low' | 'moderate' | 'high'

export type CaptureInput = {
  asset: LeadMagnetAsset
  name: string
  email: string
  company_name: string
  revenue_range: RevenueRange | null
  role: string | null
}

export async function insertLeadMagnetCapture(
  input: CaptureInput
): Promise<{ id: string }> {
  const { data, error } = await getSupabase()
    .from('lead_magnet_captures')
    .insert(input)
    .select('id')
    .single()
  if (error) throw error
  return data
}

export type ScoreInput = {
  capture_id: string
  answers: Record<string, number>
  total_score: number
  band: AssessmentBand
  revenue_range: RevenueRange
  exposure_low: number
  exposure_high: number
  industry: string | null
}

export async function insertSelfAssessmentScore(input: ScoreInput): Promise<void> {
  const { error } = await getSupabase()
    .from('self_assessment_scores')
    .insert(input)
  if (error) throw error
}
