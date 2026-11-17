-- The foreign key from a subscription to its organization is checked at
-- commit: 20261117102252_trigger_create_organization_subscription inserts the
-- subscription before the organization row exists.
--
-- Drizzle cannot declare a deferrable foreign key, hence the ALTER.
ALTER TABLE subscription.subscriptions
ALTER CONSTRAINT subscriptions_organization_id_organizations_id_fkey DEFERRABLE INITIALLY DEFERRED;
