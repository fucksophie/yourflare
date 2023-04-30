import { HandlerContext } from "$fresh/server.ts";
import { checkLoginStatus } from "../../src/lib.ts";
import { Zone } from "../../src/domains.ts"
import { isValidTLD } from "../../src/lib.ts"

import { Domain, User } from "../../src/database.ts";
import { jsonResponse, validationError } from "../../src/validation.ts";
import { settings } from "../../config/settings.ts";
import coredns from "../../src/coredns.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
  const loginStatus = await checkLoginStatus(_req);
  if(!loginStatus[0]) return jsonResponse({error:loginStatus[2]}, 400);
  const user = loginStatus[1]!;

  const url = new URL(_req.url);
  let zone = url.searchParams.get("zone")!;

  if(zone && !user.admin) {
    const parts = zone.split(".").filter(Boolean);
    if(parts.length < 2) return jsonResponse({error: "Invalid zone"}, 400);
    zone = parts.at(-2)+"."+parts.at(-1);
  }

  const parsedzone = Zone.safeParse(zone);

  if (!parsedzone.success && !user.admin) {
    return validationError(parsedzone.error, "zone");
  }

  if(!isValidTLD(zone) && !user.admin) {
    return jsonResponse({error: "Invalid TLD"}, 404)
  }
  
  if(Domain.findRawZone(zone).length !== 0) {
    const domain = Domain.findZone(zone)!;
    if(domain.status == "linking") {
      return jsonResponse({error: "This zone is being linked!"}, 400)  
    } else {
      return jsonResponse({error: "Domain registered already!"}, 400)
    }
  }

  let rawNameservers: string[] = [];

  const domain = new Domain(zone);
  domain.commit();
  user.domains.push(domain.id);
  user.commit();

  coredns.createDomain(domain);

  if(!user.admin) {
    const original = setInterval(async () => {
      try {
        rawNameservers = await Deno.resolveDns(zone, "NS", {
          nameServer: {
            ipAddr: settings.nameservers[0].ip
          }
        });
      } catch {
        // ok
      }
    
      const nameservers = rawNameservers.map(z => {
        if(z.endsWith(".")) return z.slice(0, -1);
        return z;
      })
      
      if((nameservers[0] == settings.nameservers[0].name
        && nameservers[1] == settings.nameservers[1].name)) {
        domain.status = "linked";
        domain.commit();
        await coredns.updateDomain(domain);
        clearInterval(deleteInterval);
        clearInterval(original)
      }      
    }, 2000)

    const deleteInterval = setTimeout(async ()=>{
      clearInterval(original);
      await coredns.deleteDomain(domain);
      domain.delete();
      if(User.findRawId(user.id).length != 0) { // Check if user's real
        const newUser = User.findId(user.id)!; // An long time has passed. Most likely this user's information has been changed.
        newUser.domains = newUser.domains.filter(z => z != domain.id);
        newUser.commit();
      }
    }, 20_000)

    return jsonResponse({status: "Attempting to link your domain!", id: domain.id});  
  } else {
    domain.status = "linked";
    domain.commit();
    return jsonResponse({status: "Your admin powers have activated! Your zone has been linked.", id: domain.id});  
  }
};
