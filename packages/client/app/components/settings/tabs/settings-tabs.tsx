import { Link, Outlet, useLocation } from "react-router";
import { useOrganization } from "~/context/contexts/organization.context";
import { Tabs, TabsList, TabsTrigger } from "~/ui/components/tabs";
import { type NavigationItem, OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const SettingsTabs = ({ tabs }: { tabs: NavigationItem[] }) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const { pathname } = useLocation();

  const active = tabs.find(({ path }) =>
    pathname.startsWith(OrganizationPath.create({ organizationId: organization.id }).to({ path })),
  );

  return (
    <>
      <Tabs value={active?.path ?? null}>
        <TabsList variant="line">
          {tabs.map(({ title, path }) => (
            <TabsTrigger
              key={path}
              value={path}
              nativeButton={false}
              render={
                <Link
                  to={OrganizationPath.create({
                    organizationId: organization.id,
                  }).to({ path })}
                />
              }
            >
              {i18n.navigation[title]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Outlet />
    </>
  );
};
