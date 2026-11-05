import { Profile } from "~/components/user/profile/profile";
import { ProfileTwoFactor } from "~/components/user/profile/profile-two-factor";
import { ProfileDangerZone } from "~/components/user/profile/profile-danger-zone";

const UserSettingsAccountPage = () => (
  <>
    <Profile />
    <ProfileTwoFactor />
    <ProfileDangerZone />
  </>
);

export default UserSettingsAccountPage;
