import { HandlerContext } from "$fresh/server.ts";
import { User } from "../../src/database.ts";
import { checkLoginStatus } from "../../src/lib.ts";
import { jsonResponse } from "../../src/validation.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
    const loginStatus = await checkLoginStatus(_req);
    if(!loginStatus[0]) return jsonResponse({error:loginStatus[2]}, 400);
    const user = loginStatus[1]!;
    if(user.admin) {
      const url = new URL(_req.url);
      const id = url.searchParams.get("id");
      const all = url.searchParams.get("all");
      if(all == "true") {
        const users: User[] = [];
        User.getAllUsers().forEach(z => {
          users.push(User.findId(z.id)!);
        })

        return jsonResponse(users)
      }

      if(id) {
        const raw = User.findRawId(id);
        if(raw.length == 0) return jsonResponse({error: "User does not exist"});
        const notraw = User.findId(id);

        return jsonResponse(notraw)
      }
    }
    return jsonResponse({
      id: user.id,
      email: {
        email: user.email.email,
        status: user.email.status
      },
      domains: user.domains
    })
};
