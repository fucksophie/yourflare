import { HandlerContext } from "$fresh/server.ts";
import { checkLoginStatus } from "../../src/lib.ts";
import { Domain } from "../../src/database.ts";
import coredns from "../../src/coredns.ts";
import { DomainID, TTL } from "../../src/domains.ts";
import { jsonResponse, validationError } from "../../src/validation.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
  const url = new URL(_req.url);

  const id = url.searchParams.get("id")!;
  const ttl = +url.searchParams.get("ttl")!;

  const parsedid = DomainID.safeParse(id);
  const parsedttl = TTL.safeParse(ttl);
  
  if (!parsedid.success) {
    return validationError(parsedid.error, "id");
  }
  
  if(!parsedttl.success) {
    return validationError(parsedttl.error, "ttl");
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
  
  const domain = Domain.findId(id)!;
  domain.ttl = ttl;
  domain.commit()
  coredns.updateDomain(domain);
  return jsonResponse({success: true});
};
