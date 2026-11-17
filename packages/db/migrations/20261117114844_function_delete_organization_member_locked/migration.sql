-- Nobody can leave or be removed from a locked organization, like a deleted
-- one: the membership is only deleted if the organization's subscription is
-- valid (20261117111529_function_subscription_is_valid). Same function as
-- 20261105163347_function_delete_organization_member, with that one more
-- condition.
CREATE OR REPLACE FUNCTION core.delete_organization_member (p_membership_id uuid) RETURNS SETOF core.memberships AS $$
DECLARE
v_user_id text := auth.current_user_id();
v_deleted core.memberships;
BEGIN
-- Only the person themselves or an admin of the organization may remove the membership.
DELETE FROM core.memberships m
WHERE m.id = p_membership_id
  AND EXISTS (
    SELECT 1 FROM core.organizations org
    WHERE org.id = m.organization_id
      AND org.deleted_at IS NULL
      AND subscription.organization_subscription_is_valid(org.id)
  )
  AND (
    m.user_id = v_user_id
    OR EXISTS (
      SELECT 1 FROM core.memberships o
      WHERE o.organization_id = m.organization_id
        AND o.user_id = v_user_id
        AND o.role = 'admin'
    )
  )
RETURNING m.* INTO v_deleted;

-- Nothing was removed (unknown membership or not allowed), so nothing else is touched.
IF NOT FOUND THEN
  RETURN;
END IF;

-- The person's conversations in that organization only. Their conversations
-- elsewhere or without organization, and those of the other members, are kept.
DELETE FROM chat.conversations c
WHERE c.organization_id = v_deleted.organization_id
  AND c.user_id = v_deleted.user_id;

RETURN NEXT v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';
