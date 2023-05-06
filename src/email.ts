import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { settings } from "../config/settings.ts";

const client = new SMTPClient({
  connection: settings.email
});

export async function sendEmail(to: string, subject: string, content: string) {
  await client.send({
    from: settings.email.auth.username,
    to,
    subject,
    content: "auto",
    html: content,
  });
}
