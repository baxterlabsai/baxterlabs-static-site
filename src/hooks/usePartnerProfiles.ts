import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface PartnerProfile {
  id: string
  auth_user_id: string
  display_name: string
  role: string
  is_active: boolean
  card_color: string
}

const NEUTRAL_GRAY = '#9CA3AF'

let cachedPromise: Promise<PartnerProfile[]> | null = null
let cachedProfiles: PartnerProfile[] | null = null

async function fetchProfiles(): Promise<PartnerProfile[]> {
  if (!cachedPromise) {
    cachedPromise = (async () => {
      const { data, error } = await supabase
        .from('pipeline_partners')
        .select('id, auth_user_id, display_name, role, is_active, card_color')
        .eq('is_active', true)
        .eq('role', 'partner')
      if (error) {
        cachedPromise = null
        throw error
      }
      cachedProfiles = data as PartnerProfile[]
      return cachedProfiles
    })()
  }
  return cachedPromise
}

export function usePartnerProfiles() {
  const [profiles, setProfiles] = useState<PartnerProfile[]>(cachedProfiles ?? [])
  const [isLoading, setIsLoading] = useState(!cachedProfiles)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cachedProfiles) {
      setProfiles(cachedProfiles)
      setIsLoading(false)
      return
    }
    fetchProfiles()
      .then(data => {
        setProfiles(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err.message ?? 'Failed to load partner profiles')
        setIsLoading(false)
      })
  }, [])

  const getByAuthUserId = (authUserId: string | null): PartnerProfile | undefined => {
    if (!authUserId) return undefined
    return profiles.find(p => p.auth_user_id === authUserId)
  }

  const getDisplayNameByAuthUserId = (authUserId: string | null): string => {
    if (!authUserId) return 'Unassigned'
    return getByAuthUserId(authUserId)?.display_name ?? 'Unassigned'
  }

  const getColorByAuthUserId = (authUserId: string | null): string => {
    if (!authUserId) return NEUTRAL_GRAY
    return getByAuthUserId(authUserId)?.card_color ?? NEUTRAL_GRAY
  }

  return { profiles, getByAuthUserId, getDisplayNameByAuthUserId, getColorByAuthUserId, isLoading, error }
}
