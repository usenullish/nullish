import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/components/dropdown-menu";
import { DeleteApiKey } from "~/components/user/api-keys/delete/delete-api-key";
import { useI18n } from "~/kit/i18n/i18n.context";

export const ApiKeyActions = ({ apiKey }: { apiKey: Api["UserApiKeys"]["Client"]["ApiKey"] }) => {
  const { i18n } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={i18n.core.action.more_actions} />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
            {i18n.api_keys.action.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteApiKey apiKey={apiKey} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
};
