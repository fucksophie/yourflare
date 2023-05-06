import { Handlers, PageProps } from "$fresh/server.ts";
import { App } from "../components/App.tsx";
import Dashboard from "../islands/Dashboard.tsx";
import { User } from "../src/database.ts";
import { checkLoginStatus } from "../src/lib.ts";

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

export default function dash({ data }: PageProps<User>) {
  return (
    <>
      <App user={data}>
        <Dashboard user={data}></Dashboard>
      </App>
    </>
  );
}
