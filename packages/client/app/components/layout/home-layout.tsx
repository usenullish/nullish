import { Link } from "react-router";
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
import { HeaderActions } from "~/components/layout/header-actions";
import { HomeSidebar } from "./home-sidebar";
import { useI18n } from "~/kit/i18n/i18n.context";

export const HomeLayout = ({ page, children }: { page?: string; children: React.ReactNode }) => {
  const { i18n } = useI18n();

  return (
    <SidebarProvider>
      <HomeSidebar />

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {page === undefined ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>{i18n.navigation.organizations}</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link to="/orgs" />}>
                      {i18n.navigation.organizations}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{page}</BreadcrumbPage>
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
