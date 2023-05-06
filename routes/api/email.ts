import { HandlerContext } from "$fresh/server.ts";
import { checkLoginStatus, hashPassword, redirect } from "../../src/lib.ts";
import { jsonResponse, validationError } from "../../src/validation.ts";
import z from "https://deno.land/x/zod@v3.21.4/index.ts";
import { sendEmail } from "../../src/email.ts";
import { User } from "../../src/database.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
  const url = new URL(_req.url);

  const action = url.searchParams.get("action")!;

  if(action !== "verify" && action !== "remove" && action !== "backlink" && action !== "requestrecovery" && action !== "recovery") {
    return jsonResponse({error:"Available actions: verify, remove, backlink, requestrecovery, recovery"}, 400)
  }

  const loginStatus = await checkLoginStatus(_req);
  const user = loginStatus[1]!;  

  if(action == "recovery") {
    if(user) {
      return jsonResponse({error: "Already logged in."}, 400)
    }

    const token = url.searchParams.get("token")!;
    if(!token) return jsonResponse({error: "Missing (from Token)"}, 400);

    if(!token.endsWith("-recovery")) {
      return jsonResponse({error:"Token is unparsable."}, 400);
    }
    
    const parsedtoken = z.string().uuid().safeParse(token.replace("-recovery", ""));
    
    if(!parsedtoken.success) {
      return validationError(parsedtoken.error, "token");
    } 

    const newUser = User.findWithVerificationToken(token);

    if(!newUser) {
      return jsonResponse({error:"Could not find matching user."}, 400);
    }

    const newPassword = crypto.randomUUID();

    newUser.email.verificationToken = "";
    newUser.password = hashPassword(newPassword);
    newUser.sessions = [];
    newUser.commit();

    return redirect("/notice?message="+encodeURIComponent("Your (username: "+newUser.username+") password has been changed to " + newPassword + "."))
  }

  if(action == "requestrecovery") {
    if(user) {
      return jsonResponse({error: "Already logged in."}, 400)
    }

    const email = url.searchParams.get("email")!;
    const parsedtoken = z.string().email().safeParse(email);

    if(!parsedtoken.success) {
      return validationError(parsedtoken.error, "email");
    } 

    const newUser = User.findWithEmail(email);

    if(!newUser) {
      return jsonResponse({error: "Email is not in our system."}, 400)
    }

    if(newUser.email.status == "unverified") {
      return jsonResponse({error:"User email is invalid."}, 400);
    }

    if(newUser.email.verificationToken.endsWith("-recovery")) {
      return jsonResponse({error:"Already in progress."}, 400);
    }

    newUser.email.verificationToken = crypto.randomUUID()+"-recovery";
    newUser.commit();
    const backlink = `${url.origin}/api/email?action=recovery&token=${newUser.email.verificationToken}`;
    await sendEmail(newUser.email.email, "yourflare Account Recovery", `You (username: ${newUser.username}) (or somebody) have requested a account recovery. If you DID indeed request a account recovery, go to <a href="${backlink}">this link to recover your yourflare account.</a>`)
    return jsonResponse({success: true});  
  }

  if(!loginStatus[0]) return jsonResponse({error:loginStatus[2]}, 400);

  if(action == "verify") {
    if(user.email.email) {
      if(user.email.status == "unverified") return jsonResponse({error:"Already verifying a email!"}, 400)
      if(user.email.status == "verified") return jsonResponse({error:"You already have a verified email!"}, 400)
    }
    
    const email = url.searchParams.get("email")!;
    const parsedemail = z.string().email().safeParse(email);
    
    if(!parsedemail.success) {
      return validationError(parsedemail.error, "email");
    } 

    if(User.findWithEmail(email)) {
      return jsonResponse({error:"This email is already being used."}, 400);
    }

    user.email = {
      verificationToken: crypto.randomUUID(),
      status: "unverified",
      email
    }
    user.commit();
    const backlink = `${url.origin}/api/email?action=backlink&token=${user.email.verificationToken}`;
    await sendEmail(email, "yourflare Password Verification", `The account ${user.username} is attempting to verify your email. If you didn't request this email connection, please don't click the link. <a href="${backlink}">Click here to verify your email!</a>`)
  }

  if(action == "backlink") {
    if(!user.email.email) {
      return jsonResponse({error:"You are not verifying a email."}, 400)
    }

    if(user.email.status == "verified") {
      return jsonResponse({error:"You already have a linked email."}, 400)
    }

    const token = url.searchParams.get("token")!;
    const parsedtoken = z.string().uuid().safeParse(token);

    if(!parsedtoken.success) {
      return validationError(parsedtoken.error, "token");
    } 

    if(token !== user.email.verificationToken) {
      user.email = {};
      user.commit();
      return jsonResponse({error:"Incorrect verification token. Try again."}, 400)
    }

    user.email.verificationToken = "";
    user.email.status = "verified";
    user.commit();

    return redirect("/dash");
  }

  if(action == "remove") {
    user.email = {};
    user.commit();
  }
  return jsonResponse({success: true});  
};
