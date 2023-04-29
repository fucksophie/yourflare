import { User } from "./database.ts";

export class Session {
  hashedID!: string;
  created!: number;
  duration!: number;
  createdBy!: string;
}
export default class SessionHandler {
  static async createSession(
    user: User,
  ): Promise<{ plain: string; hashed: string; ownedBy: string }> {
    const plain = crypto.randomUUID().replaceAll("-", "");
    const hashed = await SessionHandler.sessionHash(plain);

    return {
      plain,
      hashed,
      ownedBy: user.username,
    };
  }
  static async sessionHash(session: string): Promise<string> {
    return Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-512",
          new TextEncoder().encode(session),
        ),
      ),
    ).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  static checkExpiry(s: Session) {
    if (s.created - (Date.now() - s.duration) < 0) {
      return true;
    }

    return false;
  }
}
