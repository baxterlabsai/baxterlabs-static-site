-- Migration 057: Add output_placements to engagement_graphics + backfill Scion
-- output_placements is an INTEGER[] of Phase 5 output_numbers (1-5) where each graphic should appear.

-- Step 1: Add the column
ALTER TABLE engagement_graphics
  ADD COLUMN IF NOT EXISTS output_placements INTEGER[];

COMMENT ON COLUMN engagement_graphics.output_placements IS
  'Array of Phase 5 output_numbers (1-5) where this graphic should be placed. E.g., {1,2,3} means Exec Summary, Full Report, and Deck.';

-- Step 2: Backfill Scion Staffing graphics
-- Output key: 1=Executive Summary, 2=Full Diagnostic Report, 3=Presentation Deck, 4=90-Day Roadmap, 5=Retainer Proposal

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'headline_waterfall'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'revenue_leak_grouped'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'cost_leak_grouped'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{1,2,3}'
WHERE chart_type = 'leak_ranking_bar'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'scenario_range_bar'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2,3,5}'
WHERE chart_type = 'roi_summary_slide'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2,4}'
WHERE chart_type = 'priority_matrix'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2,3,4}'
WHERE chart_type = 'gantt_90day'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'fragility_loop'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'quarterly_kpi_dashboard'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'recovery_bubble'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'recovery_ramp'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'margin_compression_trend'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'equity_revolver_trajectory'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'confidence_heatmap'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'action_effort_bar'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2,3}'
WHERE chart_type = 'deck_waterfall'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{1,2}'
WHERE chart_type = 'leak_donut'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');

UPDATE engagement_graphics SET output_placements = '{2}'
WHERE chart_type = 'vms_spread_waterfall'
AND engagement_id IN (SELECT e.id FROM engagements e JOIN clients c ON c.id = e.client_id WHERE c.company_name ILIKE '%scion%');
