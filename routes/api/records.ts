import { HandlerContext } from "$fresh/server.ts";
import { checkLoginStatus, } from "../../src/lib.ts";
import { Domain } from "../../src/database.ts";
import { DNSRecord, DomainID, RecordType, allowedRecords } from "../../src/domains.ts";
import { jsonResponse, validationError } from "../../src/validation.ts";
import coredns from "../../src/coredns.ts";

// deno-lint-ignore no-explicit-any
function shallowEqual(a: any[], b: any[]) {
  return a.every(item => b.includes(item)) && b.every(item => a.includes(item))
}

export const handler = async (
  _req: Request,
  _ctx: HandlerContext,
): Promise<Response> => {
  if(_req.method !== "POST") return jsonResponse({error: "Invalid request method"});

  const body = await _req.json()

  const parsedid = DomainID.safeParse(body.id);

  if (!parsedid.success) {
    return validationError(parsedid.error, "id");
  }
  
  if(Domain.findRawId(body.id).length == 0) {
    return jsonResponse({error: "Domain does not exist"}, 400);
  }

  const loginStatus = await checkLoginStatus(_req);
  if(!loginStatus[0]) return jsonResponse({error:loginStatus[2]}, 400);
  const user = loginStatus[1]!;  
  
  if(!user.domains.includes(body.id) && !user.admin) {
    return jsonResponse({error: "You do not have permission to access this domain"}, 400);
  }
  
  const domain = Domain.findId(body.id)!;
  const records = (body.records as Record<string, {type: string, name: string, fields: string[]}[]>);
  let response: Response|undefined;
  
  const recordsProper: Record<string, DNSRecord[]> = {};
  
  for(const b of Object.entries(records)) {
    for(const y of b[1]) {
      const parsetype = RecordType.safeParse(y.type);
      if(!parsetype.success) {
        response = validationError(parsetype.error, "recordType");
        continue;
      }
  
      if((recordsProper[y.type]||[]).find(z => shallowEqual(z.fields, y.fields))) {
        response = jsonResponse({error: "Request contained a duplicate record."}, 400);
        continue;
      }
      const record = new DNSRecord(y.type as allowedRecords);
      record.setFields(y.fields);
      const rsp = record.validation();
      if(!rsp.ok) {
        response = rsp;
        continue;
      }
  
      if(!recordsProper[y.type]) recordsProper[y.type] = []
      
      recordsProper[y.type].push(record);
    }
  }
  
  domain.records = recordsProper;
  domain.commit();
  await coredns.updateDomain(domain);
  if(response) return response;
  return jsonResponse({success: true});
  
};
