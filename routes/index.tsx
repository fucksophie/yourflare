// *:･ﾟ✧(=✪ ᆺ ✪=)*:･ﾟ✧

import { Handlers,PageProps } from "$fresh/server.ts";
import { App } from "../components/App.tsx";
import { Buttons } from "../components/Buttons.tsx";
import { User } from "../src/database.ts";
import { checkLoginStatus } from "../src/lib.ts";

export const handler: Handlers<User|undefined> = {
  async GET(req, ctx) {
    const status = (await checkLoginStatus(req));

    return ctx.render(status[1]);
  },
};

export default function index({ data }: PageProps<User|undefined>) {
  return (
    <>
      <App user={data}>
        <h1 class="text-2xl">yourflare</h1>
        <h2 class="text-xl">opensource DNS managment</h2>
        <Buttons rotation="hort">
          <a href="/login">login</a>
          <a href="/register">register</a>
        </Buttons>
      </App>
    </>
  );
}
