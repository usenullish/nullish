import { confirm, intro, isCancel, log, multiselect, note } from "@clack/prompts";
import {
  type DeletedOrganization,
  DeleteOrganizationService,
} from "@usenullish/nullish-admin/organizations";
import { formatDate, isArrayAtLeastOne } from "@usenullish/nullish-common";
import { withDbContext } from "../../db";
import { hasArgs } from "../../utils/args";
import { lime } from "../../utils/colors";
import { cancel, exit } from "../../utils/exit";
import { refreshAccountBalances } from "../../services/reports";
import { DbAdminContext } from "@usenullish/nullish-db";

// TODO: maybe use another locale? like OS or something
const LOCALE = "de-CH";

export const organizationDelete = async (args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  const dryRun = hasArgs({ args, options: ["--dry-run"] });

  await withDbContext(async (dbContext) => {
    const organizations = await listDeletedOrganizations({ dbContext });

    if (!isArrayAtLeastOne(organizations)) {
      log.info("No organization is marked as deleted. No changes needed.");
      return;
    }

    const organizationIds = await multiselect({
      message: "Which organizations would you like to delete?",
      options: organizations.map(({ id, name, deletedAt }) => ({
        label: `${name} (on ${formatDate({ locale: LOCALE, date: deletedAt })})`,
        value: id,
      })),
      required: true,
    });

    if (isCancel(organizationIds)) {
      cancel();
    }

    const organizationsToDelete = organizations.filter(({ id }) => organizationIds.includes(id));

    if (dryRun) {
      note(
        organizationsToDelete.map(({ name }) => name).join("\n"),
        `${organizationsToDelete.length} organization(s) would have been deleted.`,
      );
      return;
    }

    const confirmed = await confirm({
      message: "Deleting an organization cannot be undone. Are you sure you want to continue?",
    });

    if (isCancel(confirmed) || !confirmed) {
      cancel();
    }

    for (const { id } of organizationsToDelete) {
      await deleteOrganization({ dbContext, organizationId: id });
    }

    await refreshAccountBalances({ dbContext });

    note(
      organizationsToDelete.map(({ name }) => name).join("\n"),
      `${organizationsToDelete.length} organization(s) deleted.`,
    );
  });
};

const listDeletedOrganizations = async ({
  dbContext,
}: {
  dbContext: DbAdminContext;
}): Promise<DeletedOrganization[]> => {
  const result = await DeleteOrganizationService.create({
    db: dbContext.connection,
  }).list();

  if (result.status === "error") {
    exit({
      msg: "Cannot list the organizations marked as deleted.",
      err: result.err,
    });
  }

  return result.result;
};

const deleteOrganization = async ({
  dbContext,
  organizationId,
}: {
  dbContext: DbAdminContext;
  organizationId: DeletedOrganization["id"];
}): Promise<void> => {
  const result = await DeleteOrganizationService.create({
    db: dbContext.connection,
  }).delete({ organizationId });

  if (result.status === "error") {
    exit({
      msg: `Cannot delete the organization ${organizationId}.`,
      err: result.err,
    });
  }
};
