import { tgz } from "https://deno.land/x/compress@v0.4.4/mod.ts";
import { deleteTLD, exists, registerTLD } from "./lib.ts";
import { readLines } from "https://deno.land/std@0.129.0/io/buffer.ts";
import { settings } from "../config/settings.ts";
import { Domain } from "./database.ts";
import { DNSRecord, namedTypes } from "./domains.ts";
import zonefile from "https://deno.land/x/zonefile@0.3.0/lib/zonefile.js";

class Coredns {
  process!: Deno.Process;
  
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
  
  async start() {
    if(await exists("coredns")) {
      if(await exists("coredns/zones")) {
        for (const i of Deno.readDirSync("coredns/zones")) {
          Deno.removeSync("coredns/zones/"+i.name)  
        }
      }
    }
    
    await this.createFolders();
    
    for await(const y of Domain.getAllIds()) {
      await this.createDomain(Domain.findId(y)!);
    }
    this.process = Deno.run({
      cmd: ["./coredns"],
      cwd: "coredns/",
      stdout: "piped",
      stderr: "piped"
    });

    this.reader(this.process.stdout!)
    this.reader(this.process.stderr!)
    
  }

  private async downloadCoredns() {
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
  }
  
  async updateDomain(domain: Domain) {
    domain.serial++;
    domain.commit();

    Deno.writeTextFileSync("coredns/zones/db."+domain.zone, await this.generateZonefile(domain))
  }

  async createDomain(domain: Domain) {
    if(domain.zone.split(".").length == 1) {
      registerTLD(domain.zone);
    }
    Deno.writeTextFileSync("coredns/zones/db."+domain.zone, await this.generateZonefile(domain))
    await this.generateCorefile();
  }

  async deleteDomain(domain: Domain) {
    await Deno.remove("coredns/zones/db."+domain.zone); 
    const dnssec = this.listCerts();
    if(dnssec[domain.zone]) {
      await Deno.remove(`coredns/dnssec/${dnssec[domain.zone]}.key`)
      await Deno.remove(`coredns/dnssec/${dnssec[domain.zone]}.private`)
    }
    
    if(domain.zone.split(".").length == 1) {
      deleteTLD(domain.zone);
    }
    await this.generateCorefile();
  }

  private async generateCorefile() {
    let corefile = "";
  
    let dnssec = this.listCerts();
    for await (const d of Domain.getAllDomains()) {
      if(!dnssec[d.zone]) {
        console.log("[DNS] Creating DNSsec for " + d.zone + "!")
        const process = Deno.run({
          cmd: ["dnssec-keygen", "-a", "ECDSAP256SHA256", d.zone],
          cwd: Deno.cwd()+"/coredns/dnssec",
          stderr: "null",
          stdin: "null",
          stdout: "null"
        })
        await process.status();
      }
    }
    dnssec = this.listCerts();

    Object.entries(dnssec).forEach(v => {
      corefile += `${v[0]} {
  dnssec {
    key file ${Deno.cwd()}/coredns/dnssec/${v[1]}
  }

  auto {
    directory ${Deno.cwd()}/coredns/zones
    reload 10s
  }
  reload 10s
}
    `
    })
  
    corefile +=`
version.bind version.server authors.bind {
  chaos yourflare-${Deno.readTextFileSync(".git/FETCH_HEAD").slice(0, 6)} friend@yourfriend.lv yourflare-contrib
}

.:53 {
  forward . 8.8.8.8

  reload 10s

  log
  errors
  cache
}`;
    Deno.writeTextFileSync("coredns/Corefile", corefile);

  }
  private listCerts() {
    const domainsToDNSSec:Record<string, string> = {};

    for(const z of Deno.readDirSync("coredns/dnssec")) {
      domainsToDNSSec[z.name.split(".+")[0].substring(1)] = z.name.split(".").slice(0, -1).join(".")
    }

    return domainsToDNSSec;
  }
  
