import { withDbContext } from "../../db";
import { listUsersWithOrgs } from "@usenullish/nullish-admin/users";
import { exit } from "../../utils/exit";

export const userList = async (_args?: string[]) => {
  await withDbContext(async (dbContext) => {
    const usersResult = await dbContext.exec(listUsersWithOrgs);

    if (usersResult.status === "error") {
      exit({
        msg: "Cannot list the users.",
        err: usersResult.err,
      });
    }

    console.table(usersResult.result);
  });
};
