ALTER TABLE pipeline_tasks DROP CONSTRAINT pipeline_tasks_task_type_check;

ALTER TABLE pipeline_tasks ADD CONSTRAINT pipeline_tasks_task_type_check
  CHECK (task_type = ANY (ARRAY[
    'email', 'linkedin_dm', 'linkedin_audio', 'linkedin_comment',
    'linkedin_inmail', 'phone_warm', 'phone_cold', 'referral_intro',
    'in_person', 'conference',
    'video_call', 'review_draft', 'prep', 'follow_up', 'admin', 'other',
    'lead_gen', 'content', 'engagement'
  ]));
