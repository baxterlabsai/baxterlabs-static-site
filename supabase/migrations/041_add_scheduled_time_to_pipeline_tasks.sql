ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS scheduled_end_time TIME;

COMMENT ON COLUMN pipeline_tasks.scheduled_time IS
  'Time of day the task is scheduled to start (e.g., 09:00:00). Null = no specific time.';
COMMENT ON COLUMN pipeline_tasks.scheduled_end_time IS
  'Time of day the task is scheduled to end. Null = open-ended.';