  private async generateZonefile(domain: Domain) {  
    const root1 = settings.nameservers[0].name.split(".").slice(-2).join('.')
    const root2 = settings.nameservers[1].name.split(".").slice(-2).join('.')
    
    const subdomain1 = settings.nameservers[0].name.split(".").slice(0, -2).join('.')
    const subdomain2 = settings.nameservers[1].name.split(".").slice(0, -2).join('.')

    const records: Record<string, DNSRecord[]> = {...domain.records};
    
    if(root1 == domain.zone && root2 == domain.zone) {
      const record1 = new DNSRecord("a");
      const record2 = new DNSRecord("a");
      record1.setFields([subdomain1, settings.nameservers[0].ip]);
      record2.setFields([subdomain2, settings.nameservers[1].ip]);

      if(!records.a) records.a = [];

      records.a.push(record1);
      records.a.push(record2);
    }
    
    for(const z of Object.entries(records)) {
      records[z[0]] = z[1].map(z => {
        const fieldTypes = Object.keys(namedTypes[z.type]);
        z.fields = z.fields.map((y,i) => {
          if(fieldTypes[i] == "Host") return y+"."; 
          if(y == domain.zone) return "@";
          return y;
        })
        return z;
      })
      
      records[z[0]] = z[1].sort((a, b) => +a.fields[0].startsWith('@') - +b.fields[0].startsWith('@'))
      
      records[z[0]] = z[1].sort((a, b) => +a.fields[0].startsWith('*') - +b.fields[0].startsWith('*'))
    }

    // todo: write your own zonefile parser/writer
    // with a better interface than this
    return zonefile.generate({
      "$origin": domain.zone+".",
      "$ttl": domain.ttl,
      "soa": {
        "mname": settings.nameservers[0].name+".",
        "rname": "dns.141.lv.",
        "serial": domain.serial+"",
        refresh: domain.ttl,
        retry: 600,
        expire: 604800,
        minimum: "86400"
      },
      ns: [
        { host: settings.nameservers[0].name+"." }, 
        { host: settings.nameservers[1].name+"." },
        ...(records.ns?.map(z => { return { host: z.fields[0] } })||[])
      ],
      txt: records.txt?.map(z => { return { name: z.fields[0], txt: "\""+z.fields[1]+"\"" } }),
      cname: records.cname?.map(z => { return { name: z.fields[0], alias: z.fields[1] } }),
      aaaa: records.aaaa?.map(z => { return { name: z.fields[0], ip: z.fields[1] } }),
      a: records.a?.map(z => { return { name: z.fields[0], ip: z.fields[1] } }),
      mx: records.mx?.map(z => { return { preference: +z.fields[0], host: z.fields[1] } }),
      srv: records.srv?.map(z => { return { name: z.fields[0], target: z.fields[1], priority: +z.fields[2], weight: +z.fields[3], port: +z.fields[4] } }),
      caa: records.caa?.map(z => { return { name: z.fields[0], flags: +z.fields[1], tag: z.fields[2], value: z.fields[3] } }),
      ptr: records.ptr?.map(z => { return { name: z.fields[0], host: z.fields[1]} }),
      spf: records.spf?.map(z => { return { name: z.fields[0], data: z.fields[1]} }),
      ds: [
        await this.getDSRecord(domain)
      ]
    });
  }
  
  private async getDSRecord(domain: Domain) {
    const dnssec = this.listCerts();

    if(!dnssec[domain.zone]) return {};

    const process = Deno.run({
      cmd: ["dnssec-dsfromkey", dnssec[domain.zone]],
      cwd: Deno.cwd()+"/coredns/dnssec",
      stderr: "null",
      stdin: "null",
      stdout: "piped"
    })

    const y = new TextDecoder().decode(await process.output()).split(" ");

    return {name: "@",ttl:domain.ttl,key_tag:y[3],algorithm:y[4],digest_type:y[5],digest:y[6]};
  }

  private async createFolders() {
    if(!await exists("coredns/")) {
      console.log("[DNS] Most likely first boot!")
      Deno.mkdirSync("coredns");
    }
    
    await this.downloadCoredns();
    
    if(!await exists("coredns/zones/")) {
      console.log("[DNS] Creating zones folder")
      Deno.mkdirSync("coredns/zones")
    }
    
    if(!await exists("coredns/dnssec/")) {
      console.log("[DNS] Creating dnssec folder")
      Deno.mkdirSync("coredns/dnssec")
    }
  }
}

const coredns = new Coredns();
await coredns.start()
export default coredns;