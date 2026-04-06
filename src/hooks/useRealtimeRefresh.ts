/* ============================================================================
 *  useRealtimeRefresh — triggers a callback when any dashboard-relevant
 *  Supabase table changes. Pages call this with their reload function so
 *  the dashboard stays live without manual refresh.
 *
 *  Usage:  useRealtimeRefresh('my-page', reload)
 *          useRealtimeRefresh('my-page', reload, ['engagements', 'deliverables'])
 *
 *  If no tables are specified, listens to ALL dashboard tables.
 * ============================================================================ */

import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ALL_DASHBOARD_TABLES = [
  // Pipeline
  'pipeline_companies',
  'pipeline_contacts',
  'pipeline_opportunities',
  'pipeline_activities',
  'pipeline_tasks',
  'pipeline_partners',
  // Engagements & Deliverables
  'engagements',
  'clients',
  'deliverables',
  'phase_outputs',
  'phase_output_content',
  'documents',
  'interview_contacts',
  'legal_documents',
  'research_documents',
  'invoices',
  'follow_up_sequences',
  // Content
  'content_posts',
  'content_news',
  'story_bank',
  // Scheduled task write-backs
  'pipeline_briefings',
  'weekly_metrics_rollups',
  'commenting_opportunities',
] as const

export type DashboardTable = typeof ALL_DASHBOARD_TABLES[number]

export function useRealtimeRefresh(
  channelName: string,
  onRefresh: () => void,
  tables?: DashboardTable[],
) {
  const callbackRef = useRef(onRefresh)
  callbackRef.current = onRefresh

  useEffect(() => {
    const listenTables = tables ?? [...ALL_DASHBOARD_TABLES]
    let channel = supabase.channel(channelName)

    for (const table of listenTables) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => callbackRef.current(),
      )
    }

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [channelName, tables?.join(',')])
}
