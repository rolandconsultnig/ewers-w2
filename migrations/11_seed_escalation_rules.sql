-- Seed default escalation rules for critical and high severity alerts (only if table is empty)
INSERT INTO "escalation_rules" ("name", "trigger_severity", "sla_minutes", "escalate_to_level", "notify_roles", "active")
SELECT name, trigger_severity, sla_minutes, escalate_to_level, notify_roles, active
FROM (VALUES
  ('Critical SLA - 15 min'::text, 'critical'::text, 15, 5, ARRAY['admin', 'manager']::text[], true),
  ('High SLA - 60 min'::text, 'high'::text, 60, 4, ARRAY['manager', 'responder']::text[], true),
  ('Medium SLA - 4 hours'::text, 'medium'::text, 240, 3, ARRAY['responder']::text[], true)
) AS v(name, trigger_severity, sla_minutes, escalate_to_level, notify_roles, active)
WHERE NOT EXISTS (SELECT 1 FROM "escalation_rules" LIMIT 1);
