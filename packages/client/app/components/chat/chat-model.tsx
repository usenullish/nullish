import { CheckIcon, ChevronDown } from "lucide-react";
import { Button } from "~/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/components/dropdown-menu";
import { Link, useLocation } from "react-router";
import { useI18n } from "~/kit/i18n/i18n.context";
import * as React from "react";
import { useAssistant } from "~/context/contexts/assistant.context";

export const ChatModel = () => {
  const { i18n } = useI18n();
  const location = useLocation();

  const assistant = useAssistant();

  if (!assistant.enabled) {
    return null;
  }

  const [{ model }] = assistant.models;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
        {model}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" align="start">
        <DropdownMenuItem>
          <span className="flex-1 truncate">{model}</span>
          <CheckIcon />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link to="/user/api-keys" state={{ from: location }} />}>
          {i18n.chat.action.use_own_llm}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
