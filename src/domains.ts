import {z} from 'zod'
import { validationError } from './validation.ts';

const asciiOnly = /^[a-zA-Z.0-9_*-]+$/;
// const simpleDomainRegex = /^[a-zA-Z0-9_][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/gm
const domainWithSubdomainRegex = /^[[a-zA-Z0-9_.-]{1,61}\.(.+)$/gm

export const Name = z.string().max(255).min(1).regex(asciiOnly);
export const Host = z.string().regex(domainWithSubdomainRegex);
const Target = Host;
export const Ipv4 = z.string().ip({version: "v4"});
export const Ipv6 = z.string().regex(/(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gm)
export const Txt = z.string().max(65535).min(1);
export const Tag = z.string().regex(/^(issue|issuewild|iodef|contactemail|contactphone)$/gm);
export const Flags = z.coerce.number().max(256).min(0);
export const Preference = z.coerce.number().max(65535).min(1);
const Weight = Preference;
const Priority = Preference;
const Port = Preference;
const Value = Txt;
const Arpa = Host;

export const namedTypes: Record<string, Record<string, z.ZodNumber|z.ZodString|z.ZodEffects<z.ZodString, string, string>>> = {
  a: {Name, Ipv4},
  aaaa: {Name, Ipv6},
  cname: {Name, Host},
  ns: {Host},
  txt: {Name, Txt},
  mx: {Preference, Host},
  srv: {Name, Target, Priority, Weight, Port},
  caa: {Name, Flags, Tag, Value},
  spf: {Name, Txt},
  ptr: {Arpa, Host}
}

export const supportedRecords = Object.keys(namedTypes);
const recordRegex = new RegExp("^("+supportedRecords.join("|")+")$")

export const TTL = z.number().max(86400).min(1);
export const RecordType = z.string().regex(recordRegex, "Is not a part of the supported records: " + supportedRecords.join(", "));
export const DomainID = z.string().uuid();
export const Zone = z.string().toLowerCase().max(63+4).min(4);

export const recordDefinitions: Record<string, string[]> = {};

Object.entries(namedTypes).map(z => {
  recordDefinitions[z[0]] = Object.keys(z[1]);
})

export class DNSRecord {
  type: string;
  fields: string[] = [];
  
  constructor(type: string) {
    this.type = type;
  }
  
  setFields(fields: string[]) {
    this.fields = fields;
  }

  validation(): Response {
    let response = new Response();
    
    let i = 0;
    for(const v of Object.entries(this.getFieldTypes())) {
      const validate = v[1].safeParse(this.fields[i]);
      if(!validate.success) {
        response = validationError(validate.error, v[0]);
        break;
      }
      i++;
    }

    return response
  }

  getFieldTypes(): Record<string, (z.ZodString|z.ZodNumber|z.ZodEffects<z.ZodString, string, string>)> {
    return namedTypes[this.type];
  }
}
