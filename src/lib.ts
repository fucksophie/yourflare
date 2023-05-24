// I guess I'm just the fool, I don't know anything

import { hash, variant } from "argon";
import { z } from "zod";
import * as Cookies from "cookies";
import SessionHandler from "./sessions.ts";
import { Domain, User } from "./database.ts";
import { settings } from "../config/settings.ts";

export const exists = async (filename: string): Promise<boolean> => {
  try {
    await Deno.stat(filename);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw error;
    }
  }
}

let tlds: string[] = [];

if(!await exists('static/tlds.json')) {
  const request = await fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt");
  const text = await request.text();
  tlds = text.split("\n").filter(z => !z.startsWith("#")).map(z => z.toLowerCase()).filter(Boolean);
  Deno.writeTextFileSync("static/tlds.json", JSON.stringify(tlds))
} else {
  const text = Deno.readTextFileSync("static/tlds.json");
  tlds = JSON.parse(text);
}
Domain.getAllDomains().forEach(z => {
  if(z.zone.split(".").length==1) {
    tlds.push(z.zone);
    console.log("[DNS] Custom TLD was found to be registered:", z.zone)
  }
})
export function isValidTLD(zone: string) {
  return tlds.includes(zone.split(".").at(-1)!);
}

function bufferToHex(buffer: Uint8Array) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkLoginStatus(req: Request): Promise<[boolean, User|undefined, string]> {
  const cookies = Cookies.getCookies(req.headers);
  if (cookies.session) {
    const sessionHash = await SessionHandler.sessionHash(cookies.session);
    const data = User.findWithSession(sessionHash);

    if (data) {
      data[1].sessions = data[1].sessions.filter(z => !SessionHandler.checkExpiry(z));
      data[1].commit();
      if(!SessionHandler.checkExpiry(data[0])) {
        return [true, data[1], "Logged in"];
      } else {
        return [false, data[1], "Expired session"];
      }
    } else {
      return [false, undefined, "Could not find session"];
    }
  } {
    return [false, undefined, "Missing session cookie"];
  }
}

export function hashPassword(password: string): string {
  return bufferToHex(
    hash(
      new TextEncoder().encode(password),
      new TextEncoder().encode(settings.passwordHash),
      {
        variant: variant.argon2id,
      },
    ),
  );
}
export function verifyPassword(hashed: string, unhashed: string) {
  return hashed == hashPassword(unhashed);
}

export function redirect(path = "/"): Response {
  const rp = new Response("Redirecting!", {status: 307});
  rp.headers.append("Location", path);
  return rp;
}
export const Password = z.string().max(60).min(3);
export const Username = z.string().trim().toLowerCase().regex(/^[a-z0-9-]*$/gm)
  .max(20)
  .min(3);
