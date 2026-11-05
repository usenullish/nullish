import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Link } from "react-router";
import { useOrganization } from "~/context/contexts/organization.context";
import { useOrganizations } from "~/context/contexts/organizations.context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/ui/components/sidebar";
import { OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const OrganizationSwitcher = () => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const organizations = useOrganizations();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <div className="flex aspect-square size-8 items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
              {organization.name.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-left font-medium">{organization.name}</span>
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{i18n.navigation.organizations}</DropdownMenuLabel>

              {(organizations ?? []).map(({ id, name }) => (
                <DropdownMenuItem
                  key={id}
                  render={
                    <Link
                      to={OrganizationPath.create({
                        organizationId: id,
                      }).to()}
                    />
                  }
                >
                  <span className="flex-1 truncate">{name}</span>
                  {id === organization.id && <Check />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem render={<Link to="/orgs/new" />}>
              <Plus />
              {i18n.organizations.action.create}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
