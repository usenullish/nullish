import { Navigate, useLocation } from "react-router";

const UserSettingsPage = () => {
  const { state } = useLocation();

  return <Navigate to="/user/settings/account" state={state} replace />;
};

export default UserSettingsPage;
