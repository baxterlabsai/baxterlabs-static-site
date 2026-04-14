-- Rollback for 074. Restores column structure but NOT data.
-- Acceptable because all values are mirrored in assigned_to_user_id.

ALTER TABLE pipeline_tasks ADD COLUMN assigned_to text;
ALTER TABLE pipeline_opportunities ADD COLUMN assigned_to text;
