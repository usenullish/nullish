import { isArrayEmpty, isNullish } from "@usenullish/nullish-common";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { UnscopedChat } from "~/components/chat/unscoped-chat";
import { NoOrganization } from "~/components/home/no-organization";

export const HomeContent = () => {
  const organizations = useOrganizations();

  if (isNullish(organizations)) {
    return null;
  }

  return isArrayEmpty(organizations) ? <NoOrganization /> : <UnscopedChat />;
};
