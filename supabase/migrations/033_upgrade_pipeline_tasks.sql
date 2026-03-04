-- Migration 033: Upgrade pipeline_tasks for typed task system
-- Adds task_type for outreach channel matching, description for details,
-- outcome_notes for completion logging, and source tracking.

-- 1. Add task_type column matching outreach channels + operational types
ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'follow_up'
    CHECK (task_type IN (
      'email', 'linkedin_dm', 'linkedin_audio', 'linkedin_comment',
      'linkedin_inmail', 'phone_warm', 'phone_cold', 'referral_intro',
      'in_person', 'conference',
      'video_call', 'review_draft', 'prep', 'follow_up', 'admin', 'other'
    ));

-- 2. Add description for task body/details (title stays as short label)
ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Add outcome_notes for when task is completed
ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- 4. Add source_plugin to track if task was auto-created by a plugin
ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS source_plugin TEXT;

-- 5. Add company_id FK if missing
ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES pipeline_companies(id);

-- 6. Index on task_type for cockpit grouping queries
CREATE INDEX IF NOT EXISTS idx_pipeline_tasks_task_type
  ON pipeline_tasks(task_type);

-- 7. Composite index for the Overview cockpit query (pending tasks by due date)
CREATE INDEX IF NOT EXISTS idx_pipeline_tasks_cockpit
  ON pipeline_tasks(status, due_date)
  WHERE status = 'pending';
