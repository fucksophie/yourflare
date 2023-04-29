import { HandlerContext } from "$fresh/server.ts";
import { User } from "../../src/database.ts";
import { Password, Username, verifyPassword, checkLoginStatus } from "../../src/lib.ts";
import SessionHandler, { Session } from "../../src/sessions.ts";
import * as Cookies from "cookies";
import { jsonResponse, validationError } from "../../src/validation.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
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

  const user = User.findUsername(username);

  if (!user) {
    return jsonResponse({ error: "User does not exist" }, 400);
  }

  if((await checkLoginStatus(_req))[0]) {
    return jsonResponse({error: "You are already authenicated!"}, 400);
  }


  if (verifyPassword(user.password, password)) {
    const tempSession = await SessionHandler.createSession(user);

    const session = {
      hashedID: tempSession.hashed,
      duration: 3.6e+6,
      createdBy: user.id,
      created: Date.now(),
    } as Session;

    user.sessions.push(session);

    const rp = new Response(JSON.stringify({ token: tempSession.plain }));
    const cookie: Cookies.Cookie = {
      name: "session",
      value: tempSession.plain,
      httpOnly: true,
      sameSite: "None",
      secure: true,
      path: "/",
      expires: new Date(Date.now() + session.duration)
    };
    Cookies.setCookie(rp.headers, cookie);
    rp.headers.set("content-type", "application/json")
    user.commit();

    return rp;
  } else {
    return jsonResponse({ error: "Invalid password" }, 400);
  }
};
