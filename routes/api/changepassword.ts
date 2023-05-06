import { HandlerContext } from "$fresh/server.ts";
import { Password, checkLoginStatus, hashPassword } from "../../src/lib.ts";
import { jsonResponse, validationError } from "../../src/validation.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
  const loginStatus = await checkLoginStatus(_req);
  if(!loginStatus[0]) return jsonResponse({error:loginStatus[2]}, 400);
  const user = loginStatus[1]!;  

  const url = new URL(_req.url);

  const password = url.searchParams.get("password")!;
  const parsedpassword = Password.safeParse(password);

  if (!parsedpassword.success) {
    return validationError(parsedpassword.error, "password");
  }

  user.password = hashPassword(password);
  user.sessions = [];
  user.commit();
  return jsonResponse({success: true});  
};
