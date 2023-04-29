import { readLines } from "https://deno.land/std@0.129.0/io/buffer.ts";
import { Domain } from "./database.ts";
import { tgz } from "https://deno.land/x/compress@v0.4.4/mod.ts";

import zonefile from 'https://deno.land/x/zonefile@0.3.0/lib/zonefile.js';
import { exists } from "./lib.ts";
import { settings } from "../config/settings.ts";
import { DNSRecord } from "./domains.ts";

if(!await exists("coredns/")) {
  console.log("[DNS] Most likely first boot!")
  Deno.mkdirSync("coredns");
}

if(!await exists("coredns/coredns")) {
  if(!await exists("coredns/coredns.tgz")) {
    console.log("[DNS] Downloading coredns.tgz!")
    const request = await fetch("https://github.com/coredns/coredns/releases/download/v1.10.1/coredns_1.10.1_linux_amd64.tgz");
    Deno.writeFileSync("coredns/coredns.tgz", new Uint8Array(await request.arrayBuffer()))
  }
  console.log("[DNS] Decompressing tgz!")
  await tgz.uncompress("coredns/coredns.tgz", "coredns/");
  Deno.removeSync("coredns/coredns.tgz")
  Deno.chmodSync("coredns/coredns", 0o777);
}

if(!await exists("coredns/zones/")) {
  console.log("[DNS] Creating zones folder")
  Deno.mkdirSync("coredns/zones")
}

Deno.writeTextFileSync("coredns/Corefile", `.:53 {
  forward . 8.8.8.8

  reload 10s

  auto {
    directory ${Deno.cwd()}/coredns/zones
    reload 10s
  }

  log
  errors
  cache
}`);

class CorednsManager {
  process: Deno.Process;

  async reader(
    reader: Deno.Reader,
  ) {
    for await (const line of readLines(reader)) {
      if(settings.debug) {
        console.log("[DNS-RAW] " + line);
      }

      if(line.startsWith("CoreDNS")) {
        console.log("[DNS] Started CoreDNS!");
      }

      if(line.startsWith("Listen: listen tcp :53: bind:")) {
        console.log("[DNS] coredns could not start, missing setcap! Use \"setcap 'cap_net_bind_service=+ep' coredns/coredns\"")
        Deno.exit(-2);
      }
    }
  }

  constructor() {
    this.process = Deno.run({
      cmd: ["./coredns"],
      cwd: "coredns/",
      stdout: "piped",
      stderr: "piped"
    });

    this.reader(this.process.stdout!)
    this.reader(this.process.stderr!)
  }

  generateZonefile(domain: Domain) {  
    const root1 = settings.nameservers[0].name.split(".").slice(-2).join('.')
    const root2 = settings.nameservers[1].name.split(".").slice(-2).join('.')
    
    const subdomain1 = settings.nameservers[0].name.split(".").slice(0, -2).join('.')
    const subdomain2 = settings.nameservers[1].name.split(".").slice(0, -2).join('.')

    if(root1 == domain.zone && root2 == domain.zone) {
      const record1 = new DNSRecord("a");
      const record2 = new DNSRecord("a");
      record1.setFields([subdomain1, settings.nameservers[0].ip]);
      record2.setFields([subdomain2, settings.nameservers[1].ip]);

      if(!domain.records.a) domain.records.a = [];

      domain.records.a.push(record1);
      domain.records.a.push(record2);
    }

    Deno.writeTextFileSync("coredns/zones/db."+domain.zone, zonefile.generate({
      "$origin": domain.zone+".",
      "$ttl": domain.ttl,
      "soa": {
        "mname": settings.nameservers[0].name+".",
        "rname": "friend.yourfriend.lv.",
        "serial": domain.serial+"",
        refresh: 3600,
        retry: 600,
        expire: 604800,
        minimum: "86400"
      },
      ns: [
        { host: settings.nameservers[0].name+"." }, 
        { host: settings.nameservers[1].name+"." },
        ...(domain.records.ns?.map(z => { return { host: z.fields[0] } })||[])
      ],
      txt: domain.records.txt?.map(z => { return { name: z.fields[0], txt: z.fields[1] } }),
      cname: domain.records.cname?.map(z => { return { name: z.fields[0], alias: z.fields[1] } }),
      aaaa: domain.records.aaaa?.map(z => { return { name: z.fields[0], ip: z.fields[1] } }),
      a: domain.records.a?.map(z => { return { name: z.fields[0], ip: z.fields[1] } }),
      mx: domain.records.mx?.map(z => { return { preference: +z.fields[0], host: z.fields[1] } }),
      srv: domain.records.srv?.map(z => { return { name: z.fields[0], target: z.fields[1], priority: +z.fields[2], weight: +z.fields[3], port: +z.fields[4] } })
    }));
  }
}

if(await exists("coredns")) {
  if(await exists("coredns/zones")) {
    for (const i of Deno.readDirSync("coredns/zones")) {
      Deno.removeSync("coredns/zones/"+i.name)  
    }
  }
}

const manager = new CorednsManager();

export function updateZonefile(domain: Domain) {
  domain.serial++;
  domain.commit();
  manager.generateZonefile(domain);
}

export function deleteZonefile(domain: Domain) {
  Deno.removeSync("coredns/zones/db."+domain.zone);  
}

Domain.getAllIds().forEach(y => {
  manager.generateZonefile(Domain.findId(y)!);
})
