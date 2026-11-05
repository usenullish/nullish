-- Accepts an invitation: the signed-in person joins the organization with the
-- role of the invitation, and the invitation is used up (deleted). Returns the
-- new membership.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because the invited person can neither read the invitations of an
-- organization nor add themselves as a member. The function checks itself
-- that the token, the expiry and the email match.
CREATE OR REPLACE FUNCTION core.accept_invitation (p_token text) RETURNS core.memberships AS $$
DECLARE
v_user_id text := auth.current_user_id();
v_invitation core.invitations;
v_membership core.memberships;
BEGIN
v_invitation := core.find_invitation(p_token);

INSERT INTO core.memberships (organization_id, user_id, role)
VALUES (v_invitation.organization_id, v_user_id, v_invitation.role)
RETURNING * INTO v_membership;

DELETE FROM core.invitations i
WHERE i.id = v_invitation.id;

RETURN v_membership;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

REVOKE
EXECUTE ON FUNCTION core.accept_invitation (text)
FROM
  PUBLIC;

GRANT
EXECUTE ON FUNCTION core.accept_invitation (text) TO authenticated_user;
