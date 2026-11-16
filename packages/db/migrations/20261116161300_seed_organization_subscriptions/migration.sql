-- The organizations created before the subscriptions existed get an active
-- subscription without end, so that they stay usable. An organization that
-- already has a subscription keeps it.
INSERT INTO
  core.subscriptions (organization_id, status)
SELECT
  o.id,
  'active'
FROM
  core.organizations o
ON CONFLICT (organization_id) DO NOTHING;
