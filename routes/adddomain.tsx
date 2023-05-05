import { App } from "../components/App.tsx";

import { checkLoginStatus } from "../src/lib.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { User } from "../src/database.ts";
import AddDomain from "../islands/AddDomain.tsx";

export const handler: Handlers<User> = {
  async GET(req, ctx) {
    const status = (await checkLoginStatus(req));
    if(status[1] == undefined) {
      const rp = new Response("Redirecting!", {status: 307});
      rp.headers.append("Location", "/");
      return rp;
    } else {
      return ctx.render(status[1]);
    }
  },
};

export default function adddomain({ data }: PageProps<User>) {
  return (
    <>
      <App user={data}>
        <AddDomain></AddDomain>
      </App>
    </>
  );
}

