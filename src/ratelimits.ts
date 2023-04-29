import { db } from "./database.ts"

export class Ratelimit {
  name: string;

  constructor(name: string) {
    this.name = name;
    db.execute(`
      CREATE TABLE IF NOT EXISTS ${this.name}_ratelimit (
        ip TEXT PRIMARY KEY,
        ms INTEGER
      );
    `);
  }

  isRatelimited(key: string) {
    if (this.getRatelimit(key) < Date.now()) {
      db.query(
        `DELETE FROM ${this.name}_ratelimit WHERE ip = ?`,
        [
          key,
        ],
      );
      return false;
    } else {
      return true;
    }
  }

  getRatelimit(key: string): number {
    const ratelimit = db.query<[string]>(
      `SELECT ms FROM ${this.name}_ratelimit WHERE ip = ?`,
      [
        key,
      ],
    );

    if (ratelimit.length >= 1) {
      return new Date(ratelimit[0][0]).getTime();
    } else {
      return 0;
    }
  }

  ratelimitFor(key: string, time = 60000 * 2) {
    db.query(
      `INSERT INTO ${this.name}_ratelimit VALUES (?, ?)`,
      [
        key,
        Date.now() + time,
      ],
    );
  }
}

const testingRt = new Ratelimit("helloworld")
testingRt;