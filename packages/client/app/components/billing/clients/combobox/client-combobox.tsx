import type { Api } from "@usenullish/nullish-schema/server";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/ui/components/combobox";
import { useClients } from "~/context/contexts/clients.context";
import { useI18n } from "~/kit/i18n/i18n.context";

type Client = Api["Clients"]["Client"]["GetClientsResponse"]["data"][number];

export const ClientCombobox = ({
  id,
  name,
  defaultClientId,
}: {
  id: string;
  name: string;
  defaultClientId?: Client["id"];
}) => {
  const { i18n } = useI18n();
  const clients = useClients();

  const items = (clients ?? []).toSorted((a, b) => a.name.localeCompare(b.name, i18n.lang));

  return (
    <Combobox
      items={items}
      name={name}
      defaultValue={items.find(({ id }) => id === defaultClientId) ?? null}
      itemToStringLabel={({ name }: Client) => name}
      itemToStringValue={({ id }: Client) => id}
      isItemEqualToValue={(item: Client, value: Client) => item.id === value.id}
      locale={i18n.lang}
    >
      <ComboboxInput id={id} placeholder={i18n.invoices.label.select_client} required />

      <ComboboxContent>
        <ComboboxEmpty>{i18n.clients.text.no_results}</ComboboxEmpty>
        <ComboboxList>
          {(client: Client) => (
            <ComboboxItem key={client.id} value={client}>
              {client.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
