import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import { isEmptyString, type Option } from "@usenullish/nullish-common";
import { useOrganization } from "~/context/contexts/organization.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/ui/components/dropdown-menu";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "~/ui/components/sidebar";
import {
  NAVIGATION,
  type NavigationGroup,
  type NavigationItem,
  OrganizationPath,
  OrganizationRootPath,
  MIGRATIONS_NAVIGATION_GROUP,
  TEAM_NAVIGATION_GROUP,
} from "~/navigation";
import { OrganizationSwitcher } from "./organization-switcher";
import { UserMenu } from "./user-menu";
import { useI18n } from "~/kit/i18n/i18n.context";
import type { Api } from "@usenullish/nullish-schema/server";
import { useActiveConversation } from "~/kit/chat/active-conversation.context";

type OrganizationId = Api["Organizations"]["Client"]["Organization"]["id"];

export const AppSidebar = () => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const { pathname } = useLocation();

  const active = OrganizationRootPath.create({ organizationId: organization.id }).findActiveItem({
    pathname,
  });
  const { activeConversation } = useActiveConversation();

  const admin = useIsOrganizationAdmin({ organizationId: organization.id });

  const navigation = NAVIGATION.filter(
    (group) => admin || (group !== TEAM_NAVIGATION_GROUP && group !== MIGRATIONS_NAVIGATION_GROUP),
  );

  const toPath = (path: NavigationItem["path"]): string => {
    const orgPath = OrganizationRootPath.create({
      organizationId: organization.id,
    });

    return isEmptyString(path)
      ? orgPath.toAssistant({
          conversationId:
            activeConversation?.organizationId === organization.id
              ? activeConversation.conversationId
              : undefined,
        })
      : orgPath.to({ path });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {navigation
          .filter(({ collapsible }) => collapsible !== true)
          .map((group) => (
            <SidebarGroup key={group.label}>
              {group.labelHidden !== true && (
                <SidebarGroupLabel>{i18n.navigation[group.label]}</SidebarGroupLabel>
              )}
              <SidebarMenu>
                {group.items.map(({ title, path, icon: Icon }) => (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton
                      tooltip={i18n.navigation[title]}
                      isActive={active?.path === path}
                      render={<Link to={toPath(path)} />}
                    >
                      {Icon !== undefined && <Icon />}
                      <span>{i18n.navigation[title]}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}

        <SidebarGroup>
          <SidebarGroupLabel>{i18n.navigation.organization}</SidebarGroupLabel>
          <SidebarMenu>
            {navigation
              .filter(({ collapsible }) => collapsible === true)
              .map((group) =>
                group.items.length === 1 ? (
                  <OrganizationItem
                    key={group.label}
                    group={group}
                    organizationId={organization.id}
                    activePath={active?.path}
                  />
                ) : (
                  <CollapsibleGroup
                    key={group.label}
                    group={group}
                    organizationId={organization.id}
                    activePath={active?.path}
                  />
                ),
              )}
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

const OrganizationItem = ({
  group: { label, icon: Icon, items },
  organizationId,
  activePath,
}: {
  group: NavigationGroup;
  organizationId: OrganizationId;
  activePath: Option<NavigationItem["path"]>;
}) => {
  const { i18n } = useI18n();

  return (
    <>
      {items.map(({ path }) => (
        <SidebarMenuItem key={path}>
          <SidebarMenuButton
            tooltip={i18n.navigation[label]}
            isActive={activePath === path}
            render={<Link to={OrganizationPath.create({ organizationId }).to({ path })} />}
          >
            {Icon !== undefined && <Icon />}
            <span>{i18n.navigation[label]}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
};

const CollapsibleGroup = ({
  group: { label, icon: Icon, items },
  organizationId,
  activePath,
}: {
  group: NavigationGroup;
  organizationId: OrganizationId;
  activePath: Option<NavigationItem["path"]>;
}) => {
  const { i18n } = useI18n();
  const { state, isMobile } = useSidebar();
  const containsActive = items.some(({ path }) => path === activePath);

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton tooltip={i18n.navigation[label]} isActive={containsActive} />
            }
          >
            {Icon !== undefined && <Icon />}
            <span>{i18n.navigation[label]}</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-56" side="right" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{i18n.navigation[label]}</DropdownMenuLabel>

              {items.map(({ title, path }) => (
                <DropdownMenuItem
                  key={path}
                  render={
                    <Link
                      to={OrganizationPath.create({ organizationId }).to({
                        path,
                      })}
                    />
                  }
                >
                  {i18n.navigation[title]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen={containsActive} render={<SidebarMenuItem />}>
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={i18n.navigation[label]} />}>
        {Icon !== undefined && <Icon />}
        <span>{i18n.navigation[label]}</span>
        <ChevronRight className="ml-auto transition-transform in-data-panel-open:rotate-90" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <SidebarMenuSub>
          {items.map(({ title, path }) => (
            <SidebarMenuSubItem key={path}>
              <SidebarMenuSubButton
                isActive={activePath === path}
                render={<Link to={OrganizationPath.create({ organizationId }).to({ path })} />}
              >
                <span>{i18n.navigation[title]}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};
