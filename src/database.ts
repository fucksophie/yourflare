import { DB } from "sqlite";
import { Session } from "./sessions.ts";
import { DNSRecord } from "./domains.ts";

export const db = new DB("yourflare.db");

db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT,
    domains TEXT,
    password TEXT,
    sessions TEXT,
    admin BOOLEAN
  )
`);

db.execute(`
  CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    status TEXT,
    records TEXT,
    ttl INTEGER,
    serial INTEGER,
    zone TEXT
  )
`);

interface RawUser {
  [_: string]: string|boolean;

  id: string;
  username: string;
  email: string;
  domains: string;
  password: string;
  sessions: string;
  admin: boolean;
}

interface Email {
  status: "verified"|"unverified"
  email: string;
  verificationToken: string;
}

export class User {
  id: string;
  username: string;
  email: Email | Record<string | number | symbol, never> = {};
  domains: string[] = [];
  password: string;
  sessions: Session[] = [];
  admin: boolean;

  constructor(username: string, password = "") {
    this.username = username;
    this.password = password;
    this.admin = false;

    const rawDB = User.findRawUsername(username);
    if (rawDB.length == 0) {
      this.id = crypto.randomUUID();
    } else {
      const user = rawDB[0];

      this.domains = JSON.parse(user.domains);
      this.id = user.id;
      this.email = JSON.parse(user.email);
      this.password = user.password;
      this.sessions = JSON.parse(user.sessions);
      this.admin = user.admin;
    }
  }

  static getAllUsers(): RawUser[] {
    return (db.queryEntries("SELECT * from users") as unknown as RawUser[][]).flat();
  }
  delete() {
    db.query("DELETE FROM users WHERE id = ?", [this.id]);
  }
  updateSessions() {
    return db.query("UPDATE users SET sessions = ? WHERE id = ?", [
      JSON.stringify(this.sessions),
      this.id,
    ]);
  }

  static findRawId(id: string) {
    return db.queryEntries<RawUser>("select * from users where id = ?", [id]);
  }

  static findRawUsername(username: string) {
    return db.queryEntries<RawUser>("select * from users where username = ?", [
      username,
    ]);
  }

  static findWithSession(hashedSession: string) { // TODO: extremely inefficient
    const raw = db.queryEntries<RawUser>("select * from users");
    let user: [Session, User]|undefined;

    for(const z of raw) {
      const session = (JSON.parse(z.sessions) as Session[]).find(z => z.hashedID == hashedSession);

      if(session?.hashedID == hashedSession) {
        user = [session, new User(z.username)];
        break;
      }
    }

    return user;
  }
  
  static findWithEmail(email: string) { // TODO: extremely inefficient
    const raw = db.queryEntries<RawUser>("select * from users");
    let user: User|undefined;

    for(const z of raw) {
      if((JSON.parse(z.email) as Email).email == email) {
        user = new User(z.username);
        break;
      }
    }

    return user;
  }

    
  static findWithVerificationToken(token: string) { // TODO: extremely inefficient
    const raw = db.queryEntries<RawUser>("select * from users");
    let user: User|undefined;

    for(const z of raw) {
      if((JSON.parse(z.email) as Email).verificationToken == token) {
        user = new User(z.username);
        break;
      }
    }

    return user;
  }
  static findId(id: string): User | undefined {
    const raw = User.findRawId(id);
    if (raw.length == 0) {
      return;
    } else {
      return new User(raw[0].username);
    }
  }

  static findUsername(username: string): User | undefined {
    const raw = User.findRawUsername(username);
    if (raw.length == 0) {
      return;
    } else {
      return new User(raw[0].username);
    }
  }

  commit() {
    if (User.findRawId(this.id).length == 0) {
      db.query("INSERT INTO users VALUES(?, ?, ?, ?, ?, ?, ?);", [
        this.id,
        this.username,
        JSON.stringify(this.email),
        JSON.stringify(this.domains),
        this.password,
        JSON.stringify(this.sessions),
        this.admin
      ]);
    } else {
      db.query(
        "UPDATE users SET username = ?, email = ?, domains = ?, password = ?, sessions = ?, admin = ? WHERE id = ?",
        [
          this.username,
          JSON.stringify(this.email),
          JSON.stringify(this.domains),
          this.password,
          JSON.stringify(this.sessions),
          this.admin,
          this.id,
        ],
      );
    }
  }
}

type Status = "linking" | "linked";
interface RawDomain {
  [_: string]: string|number;
  id: string;
  zone: string;
  status: string;
  records: string;
  ttl: number;
  serial: number;
}
export class Domain {
  id: string;
  zone: string;
  status: Status;
  records: Record<string, DNSRecord[]> = {};
  ttl: number;
  serial: number;

  constructor(zone: string) {
    this.zone = zone;

    const rawDB = Domain.findRawZone(this.zone);

    if (rawDB.length == 0) {
      this.id = crypto.randomUUID();
      this.status = "linking";
      this.ttl = 3000;
      this.serial = 1;

      this.commit();
    } else {
      const domain = rawDB[0];
      this.status = domain.status as Status;
      this.serial = domain.serial;
      this.ttl = domain.ttl;
      this.records = JSON.parse(domain.records);
      this.id = domain.id;
    }
  }
  
  static getAllDomains(): RawDomain[] {
    return (db.queryEntries("SELECT * from domains") as unknown as RawDomain[][]).flat();
  }

  static findRawId(id: string) {
    return db.queryEntries<RawDomain>("select * from domains where id = ?", [id]);
  }
  static findRawZone(zone: string) {
    return db.queryEntries<RawDomain>("select * from domains where zone = ?", [zone]);
  }

  static findId(id: string): Domain | undefined {
    const raw = Domain.findRawId(id);
    if (raw.length == 0) {
      return;
    } else {
      return new Domain(raw[0].zone);
    }
  }

  static findZone(zone: string): Domain | undefined {
    const raw = Domain.findRawZone(zone);
    if (raw.length == 0) {
      return;
    } else {
      return new Domain(raw[0].zone);
    }
  }
  
  static getAllIds(): string[] {
    return (db.query("SELECT id from domains") as unknown as string[][]).flat();
  }
  
  findAllUsers(): string[] {
    return User.getAllUsers().filter(z => {
      return JSON.parse(z.domains).includes(this.id)
    }).map(z => z.id);
  }

  delete() {
    db.query("DELETE FROM domains WHERE id = ?", [this.id]);
  }

  commit() {
    if (Domain.findRawId(this.id).length == 0) {
      db.query("INSERT INTO domains VALUES(?, ?, ?, ?, ?, ?);", [
        this.id,
        this.status,
        JSON.stringify(this.records),
        this.ttl,
        this.serial,
        this.zone
      ]);
    } else {
      db.query(
        "UPDATE domains SET status = ?, records = ?, ttl = ?, serial = ?, zone = ? WHERE id = ?",
        [
          this.status,
          JSON.stringify(this.records),
          this.ttl,
          this.serial,
          this.zone,
          this.id,
        ],
      );
    }
  }
}