import { HandlerContext } from "$fresh/server.ts";
import { User } from "../../src/database.ts";
import { Password, Username, hashPassword } from "../../src/lib.ts";
import { jsonResponse, validationError } from "../../src/validation.ts";

export const handler = (
  _req: Request,
  _ctx: HandlerContext,
) => {
  const url = new URL(_req.url);
  const password = url.searchParams.get("password")!;
  const username = url.searchParams.get("username")!;

  const parsedusername = Username.safeParse(username);
  const parsedpassword = Password.safeParse(password);

  if (!parsedpassword.success) {
    return validationError(parsedpassword.error, "password");
  }

  if (!parsedusername.success) {
    return validationError(parsedusername.error, "username");
  }

  if (User.findUsername(username)) {
    return jsonResponse({ error: "User already exists" }, 400);
  }

  const dbUser = new User(username, hashPassword(password));
  dbUser.commit();

  return jsonResponse({ success: true });
};
