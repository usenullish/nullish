import { useState } from "react";
import { cn } from "cn";
import { Upload } from "lucide-react";
import { isNullish, type Nullable } from "@usenullish/nullish-common";
import { useI18n } from "~/kit/i18n/i18n.context";

export const FileInput = ({
  id,
  name,
  accept,
  required,
}: {
  id: string;
  name: string;
  accept: string;
  required: boolean;
}) => {
  const { i18n } = useI18n();
  const [fileName, setFileName] = useState<Nullable<string>>(null);

  return (
    <label
      htmlFor={id}
      className="flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 border border-input bg-transparent px-2.5 text-xs transition-colors has-[:focus-visible]:border-ring has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring/50 dark:bg-input/30"
    >
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={($event) => setFileName($event.target.files?.[0]?.name ?? null)}
      />
      <Upload className="size-3.5 shrink-0 text-muted-foreground" />
      <span className={cn("truncate", isNullish(fileName) && "text-muted-foreground")}>
        {fileName ?? i18n.core.action.choose_file}
      </span>
    </label>
  );
};
