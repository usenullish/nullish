import type { Result } from "@usenullish/nullish-common";
import type { UseActionStateFn } from "~/context/form/form";

export const buildUseDeleteRecordAction = ({
  delete: deleteRecord,
}: {
  delete: () => Promise<Result<void>>;
}): UseActionStateFn => {
  const useDeleteRecordAction: UseActionStateFn = async () => {
    const result = await deleteRecord();

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useDeleteRecordAction;
};
