-- Returns the name of the organization of an invitation, so that the invited
-- person sees what they are about to join before accepting it.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because the invited person can read neither the invitations nor the
-- organization before joining it. The function checks itself that the token,
-- the expiry and the email match, as core.accept_invitation does, and returns
-- nothing but the name.
CREATE OR REPLACE FUNCTION core.get_invitation (p_token text) RETURNS TABLE (organization_name text) AS $$
DECLARE
v_invitation core.invitations;
BEGIN
v_invitation := core.find_invitation(p_token);

RETURN QUERY
SELECT o.name
FROM core.organizations o
WHERE o.id = v_invitation.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

REVOKE
EXECUTE ON FUNCTION core.get_invitation (text)
FROM
  PUBLIC;

GRANT
EXECUTE ON FUNCTION core.get_invitation (text) TO authenticated_user;
