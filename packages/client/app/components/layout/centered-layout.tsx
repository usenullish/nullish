import { LogoText } from "~/components/core/logo";

export const CenteredLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <LogoText className="h-7 w-auto" />
      {children}
    </div>
  );
};
