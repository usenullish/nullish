import { CopyIcon } from "~/components/core/copy-icon";
import { entryTag, type EntryTagSource } from "~/components/journal/_entry-tag";
import { Button } from "~/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/components/tooltip";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useCopy } from "~/kit/utils/copy.hook";

export const CopyEntryTagButton = ({
  source,
  className,
}: {
  source: EntryTagSource;
  className?: string;
}) => {
  const { i18n } = useI18n();
  const { copy, copied } = useCopy();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className={className}
            aria-label={i18n.journal.action.copy_tag}
            onClick={() => copy(entryTag(source))}
          />
        }
      >
        <CopyIcon copied={copied} />
      </TooltipTrigger>
      <TooltipContent>{i18n.journal.action.copy_tag}</TooltipContent>
    </Tooltip>
  );
};
