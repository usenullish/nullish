import { useSyncExternalStore } from "react";
import { isNullish, type Nullable, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useI18n } from "~/kit/i18n/i18n.context";
import type { I18n } from "~/kit/i18n/i18n";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

const greeting = ({
  hours,
  name,
  i18n,
}: {
  hours: number;
  name: Nullable<string>;
  i18n: I18n;
}): string => {
  const { greeting } = i18n;

  const [withName, anonymous] =
    hours >= 5 && hours < 12
      ? [greeting.morning, greeting.morning_anonymous]
      : hours >= 12 && hours < 18
        ? [greeting.afternoon, greeting.afternoon_anonymous]
        : hours >= 18 && hours < 22
          ? [greeting.evening, greeting.evening_anonymous]
          : [greeting.late, greeting.late_anonymous];

  return isNullish(name) ? anonymous : replacePlaceholders(withName, { "{name}": name });
};

const subscribe = () => () => {};

export const useGreeting = ({
  name,
}: {
  name: Option<Api["Auth"]["Users"]["name"]>;
}): Nullable<string> => {
  const { i18n } = useI18n();

  const hours = useSyncExternalStore<Nullable<number>>(
    subscribe,
    () => new Date().getHours(),
    () => null,
  );

  if (isNullish(hours)) {
    return null;
  }

  const firstName = name?.trim().split(/\s+/)[0];

  return greeting({ hours, name: firstName === "" ? null : (firstName ?? null), i18n });
};
