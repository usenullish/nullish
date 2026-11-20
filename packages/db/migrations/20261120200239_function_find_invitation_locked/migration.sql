-- The invitations of a locked organization are invalid, like those of a deleted
-- one: nobody can join an organization whose subscription is not valid
-- (20261117111529_function_subscription_is_valid). Same function as
-- 20261105163349_function_find_invitation, with that one more condition.
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
      AND subscription.organization_subscription_is_valid(o.id)
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
