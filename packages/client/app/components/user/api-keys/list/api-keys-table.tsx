import type { Api } from "@usenullish/nullish-schema/server";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import { Badge } from "~/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { ApiKeyActions } from "~/components/user/api-keys/list/api-key-actions";
import { useFormatDate, useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

type ApiKey = Api["UserApiKeys"]["Client"]["ApiKey"];

export const ApiKeysTable = ({ apiKeys }: { apiKeys: ApiKey[] }) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();

  const resourceOf = ({ permissions }: ApiKey): Option<ApiKeyResource> =>
    Object.values(ApiKeyResource).find((resource) => nonNullish(permissions?.[resource]));

  const resourceLabel = (apiKey: ApiKey): string => {
    const resource = resourceOf(apiKey);

    return isNullish(resource) ? "—" : i18n.api_keys.resource[resource];
  };

  const accessLabel = (apiKey: ApiKey): string => {
    const resource = resourceOf(apiKey);

    return isNullish(resource)
      ? "—"
      : (apiKey.permissions?.[resource] ?? []).includes(ApiKeyAction.WRITE)
        ? i18n.api_keys.label.read_write
        : i18n.api_keys.label.read;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{i18n.core.label.name}</TableHead>
          <TableHead>{i18n.api_keys.label.key}</TableHead>
          <TableHead>{i18n.api_keys.label.resource}</TableHead>
          <TableHead>{i18n.api_keys.label.access}</TableHead>
          <TableHead>{i18n.api_keys.label.expires_on}</TableHead>
          <TableHead>{i18n.api_keys.label.last_used}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {apiKeys.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground">
              {i18n.api_keys.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell className="whitespace-normal">{apiKey.name}</TableCell>
              <TableCell className="font-mono">{apiKey.start}…</TableCell>
              <TableCell>{resourceLabel(apiKey)}</TableCell>
              <TableCell>
                <Badge variant="outline">{accessLabel(apiKey)}</Badge>
              </TableCell>
              <TableCell>
                {isNullish(apiKey.expiresAt) ? "—" : formatDate(apiKey.expiresAt)}
              </TableCell>
              <TableCell>
                {isNullish(apiKey.lastRequest)
                  ? i18n.api_keys.label.never
                  : formatDateTime(apiKey.lastRequest)}
              </TableCell>
              <TableCell className="w-px">
                <ApiKeyActions apiKey={apiKey} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
