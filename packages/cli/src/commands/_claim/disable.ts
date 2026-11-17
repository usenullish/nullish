import { intro, isCancel, log, note, select } from "@clack/prompts";
import { ClaimsService } from "@usenullish/nullish-admin/subscription";
import { isArrayAtLeastOne, isNullish } from "@usenullish/nullish-common";
import { withDbContext } from "../../db";
import { lime } from "../../utils/colors";
import { cancel, exit } from "../../utils/exit";
import { claimLabel, listClaims } from "./_claims";

export const claimDisable = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const claims = await listClaims({ dbContext });

    if (!isArrayAtLeastOne(claims)) {
      log.info("There is no claim.");
      return;
    }

    const claimId = await select({
      message: "Which claim should no longer be given?",
      options: claims.map((claim) => ({ label: claimLabel(claim), value: claim.id })),
    });

    if (isCancel(claimId)) {
      cancel();
    }

    const result = await ClaimsService.create({ db: dbContext.connection }).update({
      claimId,
      claim: { expiresAt: new Date() },
    });

    if (result.status === "error") {
      exit({
        msg: `Cannot disable the claim ${claimId}.`,
        err: result.err,
      });
    }

    if (isNullish(result.result)) {
      exit({ msg: `The claim ${claimId} was not found.` });
    }

    note(claimLabel(result.result), "Claim disabled.");
  });
};
