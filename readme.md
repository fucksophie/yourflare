# yourflare
## Version: 2


### Talking points:
1. Opensource DNS managment
2. Supports cookie-based sessions with HTTPonly
3. Written in Preact/Tailwind using Fresh
4. Extremely quick setup,  
4.1 Move `config/example.passwordHash.ts` to `config/passwordHash.ts`  
4.2 Move `config/example.settings.ts` to `config/settings.ts`  
4.3 Edit the renamed files  
4.4 Run `deno task start`.
5. Full integration with Coredns through src/coredns.ts
6. Automatic DNS Zonefile creation and managment
7. Full DNSSEC/DS record authenication

### How do I gain admin status?
1. Run the app for the first time
2. Create a user
3. Go to the /api/status endpoint
4. Grab your ID (save it, or don't close that tab)
5. Shut down the App
6. Run `sqlite3 yourflare.db` and run `UPDATE users SET admin = TRUE WHERE id = 'THEIDYOUCOPIED'`
7. Start it back up!

### Migrate from version 1
Version 2 added dots to all Host-typed DNS records. This means that for example, the CNAME record didn't have a dot at the end of it
which means it would, instead of serving helloworld.com, serve helloworld.com.yourflare.domain. Which.. is wrong. I've fixed this in version 2. 

This script implements this change:
```js
import { Domain } from "./src/database.ts";
import { DNSRecord } from "./src/domains.ts";

Domain.getAllDomains().forEach(y => {
  const domain = Domain.findId(y.id)!;

  const records = Object.entries(domain.records);
  const recordsnew: Record<string, DNSRecord[]> = {}
  
  console.log("analyzing domain: " + domain.zone);

  records.forEach(g => {
    console.log("analyzing record: " + g[0])
    recordsnew[g[0]] = g[1].map(z => {
      const rec = new DNSRecord(z.type).getFieldTypes();

      z.fields.forEach((m,i) => {
        if(Object.entries(rec)[i][0] == "Host") {
          console.log("detected! setting to " + m + ".")
          z.fields[i] = m+'.';
        }
      })

      return z;
    })
  })

  domain.records = recordsnew;
  domain.serial++;
  domain.commit();
})
```

### Requirements
Yourflare requires the `dnssec-keygen` and the `dnssec-dsfromkey` utilities. Install them via `sudo apt-get install bind9utils`

### Why?
My domain provider doesn't allow me to use more than 10 A records, and using a wildcard is kind of a pain since I don't know what I'm hosting.

Cloudflare is also a monolithic company that basically controls the whole internet, and since I don't want my own domains to be apart of it's systems, I wrote my own DNS mangment software.