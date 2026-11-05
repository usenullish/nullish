-- Finds the valid invitation of a token for the signed-in person and locks it:
-- not expired, sent to their email, of an organization that is not deleted and
-- they are not yet a member of. Only called by the invitation functions, never
-- granted to users.
CREATE OR REPLACE FUNCTION core.find_invitation (p_token text) RETURNS core.invitations AS $$
DECLARE
v_user_id text := auth.current_user_id();
v_email text;
v_invitation core.invitations;
BEGIN
SELECT u.email INTO v_email
FROM auth.users u
WHERE u.id = v_user_id;

IF NOT FOUND THEN
  RAISE EXCEPTION 'Sign in to access the invitation'
    USING ERRCODE = 'R0001';
END IF;

SELECT i.* INTO v_invitation
FROM core.invitations i
WHERE i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  AND i.expires_at > now()
  AND EXISTS (
    SELECT 1 FROM core.organizations o
    WHERE o.id = i.organization_id
      AND o.deleted_at IS NULL
  )
FOR UPDATE;

IF NOT FOUND THEN
  RAISE EXCEPTION 'This invitation is invalid or has expired'
    USING ERRCODE = 'R0001';
END IF;

IF lower(v_invitation.email) <> lower(v_email) THEN
  RAISE EXCEPTION 'This invitation was sent to another email address'
    USING ERRCODE = 'R0001';
END IF;

IF EXISTS (
  SELECT 1 FROM core.memberships m
  WHERE m.organization_id = v_invitation.organization_id
    AND m.user_id = v_user_id
) THEN
  RAISE EXCEPTION 'You are already a member of this organization'
    USING ERRCODE = 'R0001';
END IF;

RETURN v_invitation;
END;
$$ LANGUAGE plpgsql
SET
  search_path = '';

REVOKE
EXECUTE ON FUNCTION core.find_invitation (text)
FROM
  PUBLIC;
