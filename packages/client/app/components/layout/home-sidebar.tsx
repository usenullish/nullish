import { Building, Plus } from "lucide-react";
import { Link } from "react-router";
import { useOrganizations } from "~/context/contexts/organizations.context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/ui/components/sidebar";
import { OrganizationPath } from "~/navigation";
import { Logo, LogoText } from "~/components/core/logo";
import { UserMenu } from "./user-menu";
import { useI18n } from "~/kit/i18n/i18n.context";

export const HomeSidebar = () => {
  const { i18n } = useI18n();
  const organizations = useOrganizations();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/orgs" />}>
              <span className="relative flex h-8 w-full items-center">
                <LogoText className="h-4! w-auto! transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0" />
                <Logo
                  decorative
                  className="absolute left-1.5 size-5! opacity-0 transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-100"
                />
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{i18n.navigation.organizations}</SidebarGroupLabel>
          <SidebarMenu>
            {(organizations ?? []).map(({ id, name }) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuButton
                  tooltip={name}
                  render={
                    <Link
                      to={OrganizationPath.create({
                        organizationId: id,
                      }).to()}
                    />
                  }
                >
                  <Building />
                  <span>{name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={i18n.organizations.action.create}
                render={<Link to="/orgs/new" />}
              >
                <Plus />
                <span>{i18n.organizations.action.create}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
