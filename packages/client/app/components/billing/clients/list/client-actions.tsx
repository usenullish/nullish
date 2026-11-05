import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteClient } from "~/components/billing/clients/delete/delete-client";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const ClientActions = ({
  client,
  clientPath,
}: {
  client: Api["Clients"]["Client"]["GetClientsResponse"]["clients"][number];
  clientPath: string;
}) => {
  const { i18n } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={client}
      items={
        <>
          <DropdownMenuItem render={<Link to={clientPath} />}>
            {i18n.core.action.open}
          </DropdownMenuItem>
          <WriteGuard>
            <DropdownMenuItem render={<Link to={`${clientPath}/edit`} />}>
              {i18n.core.action.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </DropdownMenuItem>
          </WriteGuard>
        </>
      }
    >
      <DeleteClient client={client} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
