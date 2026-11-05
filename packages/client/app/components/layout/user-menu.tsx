import {
  ChevronsUpDown,
  Eye,
  EyeOff,
  KeyRound,
  Languages as LanguagesIcon,
  LogOut,
  UserRound,
} from "lucide-react";
import { Link } from "react-router";
import { useUser } from "~/context/hooks/auth.hooks";
import { useSignOut } from "~/kit/auth/sign-out.hook";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/ui/components/sidebar";
import { useI18n } from "~/kit/i18n/i18n.context";
import { usePrivacy } from "~/kit/privacy/privacy.context";
import { type Languages, LanguagesSchema } from "~/kit/i18n/lang";

const LANGUAGE_NAMES: Record<Languages, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
};

export const UserMenu = () => {
  const user = useUser();
  const signOut = useSignOut();
  const { isMobile } = useSidebar();
  const { i18n, switchLang } = useI18n();
  const { privacy, toggle: togglePrivacy } = usePrivacy();

  const onLanguageChange = async (value: unknown) => {
    const { success, data } = LanguagesSchema.safeParse(value);

    if (success) {
      await switchLang(data);
    }
  };

  const name = user?.name ?? "";
  const email = user?.email ?? "";

  const identity = (
    <>
      <Avatar className="size-8">
        <AvatarImage src={user?.image ?? undefined} alt={name} />
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{email}</span>
      </div>
    </>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            {identity}
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56"
            align="end"
            side={isMobile ? "bottom" : "right"}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 text-foreground">
                {identity}
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LanguagesIcon />
                {i18n.core.label.language}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={i18n.lang} onValueChange={onLanguageChange}>
                  {LanguagesSchema.options.map((lang) => (
                    <DropdownMenuRadioItem key={lang} value={lang} lang={lang}>
                      {LANGUAGE_NAMES[lang]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem onClick={togglePrivacy}>
              {privacy.enabled ? <Eye /> : <EyeOff />}
              {privacy.enabled ? i18n.core.action.show_amounts : i18n.core.action.hide_amounts}
            </DropdownMenuItem>

            <DropdownMenuItem render={<Link to="/user/settings/account" />}>
              <UserRound />
              {i18n.navigation.settings}
            </DropdownMenuItem>

            <DropdownMenuItem render={<Link to="/user/api-keys" />}>
              <KeyRound />
              {i18n.api_keys.text.title}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={signOut}>
              <LogOut />
              {i18n.auth.action.sign_out}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
