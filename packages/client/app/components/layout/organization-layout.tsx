import { Link, useLocation, useMatches } from "react-router";
import { useOrganization } from "~/context/contexts/organization.context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/ui/components/breadcrumb";
import { Separator } from "~/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/ui/components/sidebar";
import { AppSidebar } from "./app-sidebar";
import { HeaderActions } from "~/components/layout/header-actions";
import { OrganizationRootPath } from "~/navigation";
import { isBreadcrumbHandle } from "~/kit/router/route-handle";
import { useActiveConversation } from "~/kit/chat/active-conversation.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { OrganizationDeletedBanner } from "~/components/layout/organization-deleted-banner";

export const OrganizationLayout = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const { pathname } = useLocation();

  const active = OrganizationRootPath.create({
    organizationId: organization.id,
  }).findActiveItem({ pathname });
  const { activeConversation } = useActiveConversation();

  const match = useMatches()
    .filter(({ handle }) => isBreadcrumbHandle(handle))
    .at(-1);

  const breadcrumb = isBreadcrumbHandle(match?.handle) ? match.handle.breadcrumb : undefined;

  const back =
    breadcrumb === undefined || match === undefined
      ? undefined
      : breadcrumb.back({ organizationId: organization.id, params: match.params });

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-w-0">
        <OrganizationDeletedBanner />

        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <Link
                      to={OrganizationRootPath.create({
                        organizationId: organization.id,
                      }).toAssistant({
                        conversationId:
                          activeConversation?.organizationId === organization.id
                            ? activeConversation.conversationId
                            : undefined,
                      })}
                    />
                  }
                >
                  {organization.name}
                </BreadcrumbLink>
              </BreadcrumbItem>

              {active !== undefined && active.path !== "" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {back === undefined ? (
                      <BreadcrumbPage>{i18n.navigation[active.title]}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link to={back} />}>
                        {i18n.navigation[active.title]}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </>
              )}

              {breadcrumb !== undefined && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{breadcrumb.label({ i18n })}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <HeaderActions />
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};
