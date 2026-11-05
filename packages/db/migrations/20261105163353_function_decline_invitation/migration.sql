-- Declines an invitation: it is deleted, so its link stops working.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because only the admins of an organization may delete its
-- invitations. The function checks itself that the token, the expiry and the
-- email match.
CREATE OR REPLACE FUNCTION core.decline_invitation (p_token text) RETURNS void AS $$
DECLARE
v_invitation core.invitations;
BEGIN
v_invitation := core.find_invitation(p_token);

DELETE FROM core.invitations i
WHERE i.id = v_invitation.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

REVOKE
EXECUTE ON FUNCTION core.decline_invitation (text)
FROM
  PUBLIC;

GRANT
EXECUTE ON FUNCTION core.decline_invitation (text) TO authenticated_user;
