import { HandlerContext } from "$fresh/server.ts";
import { checkLoginStatus } from "../../src/lib.ts";
import { Domain, User } from "../../src/database.ts";
import { jsonResponse } from "../../src/validation.ts";
import coredns from "../../src/coredns.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
  const loginStatus = await checkLoginStatus(_req);
  if(!loginStatus[0]) return jsonResponse({error:loginStatus[2]}, 400);
  let user = loginStatus[1]!;  

  if(user.admin) {
    const url = new URL(_req.url);
    const id = url.searchParams.get("id");
    
    if(id) {
      const raw = User.findRawId(id);
      if(raw.length == 0) return jsonResponse({error: "User does not exist"});
      const notraw = User.findId(id)!;
      user = notraw;
    }
  }

  for await(const z of user.domains) {
    const domain = Domain.findId(z)!;
    if(domain.findAllUsers().length == 1) {
      await coredns.deleteDomain(domain);
      domain.delete();
    }
  }

  user.delete();
  return jsonResponse({success: true});  
};
