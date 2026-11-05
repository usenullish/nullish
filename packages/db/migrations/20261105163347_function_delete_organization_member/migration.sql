-- Deletes a membership: an admin removes any member of their organization,
-- a member removes their own membership (leaves). Returns the removed
-- membership, or no row when there is none or the caller may not remove it.
--
-- The chat conversations the person had in that organization are deleted with
-- it, for privacy: they contain the organization's data and nobody could read
-- them anymore. Their messages follow by cascade, the LLM usages are kept.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because a user can only read their own membership and delete their
-- own conversations, so an admin could not remove another member. The function
-- checks itself who may delete what.
--
-- The last admin is protected by the trigger enforce_memberships_last_admin.
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

REVOKE
EXECUTE ON FUNCTION core.delete_organization_member (uuid)
FROM
  PUBLIC;

GRANT
EXECUTE ON FUNCTION core.delete_organization_member (uuid) TO authenticated_user;
