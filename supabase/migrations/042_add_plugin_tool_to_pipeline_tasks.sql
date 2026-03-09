ALTER TABLE pipeline_tasks
  ADD COLUMN IF NOT EXISTS plugin_tool TEXT;

COMMENT ON COLUMN pipeline_tasks.plugin_tool IS
  'Optional free-text field for the plugin or tool used to execute this task
   (e.g., "Sales: Draft Outreach", "Mktg: Content Creation", "Claude in Chrome").';
