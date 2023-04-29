import { HandlerContext } from "$fresh/server.ts";
import { checkLoginStatus } from "../../src/lib.ts";
import { Domain } from "../../src/database.ts";
import { DomainID } from "../../src/domains.ts";
import { jsonResponse, validationError } from "../../src/validation.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
  const url = new URL(_req.url);

  const id = url.searchParams.get("id")!;
  const parsedid = DomainID.safeParse(id);

  if (!parsedid.success) {
    return validationError(parsedid.error, "id");
  }
  if(Domain.findRawId(id).length == 0) {
    return jsonResponse({error: "Domain does not exist"}, 400);
  }
  
  const loginStatus = await checkLoginStatus(_req);
  if(!loginStatus[0]) return jsonResponse({error:loginStatus[2]}, 400);
  const user = loginStatus[1]!;  
  
  if(!user.domains.includes(id) && !user.admin) {
    return jsonResponse({error: "You do not have permission to access this domain"}, 400);
  }

  return jsonResponse(Domain.findId(id));  
};
