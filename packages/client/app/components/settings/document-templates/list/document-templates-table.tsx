import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { SortableHeader } from "~/components/core/sortable-header";
import { useI18n } from "~/kit/i18n/i18n.context";
import { DocumentTemplateActions } from "~/components/settings/document-templates/list/document-template-actions";

export const DocumentTemplatesTable = ({
  templates,
}: {
  templates: Api["DocumentTemplates"]["Client"]["DocumentTemplate"][];
}) => {
  const { i18n } = useI18n();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="type" label={i18n.core.label.type} />
          <SortableHeader field="name" label={i18n.core.label.name} />
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {templates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-muted-foreground">
              {i18n.document_templates.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>{i18n.document_templates.type[template.type]}</TableCell>
              <TableCell className="whitespace-normal">{template.name}</TableCell>
              <TableCell className="w-px">
                <DocumentTemplateActions template={template} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
