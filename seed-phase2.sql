-- Insert default SLA Policies for priorities P0 to P3
INSERT INTO "SLAPolicy" (name, priority, "responseTimeMins", "createdAt", "updatedAt") 
VALUES 
  ('Critical Response', 'P0', 30, NOW(), NOW()),
  ('High Response', 'P1', 120, NOW(), NOW()),
  ('Normal Response', 'P2', 1440, NOW(), NOW()),
  ('Low Response', 'P3', 2880, NOW(), NOW())
ON CONFLICT (priority) DO NOTHING;

-- Insert an example Automation rule for critical bugs
INSERT INTO "Automation" (name, trigger, condition, action, "isActive", "createdAt", "updatedAt")
VALUES 
  ('Auto-assign Critical Bugs to Admin', 'ON_TICKET_CREATED', 'priority=P0', 'ASSIGN_TO,1', true, NOW(), NOW());
